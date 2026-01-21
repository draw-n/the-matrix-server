const express = require("express");

const router = express.Router();

const {
    createAnnouncement,
    deleteAnnouncement,
    editAnnouncement,
    getAnnouncement,
    getAllAnnouncements,
} = require("../controllers/announcements.controllers.js");

const { ensureAuthenticated } = require("../middleware/auth.js");

router.post("/", ensureAuthenticated, createAnnouncement);
router.put("/:uuid", ensureAuthenticated, editAnnouncement);
router.get("/:uuid", ensureAuthenticated, getAnnouncement);
router.get("/", getAllAnnouncements);
router.delete("/:id", ensureAuthenticated, deleteAnnouncement);
module.exports = router;
