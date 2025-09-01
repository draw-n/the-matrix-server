from stl import mesh
import numpy as np

# Function to get the size of the STL file
def getSize(file_path):
    # Load the STL file
    your_mesh = mesh.Mesh.from_file(file_path)

    # Reshape to a list of points
    all_points = your_mesh.vectors.reshape(-1, 3)

    # Compute the bounding box
    min_coords = np.min(all_points, axis=0)
    max_coords = np.max(all_points, axis=0)

    # Calculate dimensions
    width = max_coords[0] - min_coords[0]
    height = max_coords[1] - min_coords[1]
    depth = max_coords[2] - min_coords[2]

    print(f"Width: {width}, Height: {height}, Depth: {depth}")
    return f"Width: {width}, Height: {height}, Depth: {depth}"