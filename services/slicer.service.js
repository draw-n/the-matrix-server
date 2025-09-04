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
        const materialFile = "./slicer-cli/configurations/pla_config.ini";
        exec(
            `./slicer-cli/superslicer --output "${finalGcodePath}" -g "${filePath}" --load "${materialFile}"`,
            (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    reject(error);
                    return;
                }
                console.log(`stdout: ${stdout}`);
                console.error(`stderr: ${stderr}`);
                resolve([gcodeFileName, finalGcodePath]);
            }
        );
    });
};

const processSlicingOptions = (options) => {
    const referenceOptions = {
        infill: "--fill-density",
        layerHeight: "--layer-height",
        supports: "",
        temperatures: {
            extruder: {
                firstLayer: "--first-layer-temperature",
                otherLayers: "--temperature",
            },
            bed: {
                firstLayer: "--first-layer-bed-temperature",
                otherLayers: "-bed-temperature",
            },
        },
        horizontalShell: {
            topLayers: "--top-solid-layers",
            bottomLayers: "--bottom-solid-layers",
        },
        verticalShell: {
            perimeters: "--perimeters",
        },
    };

    let optionsString = "";
    for (const [key, value] of Object.entries(options)) {
    }
};

module.exports = { sliceMeshToGcode };
