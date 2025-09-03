const { exec } = require("child_process");
const { moveFile } = require("../utils/file.utils.js");
const path = require("path");
const sliceMeshToGcode = (fileName, options) => {
    console.log("Slicing file:", fileName, "with options:", options);
    return new Promise((resolve, reject) => {
        const filePath =
            (process.env.MESH_INPUT_DIR || "meshes") + "/" + fileName;
        const gcodeFileName = fileName.replace(/\.[^/.]+$/, ".gcode");
        const outputPath = path.resolve(
            process.env.MESH_INPUT_DIR || "meshes",
            gcodeFileName
        );
        const finalGcodePath = path.resolve(
            process.env.GCODE_OUTPUT_DIR || "gcodes",
            gcodeFileName
        );
        X;
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

                console.log("gcode:" + gcodeFileName);
                // move gcode file to gcode folder
                moveFile(outputPath, finalGcodePath);
                resolve(gcodeFileName); // should be returning file name
            }
        );
    });
};

module.exports = { sliceMeshToGcode };
