const Material = require("../models/Material.js");
var mongoose = require("mongoose");
const { ObjectId } = mongoose.Types; // Import ObjectId

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
                name,
                shortName,
                category,
                description,
                properties,
                remotePrintAvailable,
            });
            await material.save();
            return res.status(200).json(material);
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
    const id = req.params?.id;

    try {
        if (id) {
            const material = await Material.findByIdAndDelete(id);
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
 * Updates an issue from MongoDB
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const editMaterial = async (req, res) => {
    const id = req.params?.id;

    try {
        if (id) {
            const material = await Material.findByIdAndUpdate(id, req.body);

            if (!material) {
                return res.status(404).send({ message: "Material not found." });
            }

            return res.status(200).json(material);
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
    const id = req.params?.id;

    try {
        if (id) {
            const material = await Material.findById(id);
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
    const { remotePrintAvailable, category } = req.query;
    try {
        let filter = {};

        if (remotePrintAvailable) {
            filter.remotePrintAvailable =
                remotePrintAvailable.toLowerCase() === "true";
        }

        if (category) {
            if (ObjectId.isValid(category)) {
                filter.category = ObjectId.createFromHexString(category); // Convert to ObjectId
            } else {
                filter.category = category; // It's a string, use it as is
            }
        }

        const material = await Material.find(filter);
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
