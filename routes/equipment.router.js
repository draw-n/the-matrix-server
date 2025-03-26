const express = require("express");

const router = express.Router();

const {
    createEquipment,
    deleteEquipment,
    editEquipment,
    getEquipment,
    getAllEquipment,
} = require("../controllers/equipment.controllers.js");

router.post("/", createEquipment);
router.put("/:id", editEquipment);
router.get("/:id", getEquipment);
router.get("/", getAllEquipment)
router.delete("/:id", deleteEquipment);

module.exports = router;
