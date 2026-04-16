const express = require("express");
const multer = require("multer");
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

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, '../files/images/equipments/')
    },
    limits: { fileSize: 250 * 1024 * 1024 }, //im assuming u want dis limit :D
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
})

const upload = multer({storage: storage});

const { ensureAuthenticated, ensureAccess } = require("../middleware/auth.js");

router.post("/", ensureAuthenticated, upload.single("file"), createEquipment);
router.put("/:uuid", ensureAuthenticated, upload.single("file"), editEquipmentById);
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
