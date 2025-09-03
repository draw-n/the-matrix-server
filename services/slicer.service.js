const { exec } = require("child_process");
const path = require("path");
const sliceMeshToGcode = (fileName, options) => {
    console.log("Slicing file:", fileName, "with options:", options);
    return new Promise((resolve, reject) => {
        const filePath =
            (process.env.MESH_INPUT_DIR || "meshes") + "/" + fileName;
        const gcodeFileName = fileName.replace(/\.[^/.]+$/, ".gcode");
        const finalGcodePath = path.resolve(
            process.env.GCODE_OUTPUT_DIR || "gcodes",
            gcodeFileName
        );
    
        exec(
            `./slicer-cli/superslicer/bin/superslicer --output "${finalGcodePath}" -g "${filePath}"`,
            (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    reject(error);
                    return;
                }
                console.log(`stdout: ${stdout}`);
                console.error(`stderr: ${stderr}`);
                resolve(finalGcodePath); 
            }
        );
    });
};

module.exports = { sliceMeshToGcode };
