const express = require("express");

const router = express.Router();

const {
    createEquipment,
    deleteEquipment,
    editEquipment,
    getEquipment,
    getAllEquipment,
    updateStatus,
} = require("../controllers/equipment.controllers.js");

const { ensureAuthenticated } = require("../middleware/auth.js");

router.post("/", ensureAuthenticated, createEquipment);
router.put("/:uuid", ensureAuthenticated, editEquipment);
router.get("/status/:uuid", ensureAuthenticated, updateStatus);
router.get("/:uuid", ensureAuthenticated, getEquipment);
router.get("/", ensureAuthenticated, getAllEquipment);
router.delete("/:uuid", ensureAuthenticated, deleteEquipment);

module.exports = router;
