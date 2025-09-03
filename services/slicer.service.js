const { exec } = require("child_process");
const { moveFile } = require("../utils/file.utils.js");
const sliceMeshToGcode = (fileName, options) => {
    const filePath = `${process.env.MESH_INPUT_DIR || "meshes"}/${fileName}`;
    const gcodeFileName = fileName.replace(/\.[^/.]+$/, ".gcode");

    console.log("Slicing file:", fileName, "with options:", options);
    return new Promise((resolve, reject) => {
        exec(
            `./slicer-cli/superslicer/bin/superslicer -o ${gcodeFileName} -g "${filePath}"`,
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
                moveFile(
                    filePath.replace(/\.[^/.]+$/, ".gcode"),
                    `${
                        process.env.GCODE_OUTPUT_DIR || "gcodes"
                    }/${gcodeFileName}`
                );
                resolve(gcodeFileName); // should be returning file name
            }
        );
    });
};

module.exports = { sliceMeshToGcode };
