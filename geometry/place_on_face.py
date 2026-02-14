import numpy as np
import trimesh
import os
import json
import sys
import warnings

warnings.filterwarnings("ignore")

def rotate_and_overwrite(file_path, target_normal):
    """
    Rotates the mesh so the target_normal points down (-Z),
    centers the object on the XY plane, and sits it on Z=0.
    Overwrites the original file.
    """
    try:
        # 1. Parse Input
        if isinstance(target_normal, dict):
            normal_vec = np.array([target_normal['x'], target_normal['y'], target_normal['z']])
        else:
            # Ensure it's a flat numpy array even if passed as a list of lists
            normal_vec = np.array(target_normal).flatten()

        # Normalize input vector
        norm = np.linalg.norm(normal_vec)
        if norm < 1e-9:
            return False, "Invalid normal vector (length zero)"
        normal_vec = normal_vec / norm

        # 2. Load Mesh
        if not os.path.exists(file_path):
            return False, f"File not found: {file_path}"
            
        mesh = trimesh.load(file_path)

        # Handle Scene objects (common in .3mf) by merging them
        if isinstance(mesh, trimesh.Scene):
            if len(mesh.geometry) == 0:
                return False, "Mesh is empty"
            mesh = mesh.dump(concatenate=True)

        # 3. Calculate Rotation
        # We want the face normal to point DOWN (0, 0, -1)
        down_vec = np.array([0.0, 0.0, -1.0])
        
        # align_vectors calculates the matrix to move normal_vec TO down_vec
        rotation_matrix = trimesh.geometry.align_vectors(normal_vec, down_vec)
        
        # 4. Apply Rotation
        mesh.apply_transform(rotation_matrix)

        # 5. Re-Center and Place on Floor (Z=0)
        bounds = mesh.bounds
        center_x = (bounds[0][0] + bounds[1][0]) / 2.0
        center_y = (bounds[0][1] + bounds[1][1]) / 2.0
        min_z = bounds[0][2]
        
        # Translation: Move CenterXY to 0,0 and MinZ to 0
        translation = [-center_x, -center_y, -min_z]
        mesh.apply_translation(translation)

        # 6. Overwrite Original File
        mesh.export(file_path)

        # CRITICAL: Print JSON to stdout for Node.js
        print(json.dumps({"message": "Success", "details": "Mesh rotated and saved successfully"}))
        return True, "Success"

    except Exception as e:
        # Send error to stderr so Node.js can catch it in the error handler
        error_msg = f"Rotation failed: {str(e)}"
        print(json.dumps({"error": error_msg}), file=sys.stderr)
        return False, error_msg

# This allows the script to be run directly if needed, 
# though your main script calls the function.
if __name__ == "__main__":
    # If called as a standalone script for testing
    if len(sys.argv) > 4:
        path = sys.argv[1]
        norm = [float(x) for x in sys.argv[2:5]]
        rotate_and_overwrite(path, norm)