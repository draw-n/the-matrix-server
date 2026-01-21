const express = require("express");

const router = express.Router();

const {
    createAccess,
    editAccess,
    getAccess,
    getAllAccesses,
} = require("../controllers/access.controllers.js");

const { ensureAuthenticated } = require("../middleware/auth.js");

router.post("/", ensureAuthenticated, createAccess);
router.put("/:role", ensureAuthenticated, editAccess);
router.get("/:role", ensureAuthenticated, getAccess);
router.get("/", ensureAuthenticated, getAllAccesses);

module.exports = router;
