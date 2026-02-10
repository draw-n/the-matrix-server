const Issue = require("../models/Issue.js");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
const crypto = require("crypto");

/**
 * Creates new issue and saves to MongoDB.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const createIssue = async (req, res) => {
    const { equipmentId, description, createdBy, dateCreated } = req.body;

    try {
        if (equipmentId && description && createdBy && dateCreated) {
            let issue = new Issue({
                _id: new ObjectId(),
                uuid: crypto.randomUUID(),
                equipmentId,
                status: "open",

                description,
                createdBy,
                dateCreated,
            });
            await issue.save();
            const issueObj = issue.toObject();

            delete issueObj._id;
            return res.status(200).json(issueObj);
        } else {
            return res
                .status(400)
                .send({ message: "Missing at least one required field." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when creating new issue.",
            error: err.message,
        });
    }
};

/**
 * Deletes an issue from MongoDB
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const deleteIssue = async (req, res) => {
    const uuid = req.params?.uuid;

    try {
        if (uuid) {
            const issue = await Issue.findOneAndDelete(
                { uuid: uuid },
                { projection: { _id: 0 } }
            );
            if (!issue) {
                return res.status(404).send({ message: "Issue not found." });
            }
            return res
                .status(200)
                .json({ message: "Successfully deleted issue." });
        } else {
            return res.status(400).send({ message: "Missing Issue ID." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when deleting issue.",
            error: err.message,
        });
    }
};

/**
 * Updates an issue from MongoDB
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const editIssue = async (req, res) => {
    const uuid = req.params?.uuid;
    try {
        if (uuid) {
            const issue = await Issue.findOneAndUpdate(
                { uuid: uuid },
                req.body
            );

            if (!issue) {
                return res.status(404).send({ message: "Issue not found." });
            }

            const issueObj = issue.toObject();

            delete issueObj._id;

            return res.status(200).json(issueObj);
        } else {
            return res.status(400).send({ message: "Missing Issue ID." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when updating issue.",
            error: err.message,
        });
    }
};

/**
 * Retrieves an issue from MongoDB based on id.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const getIssue = async (req, res) => {
    const uuid = req.params?.uuid;

    try {
        if (uuid) {
            const issue = await Issue.findOne(
                { uuid: uuid },
                { projection: { _id: 0 } }
            );
            if (!issue) {
                return res.status(404).send({ message: "Issue not found." });
            }

            return res.status(200).json(issue);
        } else {
            return res.status(400).send({ message: "Missing Issue ID." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when retrieving issue.",
            error: err.message,
        });
    }
};

/**
 * Gets all issues from MongoDB based on filters.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const getAllIssues = async (req, res) => {
    const { status, equipmentId } = req.query;

    try {
        let filter = {};

        if (equipmentId) {
            filter.equipmentId = equipmentId; // It's a string, use it as is
        }

        if (status) {
            const statusArray = status.split(",");
            filter.status = {
                $in: statusArray.map((status) => new RegExp(status, "i")),
            };
        }

        const issues = await Issue.find(filter, {
            projection: { _id: 0 },
        }).sort({ equipmentId: 1 });
        return res.status(200).json(issues);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when retrieving all issues.",
            error: err.message,
        });
    }
};

module.exports = {
    createIssue,
    deleteIssue,
    editIssue,
    getIssue,
    getAllIssues,
};
