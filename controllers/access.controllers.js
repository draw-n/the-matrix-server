const Access = require("../models/Access.js");
const mongoose = require("mongoose");

/**
 * Creates new access and saves to MongoDB.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const createAccess = async (req, res) => {
    const { role, accessCode } = req.body;

    try {
        if (role && accessCode) {
            let access = new Access({
                _id: new mongoose.Types.ObjectId(),
                role,
                accessCode,
            });

            await access.save();

            const accessObj = access.toObject();

            delete accessObj._id;

            return res.status(200).json(accessObj);
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
 * Updates an access from MongoDB
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const editAccess = async (req, res) => {
    const role = req.params?.role;
    try {
        if (role) {
            const access = await Access.findOneAndUpdate({ role }, req.body);

            if (!access) {
                return res.status(404).send({ message: "Access not found." });
            }

            const accessObj = access.toObject();

            delete accessObj._id;

            return res.status(200).json(accessObj);
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
    const role = req.params?.role;
    try {
        if (role) {
            const access = await Access.findOne(
                { role },
                { projection: { _id: 0 } }
            );
            if (!access) {
                return res.status(404).send({ message: "Access not found." });
            }
            return res.status(200).json(access);
        } else {
            return res.status(400).send({ message: "Missing Access ID." });
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
    try {
        const access = await Access.find({}, { projection: { _id: 0 } });
        return res.status(200).json(access);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when retrieving all accesses.",
            message: err.message,
        });
    }
};

module.exports = {
    createAccess,
    editAccess,
    getAccess,
    getAllAccesses,
};
