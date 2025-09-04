const { checkFileExtensions } = require("../utils/file.utils.js");
const { sliceMeshToGcode } = require("../services/slicer.service.js");
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
        // slice file to gcode
        const [gcodeFileName, gcodeFilePath] = await sliceMeshToGcode(fileName, options);
        console.log("Gcode file created:", gcodeFilePath);
        // find free printer
        const printerIp = await findFreePrinter();
        // connect to printer
        const connect = await connectToDuet(printerIp);
        console.log("Connected to printer:", connect);
        // upload gcode to printer
        const sendGcode = await sendGcodeToDuet(printerIp, gcodeFileName, gcodeFilePath);
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

        const allowed_extensions = [".stl", ".3mf"];
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
        return res.status(200).send({ message: "File pre-processed successfully." });
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
