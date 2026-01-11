const Category = require("../models/Category.js");
const Equipment = require("../models/Equipment.js");
const Material = require("../models/Material.js");
const Issue = require("../models/Issue.js");
const crypto = require("crypto");
var randomColor = require("randomcolor");

var mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

/**
 * Creates new category and saves to MongoDB.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const createCategory = async (req, res) => {
    const { name, defaultIssues, properties, color } = req.body;

    try {
        if (name) {
            let category = new Category({
                _id: new ObjectId(),
                uuid: crypto.randomUUID(),
                name,
                defaultIssues,
                properties,
                color: color || randomColor(),
            });
            await category.save();
            return res.status(200).json(category);
        } else {
            return res
                .status(400)
                .send({ message: "Missing at least one required field." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when creating new category.",
            error: err.message,
        });
    }
};

/**
 * Deletes a dategory from MongoDB
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const deleteCategory = async (req, res) => {
    const uuid = req.params?.uuid;

    try {
        if (uuid) {
            const category = await Category.findOneAndDelete({ uuid });
            if (!category) {
                return res.status(404).send({ message: "Category not found." });
            }

            const matchingEquipment = await Equipment.find({ categoryId: uuid });
            const equipment = await Equipment.deleteMany({ categoryId: uuid });
            if (equipment.deletedCount > 0) {
                const idsToDelete = matchingEquipment.map(
                    (equipment) => equipment.uuid
                );
                const issues = await Issue.deleteMany({
                    equipmentId: { $in: idsToDelete },
                });
            }
            const material = await Material.deleteMany({ categoryId: uuid });

            return res
                .status(200)
                .json({ message: "Successfully deleted category." });
        } else {
            return res.status(400).send({ message: "Missing Category UUID." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error with deleting category.",
            error: err.message,
        });
    }
};

/**
 * Updates a category from MongoDB
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const editCategory = async (req, res) => {
    const uuid = req.params?.uuid;

    try {
        if (uuid) {
            const category = await Category.findOneAndUpdate({ uuid }, req.body, { new: true, projection: { _id: 0 } });
            if (!category) {
                return res.status(404).send({ message: "Category not found." });
            }

            return res.status(200).json(category);
        } else {
            return res.status(400).send({ message: "Missing Category UUID." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when updating category.",
            error: err.message,
        });
    }
};

/**
 * Retrieves a category from MongoDB based on uuid.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const getCategory = async (req, res) => {
    const uuid = req.params?.uuid;

    try {
        if (uuid) {
            const category = await Category.findOne({ uuid }, { projection: { _id: 0 } });
            if (!category) {
                return res.status(404).send({ message: "Category not found." });
            }
            return res.status(200).json(category);
        } else {
            return res.status(400).send({ message: "Missing Category UUID." });
        }
    } catch (err) {
        console.error(err.message);
        return res
            .status(500)
            .send({ message: "Error retrieving category", error: err.message });
    }
};

/**
 * Gets all categories from MongoDB based on filters.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find({}, { projection: { _id: 0 } });
        return res.status(200).json(categories);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error with retrieving categories.",
            error: err.message,
        });
    }
};

module.exports = {
    createCategory,
    deleteCategory,
    editCategory,
    getCategory,
    getAllCategories,
};
