const { exec } = require("child_process");
const { moveFile } = require("../utils/file.utils.js");
const sliceMeshToGcode = (filePath, fileName, options) => {
    console.log("Slicing file:", filePath, "with options:", options);
    exec(`pwd`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });
    exec(
        `./slicer-cli/superslicer/bin/superslicer -g ${filePath}`,
        (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
        }
    );

    gcodeFileName = fileName.replace(/\.[^/.]+$/, ".gcode");
    // move gcode file to gcode folder
    moveFile(
        filePath.replace(/\.[^/.]+$/, ".gcode"),
        `${process.env.GCODE_OUTPUT_DIR || "gcodes"}/${gcodeFileName}`
    );

    return gcodeFileName; // should be returning file name
};

module.exports = { sliceMeshToGcode };
