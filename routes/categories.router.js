const express = require("express");

const router = express.Router();

const {
    createCategory,
    deleteCategoryById,
    editCategoryById,
    getCategoryById,
    getAllCategories,
} = require("../controllers/categories.controllers.js");

const { ensureAuthenticated } = require("../middleware/auth.js");

router.post("/", ensureAuthenticated, createCategory);
router.put("/:uuid", ensureAuthenticated, editCategoryById);
router.get("/:uuid", ensureAuthenticated, getCategoryById);
router.get("/", ensureAuthenticated, getAllCategories);
router.delete("/:uuid", ensureAuthenticated, deleteCategoryById);
module.exports = router;
