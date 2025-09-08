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

                resolve([gcodeFileName, finalGcodePath]);
            }
        );
    });
};

/**
 * process slicing options into command line arguments
 * @param {*} options - slicing options
 * @returns - command line arguments
 */

const processSlicingOptions = (options) => {
    console.log("Processing slicing options:", options);
    const referenceOptions = {
        infill: "--fill-density", // asks for decimals 0-1
        layerHeight: "--layer-height", // asks for layer height in mm
        supports: "--support-material", // puts support material if this exists
        temperatures: {
            extruder: {
                firstLayer: "--first-layer-temperature", // in C
                otherLayers: "--temperature", // in C
            },
            bed: {
                firstLayer: "--first-layer-bed-temperature", // in C
                otherLayers: "-bed-temperature", // in C
            },
        },
        horizontalShell: {
            topLayers: "--top-solid-layers", // 0 and above
            bottomLayers: "--bottom-solid-layers", // 0 and above
        },
        verticalShell: {
            perimeters: "--perimeters", // 0 and above
        },
    };

    let optionsString = "";
    for (const [key, value] of Object.entries(options)) {
        if (key in referenceOptions) {
            if (typeof value === "object" && value !== null) {
                for (const [subKey, subValue] of Object.entries(value)) {
                    if (
                        subKey in referenceOptions[key] &&
                        referenceOptions[key][subKey]
                    ) {
                        optionsString += ` ${referenceOptions[key][subKey]} ${subValue}`;
                    }
                }
            } else if (referenceOptions[key]) {
                if (key === "supports") {
                    optionsString += value ? ` ${referenceOptions[key]}` : "";
                } else optionsString += ` ${referenceOptions[key]} ${value}`;
            }
        } else {
            console.warn(`Unknown option: ${key}`);
        }
    }
    console.log("Processed slicing options:", optionsString);
    return optionsString.trim();
};

module.exports = { sliceMeshToGcode, processSlicingOptions };
