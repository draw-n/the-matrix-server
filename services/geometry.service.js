const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

// Path to the main python entry point
// Make sure this matches the filename you saved earlier (geometry_analyze.py)
const PYTHON_SCRIPT_PATH = path.join(__dirname, "../geometry/geometry_analyze.py");

/**
 * Calls python script to analyze mesh and detect faces
 * Command: python3 geometry_analyze.py preprocess <filePath>
 */
const detectMajorFacesPython = (filePath) => {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn("python3", [PYTHON_SCRIPT_PATH, "preprocess", filePath]);

        let dataString = "";
        let errorString = "";

        pythonProcess.stdout.on("data", (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            errorString += data.toString();
        });

        pythonProcess.on("close", (code) => {
            // Check for JSON in stdout first, even if code != 0 (sometimes python prints error to stdout)
            try {
                // If we have data, try to parse it
                if (dataString.trim()) {
                    const json = JSON.parse(dataString);
                    
                    // If the Python script returned an explicit error object
                    if (json.error) return reject(new Error(json.error));
                    
                    // If it returned validation failure (error_type), we resolve it 
                    // so the controller can handle the 400 error gracefully
                    if (json.error_type) return resolve(json);

                    return resolve(json);
                }
            } catch (e) {
                // Ignore parse error here, fall through to checking exit code
            }

            if (code !== 0) {
                return reject(new Error(`Python script failed: ${errorString || dataString}`));
            }

            reject(new Error("Python script finished but returned no valid JSON output"));
        });
    });
};

/**
 * Calls python script to rotate the mesh and overwrite the file
 * Command: python3 geometry_analyze.py rotate <filePath> --normal x y z
 */
const rotateMeshPython = (filePath, normal, centroid) => {
    return new Promise((resolve, reject) => {
        
        // Handle input format ({x,y,z} or [x,y,z])
        let nx, ny, nz;
        if (Array.isArray(normal)) {
            [nx, ny, nz] = normal;
        } else {
            nx = normal.x;
            ny = normal.y;
            nz = normal.z;
        }

        const args = [
            PYTHON_SCRIPT_PATH, 
            "rotate", 
            filePath, 
            "--normal", 
            String(nx), 
            String(ny), 
            String(nz)
        ];

        const pythonProcess = spawn("python3", args);

        let dataString = "";
        let errorString = "";

        pythonProcess.stdout.on("data", (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            errorString += data.toString();
        });

        pythonProcess.on("close", (code) => {
            if (code !== 0) {
                return reject(new Error(`Rotation script failed: ${errorString || dataString}`));
            }
            try {
                const json = JSON.parse(dataString);
                if (json.error) return reject(new Error(json.error));
                resolve(json);
            } catch (e) {
                reject(new Error("Failed to parse Python output from rotation command"));
            }
        });
    });
};

module.exports = { 
    detectMajorFacesPython, 
    rotateMeshPython 
};