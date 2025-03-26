const express = require("express");

const router = express.Router();

const {
    createIssue,
    deleteIssue,
    editIssue,
    getIssue,
    getAllIssues,
} = require("../controllers/issues.controllers.js");

router.post("/", createIssue);
router.put("/:id", editIssue);
router.get("/:id", getIssue);
router.get("/", getAllIssues);
router.delete("/:id", deleteIssue);

module.exports = router;
