const express = require("express");

const router = express.Router();

const {
    createCategory,
    deleteCategory,
    editCategory,
    getCategory,
    getAllCategories,
} = require("../controllers/categories.controllers.js");

router.post("/", createCategory);
router.put("/:uuid", editCategory);
router.get("/:uuid", getCategory);
router.get("/", getAllCategories);
router.delete("/:uuid", deleteCategory);

module.exports = router;
