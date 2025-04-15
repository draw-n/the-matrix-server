const express = require("express");

const router = express.Router();

const {
    createAccess,
    deleteAccess,
    editAccess,
    getAccess,
    getAllAccesses,
} = require("../controllers/access.controllers.js");

router.post("/", createAccess);
router.put("/:role", editAccess);
router.get("/:role", getAccess);
router.get("/", getAllAccesses);
router.delete("/:role", deleteAccess);

module.exports = router;
