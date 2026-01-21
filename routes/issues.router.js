const express = require("express");

const router = express.Router();

const {
    createIssue,
    deleteIssue,
    editIssue,
    getIssue,
    getAllIssues,
} = require("../controllers/issues.controllers.js");

const { ensureAuthenticated } = require("../middleware/auth.js");

router.post("/", ensureAuthenticated, createIssue);
router.put("/:uuid", ensureAuthenticated, editIssue);
router.get("/:uuid", ensureAuthenticated, getIssue);
router.get("/", ensureAuthenticated, getAllIssues);
router.delete("/:uuid", ensureAuthenticated, deleteIssue);
module.exports = router;
