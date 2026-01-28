const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

// Helper: wrapper to call the Python script
const detectMajorFacesPython = (filePath) => {
    return new Promise((resolve, reject) => {
        // Point this to your actual python script location
        const scriptPath = path.join(__dirname, "../geometry/mesh_analyze.py"); 
        const pythonProcess = spawn("python3", [scriptPath, filePath]);

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
                return reject(new Error(`Python script failed: ${errorString}`));
            }
            try {
                const json = JSON.parse(dataString);
                if (json.error) return reject(new Error(json.error));
                resolve(json);
            } catch (e) {
                reject(new Error("Failed to parse Python output"));
            }
        });
    });
};


// Simple helper if not already imported
function checkFileExtensions(filename, allowed) {
    const ext = path.extname(filename).toLowerCase();
    return allowed.includes(ext);
}

module.exports = {  detectMajorFacesPython };