const express = require("express");

const router = express.Router();

const {
    createIssue,
    deleteIssueById,
    editIssueById,
    getIssueById,
    getAllIssues,
} = require("../controllers/issues.controllers.js");

const { ensureAuthenticated } = require("../middleware/auth.js");

router.post("/", ensureAuthenticated, createIssue);
router.put("/:uuid", ensureAuthenticated, editIssueById);
router.get("/:uuid", ensureAuthenticated, getIssueById);
router.get("/", ensureAuthenticated, getAllIssues);
router.delete("/:uuid", ensureAuthenticated, deleteIssueById);
module.exports = router;
