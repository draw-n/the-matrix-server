const express = require("express");
const multer = require("multer");
const router = express.Router();

const {
    getJobChartData,
    createJob,
    preProcess,
    getAllJobs,
    placeOnFace,
    getFilamentUsedGrams,
    readyJob,
    deleteJobById,
    editJobById,
    reprintJobById
} = require("../controllers/jobs.controllers.js");
const { ensureAuthenticated } = require("../middleware/auth.js");

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, process.env.MESH_INPUT_DIR || "uploads/");
    },
    limits: { fileSize: 250 * 1024 * 1024 }, // 250 MB limit
    filename: (req, file, callback) => {
        if (!req.user || !req.user.firstName || !req.user.lastName) {
            return callback(new Error("User information is missing"));
        }
        callback(null, file.originalname);
    },
});

const upload = multer({ storage: storage });

router.post(
    "/pre-process",
    ensureAuthenticated,
    upload.single("file"),
    preProcess,
);
router.post("/place-on-face", ensureAuthenticated, placeOnFace);
router.post("/:jobId", ensureAuthenticated, reprintJobById);
router.post("/", ensureAuthenticated, createJob);
router.get("/", ensureAuthenticated, getAllJobs);
router.get("/chart-data", ensureAuthenticated, getJobChartData);
router.get("/filament-usage", ensureAuthenticated, getFilamentUsedGrams);
// endpoints for printer to check for jobs, no authentication
router.get("/:printerIp/ready", readyJob);
router.put("/:jobId", ensureAuthenticated, editJobById);
router.delete("/:jobId", ensureAuthenticated, deleteJobById);

module.exports = router;
