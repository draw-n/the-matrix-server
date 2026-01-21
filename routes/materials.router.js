const express = require("express");

const router = express.Router();

const {
    createMaterial,
    deleteMaterial,
    editMaterial,
    getMaterial,
    getAllMaterials,
} = require("../controllers/materials.controllers.js");
const { ensureAuthenticated } = require("../middleware/auth.js");

router.post("/", ensureAuthenticated, createMaterial);
router.put("/:uuid", ensureAuthenticated, editMaterial);
router.get("/:uuid", ensureAuthenticated, getMaterial);
router.get("/", ensureAuthenticated, getAllMaterials);
router.delete("/:uuid", ensureAuthenticated, deleteMaterial);
module.exports = router;
