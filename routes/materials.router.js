const express = require("express");

const router = express.Router();

const {
    createMaterial,
    deleteMaterial,
    editMaterial,
    getMaterial,
    getAllMaterials,
} = require("../controllers/materials.controllers.js");

router.post("/", createMaterial);
router.put("/:id", editMaterial);
router.get("/:id", getMaterial);
router.get("/", getAllMaterials);
router.delete("/:id", deleteMaterial);

module.exports = router;
