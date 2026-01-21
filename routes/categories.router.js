const express = require("express");

const router = express.Router();

const {
    createCategory,
    deleteCategory,
    editCategory,
    getCategory,
    getAllCategories,
} = require("../controllers/categories.controllers.js");

const { ensureAuthenticated } = require("../middleware/auth.js");

router.post("/", ensureAuthenticated, createCategory);
router.put("/:uuid", ensureAuthenticated, editCategory);
router.get("/:uuid", ensureAuthenticated, getCategory);
router.get("/", ensureAuthenticated, getAllCategories);
router.delete("/:uuid", ensureAuthenticated, deleteCategory);
module.exports = router;
