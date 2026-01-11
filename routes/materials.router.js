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
router.put("/:uuid", editMaterial);
router.get("/:uuid", getMaterial);
router.get("/", getAllMaterials);
router.delete("/:uuid", deleteMaterial);

module.exports = router;
