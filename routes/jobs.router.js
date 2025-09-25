const express = require("express");
const multer = require("multer");
const router = express.Router();

const { createJob, preProcess } = require("../controllers/jobs.controllers.js");

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

router.post("/pre-process", upload.single("file"), preProcess);
router.post("/", createJob);

module.exports = router;
