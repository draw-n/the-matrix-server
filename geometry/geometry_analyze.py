import sys
import json
import numpy as np
import trimesh
from shapely.geometry import MultiPoint, Point
import argparse

# --- MODULE IMPORTS ---
import validate_mesh as mesh_validator 
import place_on_face 

def to_vector3(numpy_array):
    return {
        "x": float(numpy_array[0]),
        "y": float(numpy_array[1]),
        "z": float(numpy_array[2])
    }

def analyze_mesh(file_path):
    """
    Main logic for the 'preprocess' command.
    Analyzes the mesh for printability and detects flat faces.
    """
    try:
        # 1. LOAD
        mesh = trimesh.load(file_path, force=None)

        if isinstance(mesh, trimesh.Scene):
            if len(mesh.geometry) == 0:
                raise Exception("Scene is empty")
            mesh = mesh.dump(concatenate=True)

        # ==========================================
        # === VALIDATION STEPS ===
        # ==========================================

        # A. Check Dimensions
        valid_dims, msg_dims = mesh_validator.check_dimensions(mesh)
        if not valid_dims:
            print(json.dumps({
                "message": "Validation Failed", 
                "error_type": "DIMENSION_OVERFLOW",
                "details": msg_dims,
                "faces": []
            }))
            sys.exit(0)

        # B. Check Body Count
        valid_body, msg_body = mesh_validator.check_single_body(mesh)
        if not valid_body:
            print(json.dumps({
                "message": "Validation Failed", 
                "error_type": "MULTIPLE_BODIES_DETECTED",
                "details": msg_body,
                "faces": []
            }))
            sys.exit(0)

        # C. Check Integrity
        valid_integrity, msg_integrity = mesh_validator.check_integrity(mesh)
        if not valid_integrity:
            print(json.dumps({
                "message": "Validation Failed",
                "error_type": "MESH_INTEGRITY_BAD", 
                "details": msg_integrity,
                "faces": []
            }))
            sys.exit(0)

        # D. Check Thickness
        valid_thick, msg_thick, min_val = mesh_validator.check_thickness(mesh)
        if not valid_thick:
            print(json.dumps({
                "message": "Validation Failed",
                "error_type": "WALLS_TOO_THIN", 
                "details": msg_thick,
                "min_thickness": min_val,
                "faces": []
            }))
            sys.exit(0)
            

        # Get bounding box [min, max]
        bounds = mesh.bounds 
        min_coords = bounds[0]
        max_coords = bounds[1]
        
        # Calculate Bounding Box Center
        center_x = (min_coords[0] + max_coords[0]) / 2.0
        center_y = (min_coords[1] + max_coords[1]) / 2.0
        min_z = min_coords[2]

        # Apply translation
        translation = [-center_x, -center_y, -min_z]
        mesh.apply_translation(translation)
        
        original_face_count = len(mesh.faces)

        # 2. AGGRESSIVE DECIMATION
        TARGET_FACES = 50000 
        
        if original_face_count > TARGET_FACES:
            try:
                bbox_size = np.linalg.norm(mesh.extents)
                voxel_size = bbox_size / 64.0 
                
                mesh = mesh.simplify_vertex_clustering(voxel_size=voxel_size)
                
                mesh.remove_degenerate_faces()
                mesh.remove_duplicate_faces()
                
            except Exception as e:
                pass
        # 3. Standard Cleanup
        mesh.process(validate=True)
        trimesh.repair.fix_normals(mesh)

        # 4. Scale & Tolerances
        extents = mesh.extents
        scale_factor = np.linalg.norm(extents)
        HULL_DIST_TOLERANCE = scale_factor * 0.015 
        MIN_AREA = (scale_factor * 0.02) ** 2  
        
        # 5. Physics Data
        center_of_mass = mesh.center_mass
        hull = mesh.convex_hull
        hull_origins = hull.triangles[:, 0, :]
        hull_normals = hull.face_normals
        hull_vertices = hull.vertices

        # 6. Facet Detection
        facets = trimesh.graph.facets(mesh)

        candidates = []

        for i, facet_indices in enumerate(facets):
            facet_normal = mesh.face_normals[facet_indices[0]]
            
            submesh = mesh.submesh([facet_indices], only_watertight=False, append=True)
            area = submesh.area
            
            if area < MIN_AREA:
                continue

            centroid = submesh.centroid
            vertices = submesh.vertices

            # --- FILTER 1: CONVEX HULL CHECK ---
            vectors_to_centroid = centroid - hull_origins
            distances = np.sum(vectors_to_centroid * hull_normals, axis=1)
            min_dist_idx = np.argmin(np.abs(distances))
            min_dist = np.abs(distances[min_dist_idx])
            closest_hull_normal = hull_normals[min_dist_idx]

            if min_dist > HULL_DIST_TOLERANCE:
                 continue
            if np.dot(facet_normal, closest_hull_normal) < -0.1:
                continue

            # --- FILTER 2: STABILITY ---
            to_2d = trimesh.geometry.align_vectors(facet_normal, [0, 0, 1])
            transformed_verts = trimesh.transform_points(vertices, to_2d)
            vertices_2d = transformed_verts[:, :2]
            face_z_level = np.mean(transformed_verts[:, 2])

            com_transformed = trimesh.transform_points([center_of_mass], to_2d)[0]
            com_2d = com_transformed[:2]

            try:
                points_mp = MultiPoint(vertices_2d)
                footprint_geom = points_mp.convex_hull
                buffer_size = scale_factor * 0.02 
                if not footprint_geom.buffer(buffer_size).contains(Point(com_2d)):
                    continue

                # --- FILTER 3: FLOOR PENETRATION ---
                to_down = trimesh.geometry.align_vectors(facet_normal, [0,0,-1])
                rotated_hull = trimesh.transform_points(hull_vertices, to_down)
                rotated_face_center = trimesh.transform_points([centroid], to_down)[0]
                floor_z = rotated_face_center[2]
                min_z_object = np.min(rotated_hull[:, 2])
                
                if min_z_object < (floor_z - (scale_factor * 0.01)):
                    continue

                # --- GEOMETRY CALCULATION (OBB) ---
                obb = points_mp.minimum_rotated_rectangle
                obb_center_2d = np.array(obb.centroid.coords)[0]
                obb_coords = np.array(obb.exterior.coords)
                
                edge_0 = np.linalg.norm(obb_coords[1] - obb_coords[0])
                edge_1 = np.linalg.norm(obb_coords[2] - obb_coords[1])
                
                if edge_0 > edge_1:
                    r_major, r_minor = edge_0/2.0, edge_1/2.0
                    axis_2d = (obb_coords[1] - obb_coords[0]) / edge_0
                else:
                    r_major, r_minor = edge_1/2.0, edge_0/2.0
                    axis_2d = (obb_coords[2] - obb_coords[1]) / edge_1

                to_3d = np.linalg.inv(to_2d)
                center_4 = [obb_center_2d[0], obb_center_2d[1], face_z_level, 1]
                ellipse_center = np.dot(to_3d, center_4)[:3]
                
                axis_4 = [axis_2d[0], axis_2d[1], 0, 0]
                ellipse_axis = np.dot(to_3d, axis_4)[:3]
                ellipse_axis = ellipse_axis / (np.linalg.norm(ellipse_axis) + 1e-9)

            except Exception:
                continue

            # --- ACCEPTED ---
            min_z_idx = np.argmin(vertices[:, 2])
            bottom_vertex_offset = vertices[min_z_idx] + (facet_normal * 0.5)

            candidates.append({
                "normal": to_vector3(facet_normal),
                "centroid": to_vector3(centroid),
                "ellipseCenter": to_vector3(ellipse_center),
                "ellipseAxis": to_vector3(ellipse_axis),
                "bottomVertex": to_vector3(bottom_vertex_offset),
                "overlapArea": float(area),
                "ellipseRadii": [float(r_major), float(r_minor)],
                "ellipseRotation": 0 
            })

        candidates.sort(key=lambda x: x['overlapArea'], reverse=True)
        print(json.dumps({"message": "Success", "faces": candidates}))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mesh Analysis Tool")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # 1. PREPROCESS COMMAND
    # Usage: python geometry_analyze.py preprocess <filepath>
    parser_preprocess = subparsers.add_parser("preprocess", help="Analyze mesh and detect faces")
    parser_preprocess.add_argument("file_path", help="Path to the mesh file")

    # 2. ROTATE COMMAND
    # Usage: python geometry_analyze.py rotate <filepath> --normal 0 0 1
    parser_rotate = subparsers.add_parser("rotate", help="Rotate mesh to align face with floor")
    parser_rotate.add_argument("file_path", help="Path to the mesh file")
    parser_rotate.add_argument("--normal", nargs=3, type=float, required=True, help="Target normal vector (x y z)")
    # Optional: We could also accept --centroid if needed for complex rotations, but normal is usually enough for alignment
    
    args = parser.parse_args()

    if args.command == "preprocess":
        analyze_mesh(args.file_path)

    elif args.command == "rotate":
        success, msg = place_on_face.rotate_and_overwrite(args.file_path, args.normal)
        if success:
            print(json.dumps({"message": "Success", "details": msg}))
        else:
            print(json.dumps({"error": msg}))
            sys.exit(1)