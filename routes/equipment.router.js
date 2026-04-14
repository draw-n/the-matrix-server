const express = require("express");

const router = express.Router();

const {
    createEquipment,
    deleteEquipmentById,
    editEquipmentById,
    getEquipmentById,
    getAllEquipment,
    updateStatusById,
    pausePrinterById,
} = require("../controllers/equipment.controllers.js");

const { ensureAuthenticated, ensureAccess } = require("../middleware/auth.js");

router.post("/", ensureAuthenticated, createEquipment);
router.put("/:uuid", ensureAuthenticated, editEquipmentById);
router.get("/status/:uuid", ensureAuthenticated, updateStatusById);
router.get(
    "/pause/:uuid",
    ensureAuthenticated,
    ensureAccess(["admin", "moderator"]),
    pausePrinterById,
);
router.get("/:uuid", ensureAuthenticated, getEquipmentById);
router.get("/", ensureAuthenticated, getAllEquipment);
router.delete("/:uuid", ensureAuthenticated, deleteEquipmentById);

module.exports = router;
