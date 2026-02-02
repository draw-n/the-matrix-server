const express = require("express");
const multer = require("multer");
const router = express.Router();

const { getJobChartData, createJob, preProcess, sendJob, getAllJobs, readyMessage, placeOnFace } = require("../controllers/jobs.controllers.js");
const { ensureAuthenticated } = require("../middleware/auth.js");

const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, process.env.MESH_INPUT_DIR || "uploads/");
    },
    limits: { fileSize: 250 * 1024 * 1024 }, // 250 MB limit
    filename: function (req, file, callback) {
        callback(null, file.originalname);
    },
});

const upload = multer({ storage: storage });

router.post("/pre-process", ensureAuthenticated, upload.single("file"), preProcess);
router.post("/place-on-face", ensureAuthenticated, placeOnFace);

router.post("/", ensureAuthenticated, createJob);
router.get("/", ensureAuthenticated, getAllJobs);
router.get("/chart-data", ensureAuthenticated, getJobChartData);
// endpoints for printer to check for jobs, no authentication
router.get("/:printerIp/ready", readyMessage);
router.get("/:printerIp/send", sendJob);


module.exports = router;
