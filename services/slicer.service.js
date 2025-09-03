const { spawn } = require("child_process");
const { moveFile } = require("../utils/file.utils.js");
const sliceMeshToGcode = (fileName, options) => {
    const filePath = `${process.env.MESH_INPUT_DIR || "meshes"}/${fileName}`;
    console.log("Slicing file:", fileName, "with options:", options);
    const slicer = spawn("./slicer-cli/superslicer/bin/superslicer", [
        "-g",
        filePath,
    ]);

    slicer.stdout.on("data", (data) => console.log(data.toString()));
    slicer.stderr.on("data", (err) => console.error(err.toString()));

    gcodeFileName = fileName.replace(/\.[^/.]+$/, ".gcode");
    // move gcode file to gcode folder
    moveFile(
        filePath.replace(/\.[^/.]+$/, ".gcode"),
        `${process.env.GCODE_OUTPUT_DIR || "gcodes"}/${gcodeFileName}`
    );

    return gcodeFileName; // should be returning file name
};

module.exports = { sliceMeshToGcode };
