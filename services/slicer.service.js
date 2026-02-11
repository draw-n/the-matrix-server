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
            },
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
                        for (const [subSubKey, subSubValue] of Object.entries(
                            subValue,
                        )) {
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

const extractGCodeMetadata = async (gcodePath) => {
    console.log("DEBUG: Attempting to extract metadata from:", gcodePath);

    try {
        // 1. Check if file exists
        if (!fs.existsSync(gcodePath)) {
            console.error("DEBUG ERROR: File does not exist at path!");
            return { filamentUsedGrams: 0, estimatedTimeSeconds: 0 };
        }

        // 2. Check file size
        const stats = fs.statSync(gcodePath);
        console.log(`DEBUG: File size is ${stats.size} bytes`);
        if (stats.size === 0) {
            console.error("DEBUG ERROR: File is empty (0 bytes)!");
            return { filamentUsedGrams: 0, estimatedTimeSeconds: 0 };
        }

        const buffer = fs.readFileSync(gcodePath);
        // Look at a larger chunk (last 100KB) just in case
        const content = buffer.toString(
            "utf8",
            Math.max(0, buffer.length - 100000),
        );

        // 3. Log the "Tail" to see what SuperSlicer actually wrote
        console.log("--- START GCODE FOOTER RAW ---");
        console.log(content.slice(-500)); // Print the very last 500 characters
        console.log("--- END GCODE FOOTER RAW ---");

        // 4. Test the Regexes individually
        const timeRegex =
            /estimated\s*printing\s*time\s*=\s*(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?/i;
        const filamentRegex = /filament\s*used\s*\[g\]\s*=\s*([\d.]+)/i;

        const timeMatch = content.match(timeRegex);
        const filamentMatch = content.match(filamentRegex);

        console.log(
            "DEBUG: Time Match Result:",
            timeMatch ? timeMatch[0] : "NOT FOUND",
        );
        console.log(
            "DEBUG: Filament Match Result:",
            filamentMatch ? filamentMatch[0] : "NOT FOUND",
        );

        let totalSeconds = 0;
        if (timeMatch) {
            const h = parseInt(timeMatch[1] || 0);
            const m = parseInt(timeMatch[2] || 0);
            const s = parseInt(timeMatch[3] || 0);
            totalSeconds = h * 3600 + m * 60 + s;
        }

        return {
            filamentUsedGrams: filamentMatch ? parseFloat(filamentMatch[1]) : 0,
            estimatedTimeSeconds: totalSeconds,
        };
    } catch (err) {
        console.error("DEBUG CRITICAL ERROR:", err);
        return { filamentUsedGrams: 0, estimatedTimeSeconds: 0 };
    }
};

module.exports = {
    sliceMeshToGcode,
    processSlicingOptions,
    extractGCodeMetadata,
};
