const express = require("express");

const router = express.Router();

const {
    createMaterial,
    deleteMaterialById,
    editMaterialById,
    getMaterialById,
    getAllMaterials,
} = require("../controllers/materials.controllers.js");
const { ensureAuthenticated } = require("../middleware/auth.js");

router.post("/", ensureAuthenticated, createMaterial);
router.put("/:uuid", ensureAuthenticated, editMaterialById);
router.get("/:uuid", ensureAuthenticated, getMaterialById);
router.get("/", ensureAuthenticated, getAllMaterials);
router.delete("/:uuid", ensureAuthenticated, deleteMaterialById);
module.exports = router;
