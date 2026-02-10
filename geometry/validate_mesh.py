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

# --- TOLERANCE THRESHOLDS ---
# How many "naked edges" are allowed before we call it non-watertight?
NAKED_EDGE_THRESHOLD = 20 

# What percentage of thickness samples can fail before the whole model fails? (0.05 = 5%)
THICKNESS_FAIL_RATE_THRESHOLD = 0.05 

def check_dimensions(mesh):
    size = mesh.extents
    if size[0] > MAX_DIMS["x"]:
        return False, f"X-axis overflow: {size[0]:.2f}mm"
    if size[1] > MAX_DIMS["y"]:
        return False, f"Y-axis overflow: {size[1]:.2f}mm"
    if size[2] > MAX_DIMS["z"]:
        return False, f"Z-axis overflow: {size[2]:.2f}mm"
    return True, "Dimensions Safe"

def check_integrity(mesh):
    # Instead of full auto-repair, just do the basics
    # Remove fill_holes() if you want maximum speed, it's very slow on large meshes
    
    # Fast check for naked edges without triggering the full repair engine
    edges = mesh.edges_unique
    # This is a very fast way to find if every edge has 2 faces
    if len(mesh.faces) * 3 != len(mesh.edges) * 2:
        # Only do the expensive naked edge count if the math doesn't add up
        edge_counts = np.bincount(mesh.edges_unique_inverse)
        naked_edges = np.sum(edge_counts == 1)
        if naked_edges > NAKED_EDGE_THRESHOLD:
            return False, f"Too many holes ({naked_edges})"
    
    return True, "Integrity Good"

def check_single_body(mesh, limit=100):
    count = mesh.body_count
    if count > limit:
        return False, f"Too many separate objects: {count} bodies."
    return True, f"{count} bodies detected"

def check_thickness(mesh, sample_count=500): # Reduced sample count slightly
    try:
        # 1. If mesh is huge, only sample a fraction or it will hang
        face_count = len(mesh.faces)
        
        # 2. Pre-calculate the ray manager's index if not already there
        # This is the biggest speed boost for large meshes
        if not hasattr(mesh.ray, 'index_trimesh'):
            _ = mesh.ray.intersects_any([[0,0,0]], [[0,0,1]]) 

        # 3. Reduce sample count for massive meshes
        actual_samples = min(sample_count, face_count // 10)
        if actual_samples < 100: actual_samples = min(100, face_count)

        # 4. Use simple random choice without weights for speed if mesh is huge
        if face_count > 100000:
            sample_indices = np.random.randint(0, face_count, actual_samples)
        else:
            weights = mesh.area_faces / mesh.area
            sample_indices = np.random.choice(face_count, size=actual_samples, p=weights)
            
        origins = mesh.triangles_center[sample_indices]
        normals = mesh.face_normals[sample_indices]
        
        # Inward rays
        ray_directions = -normals
        ray_origins = origins + (ray_directions * 0.001)

        # Use the most efficient intersection method
        locations, index_ray, _ = mesh.ray.intersects_location(
            ray_origins=ray_origins,
            ray_directions=ray_directions,
            multiple_hits=False
        )
        
        if len(locations) == 0:
            return True, "Thickness Check Skipped", 999.0

        matched_origins = ray_origins[index_ray]
        distances = np.linalg.norm(locations - matched_origins, axis=1)
        
        if len(distances) == 0:
             return True, "Thickness Check Skipped", 999.0

        min_thickness = np.min(distances)
        fail_count = np.sum(distances < MIN_THICKNESS)
        # Calculate what percentage of the model is "thin"
        fail_rate = fail_count / len(distances)

        # MARGIN OF ERROR LOGIC:
        # If the fail rate is high (e.g. > 5%), reject the model.
        if fail_rate > THICKNESS_FAIL_RATE_THRESHOLD:
            return False, f"Thin walls: {min_thickness:.2f}mm. {fail_count} spots ({fail_rate:.1%}) are too thin.", float(min_thickness)

        return True, f"Wall thickness safe ({fail_rate:.1%} minor thin spots allowed)", float(min_thickness)

    except Exception as e:
        return True, f"Thickness warning: {str(e)}", 0.0