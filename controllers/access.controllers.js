const Access = require("../models/Access.js");
const mongoose = require("mongoose");

/**
 * Creates new access and saves to MongoDB.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const createAccess = async (req, res) => {
    const { role, accessCode } =
        req.body;

    try {
        if (role && accessCode) {
            let access = new Access({
                _id: new mongoose.Types.ObjectId(),
                role,
                accessCode
            });

            await access.save();

            return res.status(200).json(access);
        } else {
            return res
                .status(400)
                .send({ message: "Missing at least one required field." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when creating new access.",
            error: err.message,
        });
    }
};

/**
 * Deletes an access from MongoDB
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const deleteAccess = async (req, res) => {
    const id = req.params?.id;

    try {
        if (id) {
            const access = await Access.findByIdAndDelete(id);
            if (!access) {
                return res
                    .status(404)
                    .send({ message: "Access not found." });
            }

            return res
                .status(200)
                .send({ message: "Successfully deleted access." });
        } else {
            return res
                .status(400)
                .send({ message: "Missing Access ID." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when deleting access.",
            error: err.message,
        });
    }
};

/**
 * Updates an access from MongoDB
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const editAccess = async (req, res) => {
    const id = req.params?.id;
    try {
        if (id) {
            const access = await Access.findByIdAndUpdate(id, req.body);

            if (!access) {
                return res
                    .status(404)
                    .send({ message: "Access not found." });
            }

            return res.status(200).json(access);
        } else {
            return res.status(400).send({ message: "Missing Access ID." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when updating access.",
            error: err.message,
        });
    }
};

/**
 * Retrieves an access from MongoDB based on id.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const getAccess = async (req, res) => {
    const id = req.params?.id;
    try {
        if (id) {
            const access = await Access.findById(id);
            if (!access) {
                return res
                    .status(404)
                    .send({ message: "Access not found." });
            }
            return res.status(200).json(access);
        } else {
            return res
                .status(400)
                .send({ message: "Missing Access ID." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when retrieving access.",
            error: err.message,
        });
    }
};

/**
 * Gets all accesss based off a filter
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const getAllAccesses = async (req, res) => {
    const {
        type,
        status,
        createdBy,
        dateCreated,
        lastUpdatedBy,
        dateLastUpdated,
    } = req.query;
    try {
        let filter = {};

        if (type) {
            filter.type = new RegExp(type, "i"); // 'i' makes the search case-insensitive
        }

        if (status) {
            filter.status = new RegExp(status, "i");
        }

        if (createdBy) {
            filter.createdBy = new RegExp(createdBy, "i");
        }

        const accesss = await Access.find(filter);
        return res.status(200).json(accesss);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when retrieving all accesss.",
            message: err.message,
        });
    }
};

module.exports = {
    createAccess,
    deleteAccess,
    editAccess,
    getAccess,
    getAllAccesses,
};
