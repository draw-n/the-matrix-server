const express = require("express");

const router = express.Router();

const {
    createAnnouncement,
    deleteAnnouncementById,
    editAnnouncementById,
    getAnnouncementById,
    getAllAnnouncements,
} = require("../controllers/announcements.controllers.js");

const { ensureAuthenticated } = require("../middleware/auth.js");

router.post("/", ensureAuthenticated, createAnnouncement);
router.put("/:uuid", ensureAuthenticated, editAnnouncementById);
router.get("/:uuid", ensureAuthenticated, getAnnouncementById);
router.get("/", getAllAnnouncements);
router.delete("/:uuid", ensureAuthenticated, deleteAnnouncementById);
module.exports = router;
