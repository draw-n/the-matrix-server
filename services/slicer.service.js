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

const extractGCodeMetadata = (filePath) => {
    const STATS_SIZE = 10000; // Read the last 10KB of the file
    const fileSize = fs.statSync(filePath).size;
    const bufferSize = Math.min(fileSize, STATS_SIZE);
    const buffer = Buffer.alloc(bufferSize);

    const fd = fs.openSync(filePath, 'r');
    // Seek to near the end of the file
    fs.readSync(fd, buffer, 0, bufferSize, fileSize - bufferSize);
    fs.closeSync(fd);

    const content = buffer.toString('utf-8');

    // Regex patterns
    const filamentRegex = /; filament used \[g\]\s*=\s*([\d.]+)/;
    const timeRegex = /; estimated printing time \(normal mode\)\s*=\s*(.+)/;

    const filamentMatch = content.match(filamentRegex);
    const timeMatch = content.match(timeRegex);

    let totalSeconds = 0;
    
    const hours = timeMatch && timeMatch[1].match(/(\d+)h/);
    const minutes = timeMatch && timeMatch[1].match(/(\d+)m/);
    const seconds = timeMatch && timeMatch[1].match(/(\d+)s/);

    if (hours) totalSeconds += parseInt(hours[1]) * 3600;
    if (minutes) totalSeconds += parseInt(minutes[1]) * 60;
    if (seconds) totalSeconds += parseInt(seconds[1]);

    return {
        filamentUsedGrams: filamentMatch ? parseFloat(filamentMatch[1]) : null,
        estimatedTime: totalSeconds ? totalSeconds * 2 : null
    };
}

module.exports = { sliceMeshToGcode, processSlicingOptions, extractGCodeMetadata };
