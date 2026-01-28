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
    sendMessageToDuet,
} = require("../services/duet.service.js");
const {
    detectMajorFacesPython,
    rotateMeshPython,
} = require("../services/geometry.service.js");
const path = require("path");
const fs = require("fs");
const Equipment = require("../models/Equipment.js");
const Job = require("../models/Job.js");
const crypto = require("crypto");
const { ObjectId } = require("mongoose").Types;

/**
 * create a new print job
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const createJob = async (req, res) => {
    // request needs to contain filename, may have options
    const { fileName, material, options, userId } = req.body;
    try {
        // after file upload
        const filePath =
            (process.env.MESH_INPUT_DIR || "meshes") + "/" + fileName;
        const gcodeFileName = fileName.replace(/\.[^/.]+$/, ".gcode");
        const gcodeFilePath = path.resolve(
            process.env.GCODE_OUTPUT_DIR || "gcodes",
            gcodeFileName,
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
                processedOptions,
            );
            console.log("Gcode file created:", gcodeFilePath);
        }

        const printer = await Equipment.findOne({ ipUrl: "10.68.1.176" });
        console.log(userId);
        const job = new Job({
            _id: new ObjectId(),
            uuid: crypto.randomUUID(),
            equipmentId: printer.uuid,
            userId,
            gcodeFileName: gcodeFileName,
            status: "queued",
        });
        await job.save();
        return res.status(201).json({ message: "Job created successfully." });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when creating new job.",
            error: err.message,
        });
    }
};

const readyMessage = async (req, res) => {
    try {
        const { printerIp } = req.params;
        const equipment = await Equipment.findOne({ ipUrl: printerIp });
        if (!equipment) {
            return res.status(404).json({ message: "Equipment not found." });
        }
        const jobs = await Job.find({
            equipmentId: equipment.uuid,
            status: "queued",
        }).sort({ createdAt: 1 });
        if (jobs.length === 0) {
            return res.status(404).json({ message: "No queued jobs found." });
        }
        const message = await sendMessageToDuet(printerIp);
        console.log("Ready message sent to printer:", message);
        return res
            .status(200)
            .json({ message: "Ready message sent to printer." });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when sending ready message to printer.",
            error: err.message,
        });
    }
};

const sendJob = async (req, res) => {
    try {
        const { printerIp } = req.params;
        const equipment = await Equipment.findOne({ ipUrl: printerIp });
        if (!equipment) {
            return res.status(404).json({ message: "Equipment not found." });
        }
        const jobs = await Job.find({
            equipmentId: equipment.uuid,
            status: "queued",
        }).sort({ createdAt: 1 });
        if (jobs.length === 0) {
            return res.status(404).json({ message: "No queued jobs found." });
        }

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
            jobs[0].gcodeFileName,
            path.resolve(
                process.env.GCODE_OUTPUT_DIR || "gcodes",
                jobs[0].gcodeFileName,
            ),
        );
        console.log("Gcode sent to printer:", sendGcode);
        // start print
        const starting = await startPrint(printerIp, jobs[0].gcodeFileName);
        console.log("Print started:", starting);

        const jobId = jobs[0].uuid;
        await Job.findOneAndUpdate({ uuid: jobId }, { status: "sent" });

        return res
            .status(200)
            .json({ message: "Job sent to printer successfully." });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when sending job to printer.",
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
    // 1. Validate Request
    if (!req.file) {
        return res.status(400).send({ message: "No file uploaded." });
    }

    // Normalized paths for comparison
    const tempPath = path.resolve(req.file.path); 
    const destinationDir = path.resolve(process.env.MESH_INPUT_DIR || "meshes");
    const destinationPath = path.resolve(destinationDir, req.file.originalname);

    try {
        // 2. Run Analysis
        let pythonOutput;
        try {
            pythonOutput = await detectMajorFacesPython(tempPath);
        } catch (err) {
            console.error("Critical python error:", err);
            throw err;
        }

        // Check for Explicit Validation Errors
        if (pythonOutput.error_type) {
            console.warn(`Validation Failed: ${pythonOutput.error_type}`);
            
            // Clean up: Only delete if it exists
            if (fs.existsSync(tempPath)) {
                fs.unlink(tempPath, (err) => { if(err) console.error(err); });
            }

            return res.status(400).send({
                message: pythonOutput.message || "File validation failed",
                code: pythonOutput.error_type,
                details: pythonOutput.details,
                min_thickness: pythonOutput.min_thickness
            });
        }

        // --- FIXED MOVE LOGIC ---
        // Only move if the paths are actually different
        if (tempPath !== destinationPath) {
            // Ensure directory exists
            if (!fs.existsSync(destinationDir)){
                fs.mkdirSync(destinationDir, { recursive: true });
            }

            // Copy and Delete (Move)
            await fs.promises.copyFile(tempPath, destinationPath);
            await fs.promises.unlink(tempPath);
            console.log(`File moved to staging: ${destinationPath}`);
        } else {
            console.log(`File already in staging: ${destinationPath}`);
        }

        // 3. Standard Face Detection Logic
        const majorFaces = pythonOutput.faces;

        if (!Array.isArray(majorFaces) || majorFaces.length === 0) {
            console.error("Face detection returned no faces.");
            if (fs.existsSync(destinationPath)) {
                fs.unlink(destinationPath, (err) => { if(err) console.error(err); });
            }
            return res.status(400).send({
                message: "No major faces detected.",
                faces: [],
            });
        }

        // 4. Format & Limit Data
        const MAX_FACES = 50;
        const result = majorFaces.slice(0, MAX_FACES).map((f, index) => ({
            id: index,
            normal: f.normal,
            centroid: f.centroid,
            ellipseCenter: f.ellipseCenter || f.centroid,
            ellipseAxis: f.ellipseAxis || { x: 1, y: 0, z: 0 },
            bottomVertex: f.bottomVertex,
            area: f.overlapArea, 
            ellipseRadii: f.ellipseRadii || [0, 0],
            ellipseRotation: 0, 
        }));

        return res.status(200).send({
            message: "File pre-processed successfully.",
            faces: result,
            fileName: req.file.originalname 
        });

    } catch (err) {
        // Cleanup: Be careful not to delete the file if it was already in the destination 
        // and the error happened unrelated to the file moving (though usually, we want to clean up on error)
        if (fs.existsSync(tempPath)) {
             fs.unlink(tempPath, (err) => { if(err) console.error(err); });
        }
        
        console.error(err.message);
        return res.status(500).send({
            message: "Error when pre-processing job.",
            error: err.message,
        });
    }
};

/**
 * NEW: Rotate the mesh based on selected face and overwrite the file
 */
const placeOnFace = async (req, res) => {
    const { fileName, normal, centroid } = req.body;

    if (!fileName || !normal) {
        return res.status(400).json({ 
            message: "Missing required parameters: fileName or normal" 
        });
    }

    // --- FIX: Use path.resolve to match preProcess logic exactly ---
    const destinationDir = process.env.MESH_INPUT_DIR || "meshes";
    const filePath = path.resolve(destinationDir, fileName);

    console.log(`[placeOnFace] Looking for file at: ${filePath}`);

    try {
        if (!fs.existsSync(filePath)) {
             console.error(`[placeOnFace] File NOT found at: ${filePath}`);
             return res.status(404).json({ message: "File not found on server." });
        }

        // Call the Python service to perform the rotation and overwrite the file
        await rotateMeshPython(filePath, normal, centroid);

        return res.status(200).json({ 
            message: "Mesh aligned and saved successfully.",
            fileName: fileName 
        });

    } catch (err) {
        console.error("Error aligning mesh:", err);
        return res.status(500).json({ 
            message: "Error aligning mesh.", 
            error: err.message 
        });
    }
};

const getAllJobs = async (req, res) => {
    const { userId, startDate, endDate } = req.query;
    try {
        let filter = {};
        if (startDate && endDate) {
            filter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }
        if (userId) {
            filter.userId = userId;
        }
        const jobs = await Job.find(filter, { projection: { _id: 0 } }).sort({
            createdAt: -1,
        });
        return res.status(200).json(jobs);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when retrieving recent jobs.",
            error: err.message,
        });
    }
};

module.exports = {
    createJob,
    preProcess,
    sendJob,
    getAllJobs,
    readyMessage,
    placeOnFace, // <--- Export the new endpoint
};
