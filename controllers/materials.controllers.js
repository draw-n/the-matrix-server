const Material = require("../models/Material.js");
var mongoose = require("mongoose");
const { ObjectId } = mongoose.Types; // Import ObjectId

const crypto = require("crypto");
/**
 * Creates new material and saves to MongoDB.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const createMaterial = async (req, res) => {
    const {
        name,
        shortName,
        category,
        properties,
        description,
        remotePrintAvailable,
    } = req.body;

    try {
        if (
            name &&
            shortName &&
            category &&
            properties &&
            description &&
            remotePrintAvailable != null
        ) {
            let material = new Material({
                _id: new ObjectId(),
                uuid: crypto.randomUUID(),
                name,
                shortName,
                category,
                description,
                properties,
                remotePrintAvailable,
            });
            await material.save();

            const materialObj = material.toObject();

            delete materialObj._id;
            return res.status(200).json(materialObj);
        } else {
            return res
                .status(400)
                .send({ message: "Missing at least one required field." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when creating new material.",
            error: err.message,
        });
    }
};

/**
 * Deletes a material from MongoDB
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const deleteMaterial = async (req, res) => {
    const uuid = req.params?.uuid;

    try {
        if (uuid) {
            const material = await Material.findOneAndDelete({ uuid: uuid });
            if (!material) {
                return res.status(404).send({ message: "Material not found." });
            }
            return res
                .status(200)
                .json({ message: "Successfully deleted material." });
        } else {
            return res.status(400).send({ message: "Missing Material ID" });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when deleting material.",
            error: err.message,
        });
    }
};

/**
 * Updates a material from MongoDB
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const editMaterial = async (req, res) => {
    const uuid = req.params?.uuid;

    try {
        if (uuid) {
            const material = await Material.findOneAndUpdate(
                { uuid: uuid },
                req.body
            );
            if (!material) {
                return res.status(404).send({ message: "Material not found." });
            }

            const materialObj = material.toObject();
            delete materialObj._id;
            return res.status(200).json(materialObj);
        } else {
            return res.status(400).send({ message: "Missing Material ID" });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when updating material.",
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
const getMaterial = async (req, res) => {
    const uuid = req.params?.uuid;

    try {
        if (uuid) {
            const material = await Material.findOne({ uuid: uuid }, { projection: { _id: 0 } });
            if (!material) {
                return res.status(404).send({ message: "Material not found." });
            }
            return res.status(200).json(material);
        } else {
            return res.status(400).send({ message: "Missing Material ID." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when retrieving material.",
            error: err.message,
        });
    }
};

/**
 * Gets all materials from MongoDB based on filters.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const getAllMaterials = async (req, res) => {
    const { remotePrintAvailable, categoryId } = req.query;
    try {
        let filter = {};

        if (remotePrintAvailable) {
            filter.remotePrintAvailable =
                remotePrintAvailable.toLowerCase() === "true";
        }

        if (categoryId) {
            filter.categoryId = categoryId; // It's a string, use it as is
        }

        const material = await Material.find(filter, { projection: { _id: 0 } }).sort({ categoryId: 1 });
        return res.status(200).json(material);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when retrieving all materials.",
            error: err.message,
        });
    }
};

module.exports = {
    createMaterial,
    deleteMaterial,
    editMaterial,
    getMaterial,
    getAllMaterials,
};
