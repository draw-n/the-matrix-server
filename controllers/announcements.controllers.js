const Announcement = require("../models/Announcement.js");
const mongoose = require("mongoose");

/**
 * Creates new announcement and saves to MongoDB.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const createAnnouncement = async (req, res) => {
    const { type, description, createdBy, dateCreated, status, title } =
        req.body;

    try {
        if (type && description && createdBy && dateCreated) {
            let announcement = new Announcement({
                _id: new mongoose.Types.ObjectId(),
                type,
                status,
                title,
                description,
                createdBy,
                dateCreated,
                lastUpdatedBy: createdBy,
                dateLastUpdated: dateCreated,
            });

            await announcement.save();

            return res.status(200).json(announcement);
        } else {
            return res
                .status(400)
                .send({ message: "Missing at least one required field." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when creating new announcement.",
            error: err.message,
        });
    }
};

/**
 * Deletes an announcement from MongoDB
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const deleteAnnouncement = async (req, res) => {
    const id = req.params?.id;

    try {
        if (id) {
            const announcement = await Announcement.findByIdAndDelete(id);
            if (!announcement) {
                return res
                    .status(404)
                    .send({ message: "Announcement not found." });
            }

            return res
                .status(200)
                .send({ message: "Successfully deleted announcement." });
        } else {
            return res
                .status(400)
                .send({ message: "Missing Announcement ID." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when deleting announcement.",
            error: err.message,
        });
    }
};

/**
 * Updates an announcement from MongoDB
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const editAnnouncement = async (req, res) => {
    const id = req.params?.id;
    try {
        if (id) {
            const announcement = await Announcement.findByIdAndUpdate(id, req.body);

            if (!announcement) {
                return res
                    .status(404)
                    .send({ message: "Announcement not found." });
            }

            return res.status(200).json(announcement);
        } else {
            return res.status(400).send({ message: "Missing Announcement ID." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when updating announcement.",
            error: err.message,
        });
    }
};

/**
 * Retrieves an announcement from MongoDB based on id.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const getAnnouncement = async (req, res) => {
    const id = req.params?.id;
    try {
        if (id) {
            const announcement = await Announcement.findById(id);
            if (!announcement) {
                return res
                    .status(404)
                    .send({ message: "Announcement not found." });
            }
            return res.status(200).json(announcement);
        } else {
            return res
                .status(400)
                .send({ message: "Missing Announcement ID." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when retrieving announcement.",
            error: err.message,
        });
    }
};

/**
 * Gets all announcements based off a filter
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const getAllAnnouncements = async (req, res) => {
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

        const announcements = await Announcement.find(filter);
        return res.status(200).json(announcements);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when retrieving all announcements.",
            message: err.message,
        });
    }
};

module.exports = {
    createAnnouncement,
    deleteAnnouncement,
    editAnnouncement,
    getAnnouncement,
    getAllAnnouncements,
};
