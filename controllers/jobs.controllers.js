const {
    checkFileExtensions,
    getFileExtension,
    moveFile,
} = require("../utils/file.utils.js");
const {
    sliceMeshToGcode,
    processSlicingOptions,
    extractGCodeMetadata,
} = require("../services/slicer.service.js");
const dayjs = require("dayjs");
const {
    startPrint,
    connectToDuet,
    sendGcodeToDuet,
    sendMacroToDuet,
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
        const filePath = path.resolve(
            process.env.MESH_INPUT_DIR || "meshes",
            fileName,
        );
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

        await new Promise((resolve) => setTimeout(resolve, 500));

        const { filamentUsedGrams, estimatedTimeSeconds } =
            await extractGCodeMetadata(gcodeFilePath);

        const job = new Job({
            _id: new ObjectId(),
            uuid: crypto.randomUUID(),
            equipmentId: printer.uuid,
            userId,
            filamentUsedGrams,
            estimatedTimeSeconds,
            gcodeFileName: gcodeFileName,
            status: "queued",
        });
        await job.save();
        return res
            .status(200)
            .json({ message: "Job created successfully.", job: job });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when creating new job.",
            error: err.message,
        });
    }
};

const readyJob = async (req, res) => {
    try {
        const { printerIp } = req.params;
        const { uiSyncValue = 0 } = req.query;
        const connect = await connectToDuet(printerIp);
        console.log("Connected to printer:", connect);

        const equipment = await Equipment.findOne({ ipUrl: printerIp });
        if (!equipment)
            return res.status(404).json({ message: "Equipment not found." });

        // 1. FIND THE ACTIVE JOB
        let job = await Job.findOne({
            equipmentId: equipment.uuid,
            status: { $in: ["printing", "ready"] },
        }).sort({ createdAt: 1 });

        // 2. SCENARIO A: NO ACTIVE JOB / FETCH NEXT FROM QUEUE
        if (!job || (job.status === "printing" && job.lastPrompt === "NONE")) {
            if (job) {
                job.status = "completed";
                await job.save();
            }

            const nextJob = await Job.findOne({
                equipmentId: equipment.uuid,
                status: "queued",
            }).sort({ createdAt: 1 });

            if (!nextJob) {
                return res
                    .status(200)
                    .json({ jobFound: false, message: "No jobs waiting." });
            }

            // Initialize new job to the start of the interview chain
            nextJob.status = "ready";
            nextJob.lastPrompt = "NONE";
            await nextJob.save();
            job = nextJob; // Pass it down to be processed below
        }

        // 3. SCENARIO B: PROCESS THE CURRENT STATE (Process switch)
        // We trigger this if the user clicked (uiSync > 0) OR if it's a brand new "NONE" job
        if (uiSyncValue > 0 || job.lastPrompt === "NONE") {
            console.log(
                `📡 Job: ${job.uuid} | State: ${job.lastPrompt} | Input: ${uiSyncValue}`,
            );

            switch (job.lastPrompt) {
                case "NONE":
                    // Entry Point: Start the Success Check
                    job.lastPrompt = "SUCCESS_CHECK";
                    await sendMacroToDuet(printerIp, "00_success_check.g");
                    break;

                case "SUCCESS_CHECK":
                    if (Number(uiSyncValue) === 1) {
                        // YES
                        job.lastPrompt = "BED_CLEAR_CHECK";
                        await sendMacroToDuet(printerIp, "01_bed_clear.g");
                    } else {
                        // NO
                        job.lastPrompt = "REPRINT_CHECK";
                        await sendMacroToDuet(printerIp, "02_reprint_check.g");
                    }
                    break;

                case "REPRINT_CHECK":
                    if (Number(uiSyncValue) === 1) {
                        // YES (Reprint)
                        job.status = "ready";
                        job.lastPrompt = "BED_CLEAR_CHECK";
                        job.createdAt = new Date(0);
                        await sendMacroToDuet(printerIp, "01_bed_clear.g");
                    } else {
                        // NO
                        job.lastPrompt = "FAILURE_REASON";
                        await sendMacroToDuet(printerIp, "03_failure_reason.g");
                    }
                    break;

                case "FAILURE_REASON":
                    job.status = "failed";
                    job.failureReason = uiSyncValue;
                    job.lastPrompt = "NONE"; // End of line for this job
                    break;

                case "BED_CLEAR_CHECK":
                    // Final confirmation received. Upload and Print.
                    const sendGcode = await sendGcodeToDuet(
                        printerIp,
                        job.gcodeFileName,
                        path.resolve(
                            process.env.GCODE_OUTPUT_DIR || "gcodes",
                            job.gcodeFileName,
                        ),
                    );
                    console.log("Gcode sent to printer:", sendGcode);
                    // start print
                    const starting = await startPrint(
                        printerIp,
                        job.gcodeFileName,
                    );
                    console.log("Print started:", starting);

                    job.status = "printing";
                    job.lastPrompt = "NONE";
                    break;
            }

            await job.save();

            // Always reset the printer sync variable after processing a transition
            try {
                await axios.get(`http://${printerIp}/rr_gcode`, {
                    params: { gcode: `set global.ui_sync = 0` },
                    timeout: 2000, // Don't let a slow reset hang the API response
                });
            } catch (e) {
                console.warn(
                    "⚠️ Minor: Failed to reset ui_sync on Duet. Will retry next poll.",
                );
            }

            return res.status(200).json({
                jobFound: true,
                message: `Transitioned to ${job.lastPrompt}`,
            });
        }

        // 4. SCENARIO C: IDLE WAITING
        // If we get here, it means uiSyncValue is 0 and lastPrompt is not NONE
        return res.status(200).json({
            jobFound: true,
            message: `Awaiting user response for ${job.lastPrompt}`,
        });
    } catch (err) {
        console.error("ReadyMessage Error:", err.message);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * validates the mesh file and extracts major face data for orientation suggestions
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const preProcess = async (req, res) => {
    // 1. Validate Request
    if (!req.file) {
        return res.status(400).send({ message: "No file uploaded." });
    }

    const fileExtension = getFileExtension(req.file.originalname);
    const allowedExtensions = [
        ".stl",
        ".STL",
        ".3mf",
        ".3MF",
        ".gcode",
        ".GCODE",
    ];
    if (!checkFileExtensions(fileExtension, allowedExtensions)) {
        return res.status(400).send({
            message: `Invalid file type. Please use an allowed file type.`,
        });
    }

    if (fileExtension.toLowerCase() === ".gcode") {
        const filePath =
            (process.env.MESH_INPUT_DIR || "meshes") +
            "/" +
            req.file.originalname;
        const gcodeFilePath = path.resolve(
            process.env.GCODE_OUTPUT_DIR || "gcodes",
            req.file.originalname,
        );
        moveFile(req.file.path, path.resolve(filePath, gcodeFilePath));
        return res
            .status(200)
            .json({ message: "GCODE file moved to staging.", gcode: true });
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
                fs.unlink(tempPath, (err) => {
                    if (err) console.error(err);
                });
            }

            return res.status(400).send({
                message: pythonOutput.message || "File validation failed",
                code: pythonOutput.error_type,
                details: pythonOutput.details,
                min_thickness: pythonOutput.min_thickness,
            });
        }

        // --- FIXED MOVE LOGIC ---
        // Only move if the paths are actually different
        if (tempPath !== destinationPath) {
            // Ensure directory exists
            if (!fs.existsSync(destinationDir)) {
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
                fs.unlink(destinationPath, (err) => {
                    if (err) console.error(err);
                });
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
            area: f.overlapArea,
            ellipseRadii: f.ellipseRadii || [0, 0],
            ellipseRotation: 0,
        }));

        return res.status(200).send({
            message: "File pre-processed successfully.",
            faces: result,
            fileName: req.file.originalname,
        });
    } catch (err) {
        // Cleanup: Be careful not to delete the file if it was already in the destination
        // and the error happened unrelated to the file moving (though usually, we want to clean up on error)
        if (fs.existsSync(tempPath)) {
            fs.unlink(tempPath, (err) => {
                if (err) console.error(err);
            });
        }

        console.error(err.message);
        return res.status(500).send({
            message: "Error when pre-processing job.",
            error: err.message,
        });
    }
};

/**
 * rotates the mesh to align the selected face with the print bed and saves the modified file
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const placeOnFace = async (req, res) => {
    const { fileName, normal, centroid } = req.body;

    if (!fileName || !normal) {
        return res.status(400).json({
            message: "Missing required parameters: fileName or normal",
        });
    }

    // --- FIX: Use path.resolve to match preProcess logic exactly ---
    const destinationDir = process.env.MESH_INPUT_DIR || "meshes";
    const filePath = path.resolve(destinationDir, fileName);

    console.log(`[placeOnFace] Looking for file at: ${filePath}`);

    try {
        if (!fs.existsSync(filePath)) {
            console.error(`[placeOnFace] File NOT found at: ${filePath}`);
            return res
                .status(404)
                .json({ message: "File not found on server." });
        }

        // Call the Python service to perform the rotation and overwrite the file
        await rotateMeshPython(filePath, normal, centroid);

        return res.status(200).json({
            message: "Mesh aligned and saved successfully.",
            fileName: fileName,
        });
    } catch (err) {
        console.error("Error aligning mesh:", err);
        return res.status(500).json({
            message: "Error aligning mesh.",
            error: err.message,
        });
    }
};

/**
 * retrieves all jobs, with optional filtering by userId, status, or equipmentId
 * @param {*} req - request details (with optional query parameters for filtering)
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const getAllJobs = async (req, res) => {
    const { userId, status, equipmentId } = req.query;
    try {
        let filter = {};
        if (userId) {
            filter.userId = userId;
        }

        if (status) {
            // Split "queued,printing" into ["queued", "printing"]
            const statusArray = status.split(",");

            // Use $in to match any value within that array
            filter.status = { $in: statusArray };
        }

        if (equipmentId) {
            filter.equipmentId = equipmentId;
        }

        const jobs = await Job.find(filter, { projection: { _id: 0 } }).sort({
            createdAt: 1,
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

/**
 * gets job count grouped by day for the last X days, with optional filtering by userId
 * @param {*} req - request details (with optional query parameters for filtering by userId and days)
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const getJobChartData = async (req, res) => {
    const { userId, days } = req.query;
    try {
        // 1. Explicitly check for 0 or undefined
        // If days is undefined, null, or "0", we treat it as "all time"
        const isAllTime = days === undefined || parseInt(days) === 0;

        const query = {
            userId: userId ? userId : { $exists: true },
        };

        // 2. Only add the date filter if it's NOT "all time"
        // If it IS all time, we can still set a floor of 1 year as you requested
        if (!isAllTime) {
            const daysInt = parseInt(days);
            query.createdAt = {
                $gte: dayjs().subtract(daysInt, "day").startOf("day").toDate(),
            };
        } else {
            // Optional: Hard floor of 1 year ago,
            // or just comment this out to get literally everything ever.
            query.createdAt = {
                $gte: dayjs().subtract(1, "year").startOf("day").toDate(),
            };
        }

        const stats = await Job.aggregate([
            {
                $match: query, // Use the dynamic query object
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt",
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const dataMap = stats.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        res.json(dataMap);
    } catch (error) {
        console.error("Chart Data Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * aggregates the total filament used in grams across all jobs, with optional filtering by userId
 * @param {*} req - request details (with optional query parameters for filtering by userId)
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const getFilamentUsedGrams = async (req, res) => {
    const { userId } = req.query;
    try {
        const filter = { userId: userId ? userId : { $exists: true } };
        const result = await Job.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalFilamentUsed: { $sum: "$filamentUsedGrams" },
                },
            },
        ]);

        const totalFilamentUsed = result[0] ? result[0].totalFilamentUsed : 0;
        return res.status(200).json({ totalFilamentUsed });
    } catch (error) {
        console.error("Filament Used Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
module.exports = {
    createJob,
    preProcess,
    readyJob,
    getAllJobs,
    placeOnFace,
    getJobChartData,
    getFilamentUsedGrams,
};
