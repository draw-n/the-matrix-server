const Issue = require("../models/Issue.js");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

/**
 * Creates new issue and saves to MongoDB.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const createIssue = async (req, res) => {
    const { equipment, description, createdBy, dateCreated } = req.body;

    try {
        if (equipment && description && createdBy && dateCreated) {
            let issue = new Issue({
                _id: new ObjectId(),
                equipment,
                status: "open",
                description,
                createdBy,
                dateCreated,
                assignedTo: "",
            });
            await issue.save();
            return res.status(200).json(issue);
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
    const id = req.params?.id;

    try {
        if (id) {
            const issue = await Issue.findByIdAndDelete(id);
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
    const id = req.params?.id;
    try {
        if (id) {
            const issue = await Issue.findByIdAndUpdate(id, req.body);

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
    const id = req.params?.id;

    try {
        if (id) {
            const issue = await Issue.findById(id);
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
    const { status, equipment } = req.query;

    try {
        let filter = {};

        if (equipment) {
            if (ObjectId.isValid(equipment)) {
                filter.equipment = ObjectId.createFromHexString(equipment); // Convert to ObjectId
            } else {
                filter.equipment = equipment; // It's a string, use it as is
            }
        }

        if (status) {
            const statusArray = status.split(",");
            filter.status = {
                $in: statusArray.map((status) => new RegExp(status, "i")),
            };
        }

        const issue = await Issue.find(filter);
        return res.status(200).json(issue);
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
