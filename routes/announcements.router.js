const express = require("express");
const multer = require("multer");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const {
    createAnnouncement,
    deleteAnnouncementById,
    editAnnouncementById,
    getAnnouncementById,
    getAllAnnouncements,
} = require("../controllers/announcements.controllers.js");

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        const dir = path.join(__dirname, "../files/images/announcements/");
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true }); // Create directory if it doesn't exist
        }
        callback(null, dir);
    },
    limits: { fileSize: 250 * 1024 * 1024 }, // 250 MB limit
    filename: (req, file, callback) => {
        let filename = file.originalname;
        callback(null, filename);
    },
});

const upload = multer({ storage: storage });

const { ensureAuthenticated } = require("../middleware/auth.js");

router.post(
    "/",
    ensureAuthenticated,
    upload.single("file"),
    createAnnouncement,
);
router.put(
    "/:uuid",
    ensureAuthenticated,
    upload.single("file"),
    editAnnouncementById,
);
router.get("/:uuid", ensureAuthenticated, getAnnouncementById);
router.get("/", getAllAnnouncements);
router.delete("/:uuid", ensureAuthenticated, deleteAnnouncementById);
module.exports = router;
