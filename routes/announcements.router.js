const express = require("express");

const router = express.Router();

const {
    createAnnouncement,
    deleteAnnouncement,
    editAnnouncement,
    getAnnouncement,
    getAllAnnouncements,
} = require("../controllers/announcements.controllers.js");

router.post("/", createAnnouncement);
router.put("/:uuid", editAnnouncement);
router.get("/:uuid", getAnnouncement);
router.get("/", getAllAnnouncements);
router.delete("/:id", deleteAnnouncement);

module.exports = router;
