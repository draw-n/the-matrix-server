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

router.post("/", createEquipment);
router.put("/:uuid", editEquipment);
router.get("/status/:uuid", updateStatus);
router.get("/:uuid", getEquipment);
router.get("/", getAllEquipment);
router.delete("/:uuid", deleteEquipment);

module.exports = router;
