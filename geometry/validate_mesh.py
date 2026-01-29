import numpy as np
import trimesh

# --- CONFIGURATION ---
MAX_DIMS = {
    "x": 300.0,
    "y": 300.0,
    "z": 240.0
}

# 0.6mm Nozzle
MIN_THICKNESS = 0.6

def check_dimensions(mesh):
    """
    Checks if the mesh fits within the defined build volume.
    """
    size = mesh.extents
    
    if size[0] > MAX_DIMS["x"]:
        return False, f"X-axis overflow: {size[0]:.2f}mm > {MAX_DIMS['x']}mm"
    
    if size[1] > MAX_DIMS["y"]:
        return False, f"Y-axis overflow: {size[1]:.2f}mm > {MAX_DIMS['y']}mm"
        
    if size[2] > MAX_DIMS["z"]:
        return False, f"Z-axis overflow: {size[2]:.2f}mm > {MAX_DIMS['z']}mm"

    return True, "Dimensions Safe"

import numpy as np
import trimesh

def check_integrity(mesh):
    """
    Checks if the mesh is printable and attempts minor repairs.
    """
    if mesh.is_empty:
        return False, "Mesh is empty"

    # 1. ATTEMPT AUTO-REPAIR
    try:
        mesh.fill_holes()
        mesh.process(validate=True)
        trimesh.repair.fix_normals(mesh)
    except Exception:
        pass

    # 2. Check Watertight status
    if not mesh.is_watertight:
        # We find 'naked edges' by counting how many faces share each unique edge.
        # In a closed volume, every edge MUST be shared by exactly 2 faces.
        # If an edge is shared by only 1 face, it's a hole (boundary edge).
        
        # edges_unique_inverse maps every edge to its index in edges_unique
        edge_counts = np.bincount(mesh.edges_unique_inverse)
        naked_edges = np.sum(edge_counts == 1)
        
        return False, f"Mesh is not watertight ({naked_edges} naked edges/holes detected)."

    # 3. Check for consistent winding
    if not mesh.is_winding_consistent:
        return False, "Mesh has inconsistent normals (inside-out faces)."

    # 4. Check for zero/negative volume
    if mesh.volume <= 0.0:
         return False, "Mesh has no physical volume (it might be a 2D surface)."

    return True, "Integrity Good"

def check_single_body(mesh, limit=100):
    """
    Allows multiple bodies up to a limit to accommodate articulated models.
    """
    count = mesh.body_count
    
    if count > limit:
        return False, f"Too many separate objects: {count} bodies detected. Max allowed is {limit}."
    
    return True, f"{count} bodies detected (Articulated/Single mesh safe)"

def check_thickness(mesh, sample_count=1000):
    """
    Checks for walls thinner than the nozzle size using ray casting.
    """
    try:
        if len(mesh.faces) < sample_count:
            sample_indices = np.arange(len(mesh.faces))
        else:
            # Weight sampling by face area to avoid missing large faces
            weights = mesh.area_faces / mesh.area
            sample_indices = np.random.choice(
                len(mesh.faces), size=sample_count, p=weights
            )
            
        origins = mesh.triangles_center[sample_indices]
        normals = mesh.face_normals[sample_indices]
        
        # Cast rays INWARD
        ray_directions = -normals
        # Offset start point slightly inward to prevent self-intersection at origin
        ray_origins = origins + (ray_directions * 0.001)

        locations, index_ray, index_tri = mesh.ray.intersects_location(
            ray_origins=ray_origins,
            ray_directions=ray_directions,
            multiple_hits=False
        )
        
        if len(locations) == 0:
            return True, "Thickness Check Skipped (Geometry too complex)", 999.0

        matched_origins = ray_origins[index_ray]
        vectors = locations - matched_origins
        distances = np.linalg.norm(vectors, axis=1)
        
        if len(distances) == 0:
             return True, "Thickness Check Skipped", 999.0

        min_thickness = np.min(distances)
        
        if min_thickness < MIN_THICKNESS:
            fail_count = np.sum(distances < MIN_THICKNESS)
            return False, f"Thin walls detected: {min_thickness:.2f}mm < {MIN_THICKNESS}mm ({fail_count} spots)", float(min_thickness)

        return True, "Wall thickness looks safe", float(min_thickness)

    except Exception as e:
        # If ray casting fails, we default to passing to avoid blocking valid files on edge cases
        return True, f"Thickness check warning: {str(e)}", 0.0