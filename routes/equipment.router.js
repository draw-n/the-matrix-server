const express = require("express");

const router = express.Router();

const {
    createEquipment,
    deleteEquipmentById,
    editEquipmentById,
    getEquipmentById,
    getAllEquipment,
    updateStatusById,
} = require("../controllers/equipment.controllers.js");

const { ensureAuthenticated } = require("../middleware/auth.js");

router.post("/", ensureAuthenticated, createEquipment);
router.put("/:uuid", ensureAuthenticated, editEquipmentById);
router.get("/status/:uuid", ensureAuthenticated, updateStatusById);
router.get("/:uuid", ensureAuthenticated, getEquipmentById);
router.get("/", ensureAuthenticated, getAllEquipment);
router.delete("/:uuid", ensureAuthenticated, deleteEquipmentById);

module.exports = router;
