import sys
import json
import numpy as np
import trimesh
import argparse
import os
import time
import place_on_face
import validate_mesh  # <--- Import your validation file

def to_vector3(numpy_array):
    return {
        "x": float(numpy_array[0]),
        "y": float(numpy_array[1]),
        "z": float(numpy_array[2])
    }

def analyze_mesh(file_path):
    start_time = time.time()
    try:
        # 1. LOAD
        mesh = trimesh.load(file_path, force='mesh')
        if isinstance(mesh, trimesh.Scene):
            mesh = mesh.dump(concatenate=True)

        # 2. FAST DECIMATION (Trimesh 4.x Compatible)
        original_face_count = len(mesh.faces)
        TARGET_FACES = 30000 
        
        if original_face_count > TARGET_FACES:
            step_start = time.time()
            try:
                # In 4.x, if the shortcut fails, we use the Voxel approach.
                # This is extremely fast and 'water-tight' friendly.
                # A pitch of 1.0mm is perfect for a 0.6mm nozzle check.
                mesh = mesh.simplification.simplify_vertex_clustering(bin_size=1.0)
                print(f"DEBUG: Voxel Decimation took {time.time() - step_start:.2f}s", file=sys.stderr)
            except Exception as e:
                # If that still fails, we check for the simplification module specifically
                print(f"DEBUG: Decimation failed ({str(e)}), proceeding with original mesh", file=sys.stderr)
                pass
        # --- VALIDATION STEP ---
        # Move Thickness check to run on even fewer samples
        dim_ok, dim_msg = validate_mesh.check_dimensions(mesh)
        if not dim_ok:
            # ... (keep error handling)
            return

        # Optimization: Pass a smaller sample count to thickness
        thick_ok, thick_msg, min_t = validate_mesh.check_thickness(mesh, sample_count=250)
        # ... (rest of validation)

        # --- ANALYSIS LOOP OPTIMIZATION ---
        # Cache these outside the loop
        face_areas = mesh.area_faces
        face_normals = mesh.face_normals
        face_centers = mesh.triangles_center
        
        # Use Bounding Box instead of Convex Hull for floor check (Much faster)
        bbox_vertices = mesh.bounding_box.vertices
        
        facets_idx = trimesh.graph.facets(mesh)
        scale = np.linalg.norm(mesh.extents)
        MIN_AREA = (scale * 0.04) ** 2 
        
        candidates = []
        for i, facet_indices in enumerate(facets_idx):
            total_area = face_areas[facet_indices].sum()
            if total_area < MIN_AREA: continue

            normal = face_normals[facet_indices[0]]
            centroid = np.average(face_centers[facet_indices], axis=0, weights=face_areas[facet_indices])

            # FAST FLOOR CHECK: Use bbox instead of hull
            to_down = trimesh.geometry.align_vectors(normal, [0, 0, -1])
            rotated_face_z = trimesh.transform_points([centroid], to_down)[0][2]
            rotated_bbox_verts = trimesh.transform_points(bbox_vertices, to_down)
            min_z_mesh = np.min(rotated_bbox_verts[:, 2])
            
            if min_z_mesh < (rotated_face_z - (scale * 0.01)):
                continue

            # ELLIPSE CALCULATION
            facet_v_indices = np.unique(mesh.faces[facet_indices])
            facet_verts = mesh.vertices[facet_v_indices]
            to_2d = trimesh.geometry.align_vectors(normal, [0, 0, 1])
            verts_2d = trimesh.transform_points(facet_verts, to_2d)[:, :2]

            if len(verts_2d) > 2:
                c_pts = verts_2d - np.mean(verts_2d, axis=0)
                _, _, V = np.linalg.svd(c_pts)
                major_dir = V[0]
                minor_dir = V[1]
                proj_major = np.dot(c_pts, major_dir)
                proj_minor = np.dot(c_pts, minor_dir)
                r_major = (np.max(proj_major) - np.min(proj_major)) / 2.0 * 0.9
                r_minor = (np.max(proj_minor) - np.min(proj_minor)) / 2.0 * 0.9
                major_axis_2d = major_dir
            else:
                r_major = r_minor = np.sqrt(total_area / np.pi) * 0.8
                major_axis_2d = np.array([1.0, 0.0])

            to_3d = np.linalg.inv(to_2d)
            axis_3d = np.dot(to_3d[:3, :3], [major_axis_2d[0], major_axis_2d[1], 0])

            candidates.append({
                "id": len(candidates),
                "normal": to_vector3(normal),
                "centroid": to_vector3(centroid),
                "area": float(total_area),
                "ellipseRadii": [float(r_major), float(r_minor)],
                "ellipseCenter": to_vector3(centroid),
                "ellipseAxis": to_vector3(axis_3d),
                "ellipseRotation": 0
            })

        # 6. FINAL SORTING
        candidates.sort(key=lambda x: x['area'], reverse=True)
        
        print(json.dumps({
            "message": "File pre-processed successfully.", 
            "faces": candidates[:12],
            "fileName": os.path.basename(file_path),
            "min_thickness": float(min_t) # Also include this for successful runs
        }))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command")
    
    p_pre = subparsers.add_parser("preprocess")
    p_pre.add_argument("file_path")
    
    p_rot = subparsers.add_parser("rotate")
    p_rot.add_argument("file_path")
    p_rot.add_argument("--normal", nargs=3, type=float)
    
    args = parser.parse_args()
    if args.command == "preprocess":
        analyze_mesh(args.file_path)
    elif args.command == "rotate":
        success, msg = place_on_face.rotate_and_overwrite(args.file_path, args.normal)
        if not success:
            sys.exit(1)