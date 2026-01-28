import numpy as np
import trimesh
import os

def rotate_and_overwrite(file_path, target_normal):
    """
    Rotates the mesh so the target_normal points down (-Z),
    centers the object on the XY plane, and sits it on Z=0.
    Overwrites the original file.
    
    Args:
        file_path (str): Absolute path to the mesh file.
        target_normal (dict or list): Vector {x,y,z} or [x,y,z] of the face normal.
    
    Returns:
        (bool, str): Success status and message.
    """
    try:
        # 1. Parse Input
        if isinstance(target_normal, dict):
            normal_vec = np.array([target_normal['x'], target_normal['y'], target_normal['z']])
        else:
            normal_vec = np.array(target_normal)

        # Normalize input vector
        normal_vec = normal_vec / np.linalg.norm(normal_vec)

        # 2. Load Mesh
        # Trimesh handles .stl and .3mf
        mesh = trimesh.load(file_path, force=None)

        # Handle Scene objects (common in .3mf) by merging them
        if isinstance(mesh, trimesh.Scene):
            if len(mesh.geometry) == 0:
                return False, "Mesh is empty"
            mesh = mesh.dump(concatenate=True)

        # 3. Calculate Rotation
        # We want the face normal to point DOWN (0, 0, -1) to sit on the bed
        down_vec = np.array([0.0, 0.0, -1.0])
        
        # trimesh.geometry.align_vectors gives us the 4x4 rotation matrix
        # to rotate vector A to vector B
        rotation_matrix = trimesh.geometry.align_vectors(normal_vec, down_vec)
        
        # 4. Apply Rotation
        mesh.apply_transform(rotation_matrix)

        # 5. Re-Center and Place on Floor (Z=0)
        # Get the new bounding box after rotation
        min_coords = mesh.bounds[0] # [min_x, min_y, min_z]
        max_coords = mesh.bounds[1] # [max_x, max_y, max_z]
        
        # Calculate current center
        center_x = (min_coords[0] + max_coords[0]) / 2.0
        center_y = (min_coords[1] + max_coords[1]) / 2.0
        min_z = min_coords[2]
        
        # Translation: Move CenterXY to 0,0 and MinZ to 0
        translation = [-center_x, -center_y, -min_z]
        mesh.apply_translation(translation)

        # 6. Overwrite Original File
        # Trimesh infers the format from the file extension
        mesh.export(file_path)

        return True, "Mesh rotated and saved successfully"

    except Exception as e:
        return False, f"Rotation failed: {str(e)}"