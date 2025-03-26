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
router.put("/:id", editCategory);
router.get("/:id", getCategory);
router.get("/", getAllCategories);
router.delete("/:id", deleteCategory);

module.exports = router;
