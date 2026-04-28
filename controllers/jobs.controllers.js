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
    getPrinterStatus,
} = require("../services/duet.service.js");
const axios = require("axios");
const {
    detectMajorFacesPython,
    rotateMeshPython,
} = require("../services/geometry.service.js");
const path = require("path");
const fs = require("fs");
const Equipment = require("../models/Equipment.js");
const Job = require("../models/Job.js");
const crypto = require("crypto");
const User = require("../models/User.js");
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
        const user = await User.findOne({ uuid: userId });
        const existingJobs = await Job.find({
            userId: user.uuid,
            status: { $in: ["queued", "ready"] },
        });

        if (user.access !== "admin" && existingJobs.length >= 3) {
            return res.status(400).json({
                message:
                    "You have too many active jobs. Please wait for them to complete before uploading new ones.",
            });
        }
        // after file upload
        const filePath = path.resolve(
            process.env.MESH_INPUT_DIR || "meshes",
            fileName,
        );
        const gcodeFileName = `${user.firstName}_${user.lastName}_${fileName.replace(/\.[^/.]+$/, ".gcode")}`;
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

        const nextOrder =
            (await Job.countDocuments({ equipmentId: printer.uuid })) + 1;

        const job = new Job({
            _id: new ObjectId(),
            uuid: crypto.randomUUID(),
            equipmentId: printer.uuid,
            userId,
            filamentUsedGrams,
            estimatedTimeSeconds,
            gcodeFileName: gcodeFileName,
            status: "queued",
            order: nextOrder,
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

/**
 * Reprints a job based on its ID
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const reprintJobById = async (req, res) => {
    const { jobId } = req.params;

    try {
        const user = await User.findOne({ uuid: req.user.uuid });
        const existingJobs = await Job.find({
            userId: user.uuid,
            status: { $in: ["queued", "ready"] },
        });

        if (user.access !== "admin" && existingJobs.length >= 3) {
            return res.status(400).json({
                message:
                    "You have too many active jobs. Please wait for them to complete before uploading new ones.",
            });
        }
        if (!jobId) {
            return res
                .status(400)
                .json({ message: "Missing jobId parameter." });
        }
        const job = await Job.findOne({ uuid: jobId });
        if (!job) {
            return res.status(404).json({ message: "Job not found." });
        }
        if (job.status !== "completed" && job.status !== "failed") {
            return res.status(400).json({
                message: "Only completed or failed jobs can be reprinted.",
            });
        }

        const newJob = new Job({
            ...job.toObject(),
            _id: new ObjectId(),
            uuid: crypto.randomUUID(),
            status: "queued",
            createdAt: new Date(),
            uploadedAt: null,
            finishedAt: null,
            failureReason: "",
            order:
                (await Job.countDocuments({ equipmentId: job.equipmentId, status: "queued" })) +
                1,
        });
        await newJob.save();
        return res.status(200).json({
            message: "Job reprint created successfully.",
            job: newJob,
        });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({
            message: "Error when creating reprint job.",
            error: err.message,
        });
    }
};

/**
 * Handles the printer's request to check for ready jobs and manages the pre-print and post-print flows based on job status and UI sync values.
 * @param {*} req -     request details (with printerIp in params and optional uiSyncValue in query)
 * @param {*} res - response details
 * @returns - response details (with status and jobFound boolean)
 */
const readyJob = async (req, res) => {
    try {
        const { printerIp } = req.params;
        const { uiSyncValue = 0 } = req.query;

        const equipment = await Equipment.findOne({ ipUrl: printerIp });
        if (!equipment)
            return res.status(404).json({ message: "Equipment not found." });

        // 1. FIND THE ACTIVE JOB (either ready/pre-print or printing)
        let job = await Job.findOne({
            equipmentId: equipment.uuid,
            status: { $in: ["ready", "printing"] },
        }).sort({ createdAt: 1 });

        // 2. NO ACTIVE JOB -> pick next queued and set to ready
        if (!job) {
            const nextJob = await Job.findOne({
                equipmentId: equipment.uuid,
                status: "queued",
            }).sort({ order: 1, createdAt: 1 });

            if (!nextJob) {
                return res
                    .status(200)
                    .json({ jobFound: false, message: "No jobs waiting." });
            }

            // Make job ready so pre-print bed check will be performed
            nextJob.status = "ready";
            nextJob.lastPrompt = "NONE";
            await nextJob.save();
            job = nextJob;

            const updateOtherJobs = await Job.updateMany(
                {
                    equipmentId: equipment.uuid,
                    status: "queued",
                    order: { $gt: job.order },
                },
                { $inc: { order: -1 } },
            );
        }

        // 3. PRE-PRINT FLOW: when job is READY, always require bed-check before starting
        if (job.status === "ready") {
            // If we haven't started the bed-check sequence yet, start it automatically
            if (job.lastPrompt === "NONE") {
                job.lastPrompt = "BED_CLEAR_CHECK";
                await job.save();
                // connect only when sending the macro
                try {
                    const conn = await connectToDuet(printerIp);
                    console.log("Connected to printer:", conn);
                } catch (e) {
                    console.warn(
                        "Could not connect to Duet for bed check:",
                        e.message,
                    );
                }
                await sendMacroToDuet(printerIp, "01_bed_clear.g");

                return res
                    .status(200)
                    .json({ jobFound: true, message: "Bed check started" });
            }

            // We're in the bed-check state and waiting for UI confirmation
            if (job.lastPrompt === "BED_CLEAR_CHECK") {
                if (Number(uiSyncValue) === 1) {
                    // Confirmed: upload & start print
                    try {
                        await connectToDuet(printerIp);
                    } catch (e) {
                        console.warn(
                            "Could not connect to Duet for upload/start:",
                            e.message,
                        );
                    }

                    const sendGcode = await sendGcodeToDuet(
                        printerIp,
                        job.gcodeFileName,
                        path.resolve(
                            process.env.GCODE_OUTPUT_DIR || "gcodes",
                            job.gcodeFileName,
                        ),
                    );
                    console.log("Gcode sent to printer:", sendGcode);

                    const starting = await startPrint(
                        printerIp,
                        job.gcodeFileName,
                    );
                    console.log("Print started:", starting);
                    job.uploadedAt = new Date();
                    job.status = "printing";
                    job.lastPrompt = "NONE";
                    await job.save();

                    // reset ui_sync on Duet
                    try {
                        await axios.get(`http://${printerIp}/rr_gcode`, {
                            params: { gcode: `set global.ui_sync = 0` },
                            timeout: 2000,
                        });
                    } catch (e) {
                        console.warn(
                            "⚠️ Minor: Failed to reset ui_sync on Duet.",
                        );
                    }

                    return res
                        .status(200)
                        .json({ jobFound: true, message: "Print started" });
                } else if (Number(uiSyncValue) === 0) {
                    // If UI is still at the bed check prompt (uiSyncValue=0), resend the macro in case it was missed
                    try {
                        const conn = await connectToDuet(printerIp);
                        console.log(
                            "Connected to printer for bed check (resend):",
                            conn,
                        );
                    } catch (e) {
                        console.warn(
                            "Could not connect to Duet for bed check (resend):",
                            e.message,
                        );
                    }
                    await sendMacroToDuet(printerIp, "01_bed_clear.g");
                    return res.status(200).json({
                        jobFound: true,
                        message: "Bed check prompt resent",
                    });
                }

                // waiting for user confirmation
                return res.status(200).json({
                    jobFound: true,
                    message: "Awaiting bed check confirmation",
                });
            }
        }

        // 4. POST-PRINT FLOW: the Raspberry Pi only calls this endpoint when the
        // printer is idle (i.e. after a print finishes). Therefore, if we see a
        // job with status 'printing' when this endpoint is invoked, treat that as
        // the print having finished and start the success-check sequence.
        if (job.status === "printing") {
            // Start success check if not already started
            if (job.lastPrompt === "NONE") {
                job.lastPrompt = "SUCCESS_CHECK";
                await job.save();
                // connect only when sending the macro
                try {
                    const conn = await connectToDuet(printerIp);
                    console.log(
                        "Connected to printer for success check:",
                        conn,
                    );
                } catch (e) {
                    console.warn(
                        "Could not connect to Duet for success check:",
                        e.message,
                    );
                }
                await sendMacroToDuet(printerIp, "00_success_check.g");
                return res
                    .status(200)
                    .json({ jobFound: true, message: "Success check started" });
            }

            // Process responses for post-print prompts (SUCCESS_CHECK, REPRINT_CHECK, FAILURE_REASON)
            switch (job.lastPrompt) {
                case "SUCCESS_CHECK":
                    if (Number(uiSyncValue) === 1) {
                        // YES - Print was successful, mark as completed
                        job.status = "completed";
                        job.finishedAt = new Date();
                        job.lastPrompt = "NONE";
                        await job.save();
                    } else if (Number(uiSyncValue) === 2) {
                        // NO - ask about reprint
                        job.lastPrompt = "REPRINT_CHECK";
                        await job.save();
                        try {
                            await connectToDuet(printerIp);
                        } catch (e) {
                            console.warn(
                                "Could not connect to Duet for reprint check:",
                                e.message,
                            );
                        }
                        await sendMacroToDuet(printerIp, "02_reprint_check.g");
                    } else if (Number(uiSyncValue) === 0) {
                        try {
                            const conn = await connectToDuet(printerIp);
                            console.log(
                                "Connected to printer for success check:",
                                conn,
                            );
                        } catch (e) {
                            console.warn(
                                "Could not connect to Duet for success check:",
                                e.message,
                            );
                        }
                        await sendMacroToDuet(printerIp, "00_success_check.g");
                        return res.status(200).json({
                            jobFound: true,
                            message: "Success check started",
                        });
                    }

                    break;

                case "REPRINT_CHECK":
                    if (Number(uiSyncValue) === 1) {
                        // YES -> put the job back into queue as first
                        job.status = "ready";
                        job.lastPrompt = "NONE";
                        await job.save();
                    } else if (Number(uiSyncValue) === 2) {
                        // NO -> ask for failure reason
                        job.lastPrompt = "FAILURE_REASON";
                        await job.save();
                        try {
                            await connectToDuet(printerIp);
                        } catch (e) {
                            console.warn(
                                "Could not connect to Duet for failure reason prompt:",
                                e.message,
                            );
                        }
                        await sendMacroToDuet(printerIp, "03_failure_reason.g");
                    } else if (Number(uiSyncValue) === 0) {
                        try {
                            await connectToDuet(printerIp);
                        } catch (e) {
                            console.warn(
                                "Could not connect to Duet for reprint check:",
                                e.message,
                            );
                        }
                        await sendMacroToDuet(printerIp, "02_reprint_check.g");
                    }
                    break;

                case "FAILURE_REASON":
                    if (uiSyncValue === "0" || Number(uiSyncValue) === 0) {
                        try {
                            await connectToDuet(printerIp);
                        } catch (e) {
                            console.warn(
                                "Could not connect to Duet for failure reason prompt:",
                                e.message,
                            );
                        }
                        await sendMacroToDuet(printerIp, "03_failure_reason.g");
                        return res.status(200).json({
                            jobFound: true,
                            message: "Failure reason prompt sent",
                        });
                    } else {
                        job.failureReason = uiSyncValue;
                    }
                    job.status = "failed";
                    job.finishedAt = new Date();

                    job.lastPrompt = "NONE";
                    await job.save();
                    break;
            }

            // After handling transitions, try to reset ui_sync
            try {
                await axios.get(`http://${printerIp}/rr_gcode`, {
                    params: { gcode: `set global.ui_sync = 0` },
                    timeout: 2000,
                });
            } catch (e) {
                console.warn(
                    "⚠️ Minor: Failed to reset ui_sync on Duet. Will retry next poll.",
                );
            }

            return res.status(200).json({
                jobFound: true,
                message: `Processed ${job.lastPrompt}`,
            });
        }

        // Fallback
        return res.status(200).json({
            jobFound: true,
            message: `No action for status ${job.status}`,
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
    const user = await User.findOne({ uuid: req.user.uuid });
    const existingJobs = await Job.find({
        userId: user.uuid,
        status: { $in: ["queued", "ready"] },
    });

    if (user.access !== "admin" && existingJobs.length >= 3) {
        return res.status(400).json({
            message:
                "You have too many active jobs. Please wait for them to complete before uploading new ones.",
        });
    }

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

    const destinationDir = path.resolve(process.env.MESH_INPUT_DIR || "meshes");
    const destinationPath = path.resolve(destinationDir, req.file.filename);

    try {
        // 2. Run Analysis
        let pythonOutput;
        try {
            pythonOutput = await detectMajorFacesPython(destinationPath);
        } catch (err) {
            console.error("Critical python error:", err);
            throw err;
        }

        // Check for Explicit Validation Errors
        if (pythonOutput.error_type) {
            console.warn(`Validation Failed: ${pythonOutput.error_type}`);

            // Clean up: Only delete if it exists
            if (fs.existsSync(destinationPath)) {
                fs.unlink(destinationPath, (err) => {
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
            fileName: req.file.filename,
        });
    } catch (err) {
        // Cleanup: Be careful not to delete the file if it was already in the destination
        // and the error happened unrelated to the file moving (though usually, we want to clean up on error)
        if (fs.existsSync(destinationPath)) {
            fs.unlink(destinationPath, (err) => {
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
 * deletes a job by its ID, only if it belongs to the authenticated user and is not currently printing
 * @param {*} req - request details (with jobId in params)
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const deleteJobById = async (req, res) => {
    const { jobId } = req.params;
    try {
        const job = await Job.findOneAndDelete({ uuid: jobId });
        if (!job) {
            return res.status(404).json({ message: "Job not found." });
        }
        return res.status(200).json({ message: "Job deleted successfully." });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({
            message: "Error when deleting job.",
            error: err.message,
        });
    }
};

/**
 * edits a job by its ID, only if it belongs to the authenticated user
 * @param {*} req - request details (with jobId in params)
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const editJobById = async (req, res) => {
    const { jobId } = req.params;
    const updateData = req.body;
    try {
        const job = await Job.findOneAndUpdate({ uuid: jobId }, updateData, {
            new: true,
        });
        if (!job) {
            return res.status(404).json({ message: "Job not found." });
        }
        return res
            .status(200)
            .json({ message: "Job updated successfully.", job });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({
            message: "Error when updating job.",
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
    deleteJobById,
    reprintJobById,
    getAllJobs,
    placeOnFace,
    getJobChartData,
    getFilamentUsedGrams,
    editJobById,
};
