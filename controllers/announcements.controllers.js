const Announcement = require("../models/Announcement.js");
const mongoose = require("mongoose");
const crypto = require("crypto");

/**
 * Creates new announcement and saves to MongoDB.
 * @param {*} req - announcement details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const createAnnouncement = async (req, res) => {
    const { type, description, createdBy, dateCreated, status, title } =
        req.body;
    
    try {
        if (type && description && createdBy && dateCreated && status) {
            let announcement = new Announcement({
                _id: new mongoose.Types.ObjectId(),
                uuid: crypto.randomUUID(),
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

            const announcementObj = announcement.toObject();

            delete announcementObj._id;

            return res.status(200).json(announcementObj);
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
 * @param {*} req - announcement details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const deleteAnnouncementById = async (req, res) => {
    const uuid = req.params?.uuid;

    try {
        if (uuid) {
            const announcement = await Announcement.findOneAndDelete({ uuid }, { projection: { _id: 0 } });
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
                .send({ message: "Missing Announcement UUID." });
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
const editAnnouncementById = async (req, res) => {
    const uuid = req.params?.uuid;
    try {
        if (uuid) {
            const announcement = await Announcement.findOneAndUpdate(
                { uuid },
                req.body, { new: true, projection: { _id: 0 } }
            );

            if (!announcement) {
                return res
                    .status(404)
                    .send({ message: "Announcement not found." });
            }

            return res.status(200).json(announcement);
        } else {
            return res
                .status(400)
                .send({ message: "Missing Announcement UUID." });
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
const getAnnouncementById = async (req, res) => {
    const uuid = req.params?.uuid;
    try {
        if (uuid) {
            const announcement = await Announcement.findOne({ uuid }, { projection: { _id: 0 } });
            if (!announcement) {
                return res
                    .status(404)
                    .send({ message: "Announcement not found." });
            }
            return res.status(200).json(announcement);
        } else {
            return res
                .status(400)
                .send({ message: "Missing Announcement UUID." });
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

        const announcements = await Announcement.find(filter, { projection: { _id: 0 } }).sort({ date: 1 });
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
    deleteAnnouncementById,
    editAnnouncementById,
    getAnnouncementById,
    getAllAnnouncements,
};
