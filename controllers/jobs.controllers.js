const {
    checkFileExtensions,
    getFileExtension,
    moveFile,
} = require("../utils/file.utils.js");
const {
    sliceMeshToGcode,
    processSlicingOptions,
} = require("../services/slicer.service.js");
const {
    startPrint,
    connectToDuet,
    sendGcodeToDuet,
    getPrinterStatus,
} = require("../services/duet.service.js");

/**
 * create a new print job
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const createJob = async (req, res) => {
    // request needs to contain filename, may have options
    const { fileName, material, options } = req.body;
    try {
        // after file upload
        const filePath =
            (process.env.MESH_INPUT_DIR || "meshes") + "/" + fileName;
        const gcodeFileName = fileName.replace(/\.[^/.]+$/, ".gcode");
        const gcodeFilePath = path.resolve(
            process.env.GCODE_OUTPUT_DIR || "gcodes",
            gcodeFileName
        );
        // slice file to gcode
        const file_extension = getFileExtension(fileName);
        if (file_extension.toLowerCase() === ".gcode") {
            moveFile(filePath, gcodeFilePath);
            console.log("Gcode file moved to:", gcodeFilePath);
        } else {
            const processedOptions = processSlicingOptions(options);
            const success = await sliceMeshToGcode(
                fileName,
                filePath,
                gcodeFilePath,
                processedOptions
            );
            console.log("Gcode file created:", gcodeFilePath);
        }

        // find free printer
        const printerIp = await findFreePrinter();
        // connect to printer
        const connect = await connectToDuet(printerIp);
        console.log("Connected to printer:", connect);
        const status = await getPrinterStatus(printerIp);
        console.log("Printer status:", status);
        if (status !== "idle") {
            return res
                .status(400)
                .json({ message: "No free printer available." });
        }
        // upload gcode to printer
        const sendGcode = await sendGcodeToDuet(
            printerIp,
            gcodeFileName,
            gcodeFilePath
        );
        console.log("Gcode sent to printer:", sendGcode);
        // start print
        const starting = await startPrint(printerIp, gcodeFileName);
        console.log("Print started:", starting);

        return res.status(200).json({ message: "Job created successfully." });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when creating new job.",
            error: err.message,
        });
    }
};

/**
 * pre-process uploaded file
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const preProcess = async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).send({ message: "No file uploaded." });
        }

        const allowed_extensions = [".stl", ".3mf", ".gcode"];
        const preCheckResult = checkFileExtensions(
            file.originalname,
            allowed_extensions
        );

        if (!preCheckResult) {
            return res
                .status(400)
                .send({ message: "Invalid file type uploaded." });
        }

        //TODO: include checking whether file exists

        // Explicitly end the response to avoid hanging
        return res
            .status(200)
            .send({ message: "File pre-processed successfully." });
    } catch (err) {
        console.error(err.message);
        // Explicitly end the response to avoid hanging
        return res.status(500).send({
            message: "Error when pre-processing job.",
            error: err.message,
        });
    }
};

/**
 * looks for a free printer in the network
 * @returns - ip address of free printer
 */
const findFreePrinter = async () => {
    return "10.68.1.176";
};

module.exports = { createJob, preProcess };
