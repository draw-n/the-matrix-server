import sys
import json
import numpy as np
import trimesh
from shapely.geometry import MultiPoint, Point, Polygon
import os
import tempfile

# --- LOGGING SETUP ---
temp_dir = tempfile.gettempdir()
LOG_FILE = os.path.join(temp_dir, "geometry_analyze.log")

try:
    if os.path.exists(LOG_FILE):
        os.remove(LOG_FILE)
except:
    pass

def log(msg):
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(str(msg) + "\n")
    except:
        pass

def to_vector3(numpy_array):
    return {
        "x": float(numpy_array[0]),
        "y": float(numpy_array[1]),
        "z": float(numpy_array[2])
    }

def analyze_mesh(file_path):
    try:
        log(f"--- STARTING ANALYSIS: {file_path} ---")
        
        # 1. LOAD
        # Trimesh handles .3mf automatically
        mesh = trimesh.load(file_path, force=None) # force=None allows auto-detection

        # 3MF files often load as a 'Scene'. We need to grab the geometry from it.
        if isinstance(mesh, trimesh.Scene):
            log("Loaded as Scene. Dumping geometry...")
            # If the scene has multiple parts, this merges them into one mesh
            # which is what we want for calculating the overall bottom face.
            mesh = mesh.dump(concatenate=True)
        # Get bounding box [min, max]
        bounds = mesh.bounds 
        min_coords = bounds[0]
        max_coords = bounds[1]
        
        # Calculate Bounding Box Center (matches THREE.Box3.getCenter)
        center_x = (min_coords[0] + max_coords[0]) / 2.0
        center_y = (min_coords[1] + max_coords[1]) / 2.0
        min_z = min_coords[2]

        # Apply the exact same translation: -centerX, -centerY, -minZ
        translation = [-center_x, -center_y, -min_z]
        mesh.apply_translation(translation)
        # --------------------------------

        original_face_count = len(mesh.faces)
        log(f"Original Faces: {original_face_count}")
        

        # 2. AGGRESSIVE DECIMATION (The Speed Fix)
        # If > 50k faces, we use Vertex Clustering (Fastest algorithm available)
        TARGET_FACES = 50000 
        
        if original_face_count > TARGET_FACES:
            log("High-poly detected. Running Vertex Clustering...")
            try:
                # Calculate grid size to aim for ~20k-50k faces
                # Voxel size = Bounds / Resolution
                bbox_size = np.linalg.norm(mesh.extents)
                # Resolution of 64-100 usually gives 10k-50k faces
                voxel_size = bbox_size / 64.0 
                
                # This is O(N) - extremely fast
                mesh = mesh.simplify_vertex_clustering(voxel_size=voxel_size)
                
                # Cleanup after clustering
                mesh.remove_degenerate_faces()
                mesh.remove_duplicate_faces()
                
                log(f"Decimated to: {len(mesh.faces)} faces")
            except Exception as e:
                log(f"Decimation failed: {e}")

        # 3. Standard Cleanup (Now fast because mesh is small)
        mesh.process(validate=True)
        trimesh.repair.fix_normals(mesh)

        # 4. Scale & Tolerances
        extents = mesh.extents
        scale_factor = np.linalg.norm(extents)
        HULL_DIST_TOLERANCE = scale_factor * 0.015 # Increased slightly for simplified meshes
        MIN_AREA = (scale_factor * 0.02) ** 2  
        
        # 5. Physics Data
        center_of_mass = mesh.center_mass
        hull = mesh.convex_hull
        hull_origins = hull.triangles[:, 0, :]
        hull_normals = hull.face_normals
        hull_vertices = hull.vertices

        # 6. Facet Detection
        # use networkx engine if available, it's more robust
        facets = trimesh.graph.facets(mesh)
        log(f"Found {len(facets)} potential facets.")

        candidates = []

        for i, facet_indices in enumerate(facets):
            facet_normal = mesh.face_normals[facet_indices[0]]
            
            # Fast submesh extraction
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
                # Relaxed buffer for low-poly meshes
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

                # Reconstruct 3D
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
    if len(sys.argv) < 2: sys.exit(1)
    analyze_mesh(sys.argv[1])