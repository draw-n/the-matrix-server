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
router.put("/:uuid", editIssue);
router.get("/:uuid", getIssue);
router.get("/", getAllIssues);
router.delete("/:uuid", deleteIssue);

module.exports = router;
