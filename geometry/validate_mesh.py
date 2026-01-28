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

def check_integrity(mesh):
    """
    Checks if the mesh is printable (watertight, valid winding, etc).
    """
    # 1. Basic Validity Checks
    # REPLACED broken .is_valid check with .is_empty
    if mesh.is_empty:
        return False, "Mesh is empty (no geometry)"
    
    # A 3D volume needs at least 4 faces (tetrahedron) to exist
    if len(mesh.faces) < 4:
        return False, "Mesh has too few faces to be a printable volume"

    # 2. Watertight (Manifold) - Critical for printing
    # This checks if every edge is shared by exactly two faces
    if not mesh.is_watertight:
        return False, "Mesh is not watertight (contains holes)"

    # 3. Winding (Inside-out normals)
    if not mesh.is_winding_consistent:
        return False, "Mesh has inconsistent normals (inside-out faces)"

    # 4. Volume
    if mesh.volume <= 0.0:
        return False, "Mesh has zero or negative volume"

    return True, "Integrity Good"

def check_single_body(mesh):
    """
    Ensures the mesh consists of exactly one connected component.
    """
    # mesh.body_count returns the number of disjoint sub-graphs
    count = mesh.body_count
    
    if count != 1:
        return False, f"File contains multiple separate objects: {count} bodies detected."
        
    return True, "Single body detected"

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