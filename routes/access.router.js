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
router.put("/:id", editAccess);
router.get("/:id", getAccess);
router.get("/", getAllAccesses);
router.delete("/:id", deleteAccess);

module.exports = router;
