const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const sliceMeshToGcode = (fileName, filePath, outputFilePath, options) => {
    console.log("Slicing file:", fileName, "with options:", options);
    return new Promise((resolve, reject) => {
    
        const materialFile = "./slicer-cli/configurations/pla_config.ini";
        exec(
            `./slicer-cli/superslicer --output "${outputFilePath}" -g "${filePath}" --load "${materialFile}" ${options}`,
            (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    reject(error);
                    return;
                }

                resolve(true);
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
                otherLayers: "--bed-temperature", // in C
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
                        typeof referenceOptions[key][subKey] === "object" &&
                        referenceOptions[key][subKey] !== null
                    ) {
                        // Handle deeper nesting (e.g., temperatures.extruder.firstLayer)
                        for (const [subSubKey, subSubValue] of Object.entries(subValue)) {
                            if (
                                subSubKey in referenceOptions[key][subKey] &&
                                referenceOptions[key][subKey][subSubKey]
                            ) {
                                optionsString += ` ${referenceOptions[key][subKey][subSubKey]} ${subSubValue}`;
                            }
                        }
                    } else if (
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

export const extractGCodeMetadata = async (gcodePath) => {
    const buffer = fs.readFileSync(gcodePath);
    const content = buffer.toString('utf8', Math.max(0, buffer.length - 5000)); // Read last 5KB

    // SuperSlicer/PrusaSlicer specific keys
    const timeMatch = content.match(/;\s*estimated\s*printing\s*time\s*=\s*(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?/i);
    const filamentMatch = content.match(/;\s*filament\s*used\s*\[g\]\s*=\s*([\d.]+)/i);

    let totalSeconds = 0;
    if (timeMatch) {
        const hours = parseInt(timeMatch[1] || "0");
        const minutes = parseInt(timeMatch[2] || "0");
        const seconds = parseInt(timeMatch[3] || "0");
        totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    }

    return {
        filamentUsedGrams: filamentMatch ? parseFloat(filamentMatch[1]) : 0,
        estimatedTimeSeconds: totalSeconds || 0
    };
};

module.exports = { sliceMeshToGcode, processSlicingOptions, extractGCodeMetadata };
