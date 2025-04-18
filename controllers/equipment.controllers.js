const Equipment = require("../models/Equipment.js");
const Issue = require("../models/Issue.js");
var axios = require("axios");
var mongoose = require("mongoose");
const { ObjectId } = mongoose.Types; // Import ObjectId

/**
 * Creates new equipment and saves to MongoDB.
 * @param {*} req - request details
 * @param {*} res - respones details
 * @returns - response details (with status)
 */
const createEquipment = async (req, res) => {
    const { name, category, description, routePath } = req.body;

    try {
        if (name && category && description && routePath) {
            let equipment = new Equipment({
                _id: new ObjectId(),
                name,
                category: ObjectId.createFromHexString(category),
                routePath,
                description,
                status: "available",
            });
            await equipment.save();

            return res.status(200).json(equipment);
        } else {
            return res
                .status(400)
                .send({ message: "Missing at least one required field." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when creating new equipment.",
            error: err.message,
        });
    }
};

/**
 * Deletes an equipment from MongoDB.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const deleteEquipment = async (req, res) => {
    const id = req.params?.id;

    try {
        if (id) {
            const equipment = await Equipment.findByIdAndDelete(id);
            if (!equipment) {
                return res
                    .status(404)
                    .send({ message: "Equipment not found." });
            }
            const issues = await Issue.deleteMany({ equipment: id });
            return res
                .status(200)
                .send({ message: "Successfully deleted equipment." });
        } else {
            return res.status(400).send({ message: "Missing Equipment ID" });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when deleting equipment.",
            error: err.message,
        });
    }
};

/**
 * Updates an equipment from MongoDB
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const editEquipment = async (req, res) => {
    const id = req.params?.id;

    try {
        if (id) {
            const equipment = await Equipment.findByIdAndUpdate(id, req.body);

            if (!equipment) {
                return res
                    .status(404)
                    .json({ message: "Equipment not found." });
            }

            return res.status(200).json(equipment);
        } else {
            return res.status(400).send({ message: "Missing Equipment ID." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when updating equipment.",
            error: err.message,
        });
    }
};

/**
 * Update equipment status based on retrieval
 * @param {*} req - request object
 * @param {*} res - response object
 * @returns - response object (with status)
 */
const updateStatus = async (req, res) => {
    const id = req.params?.id;

    try {
        if (id) {
            let equipment = await Equipment.findById(id);
            if (!equipment) {
                return res
                    .status(404)
                    .json({ message: "Equipment not found." });
            }

            if (equipment.ipUrl) {
                await axios.get(`http://${equipment.ipUrl}/rr_connect?password=`);
                const statusResponse = await axios.get(
                    `http://${equipment.ipUrl}/rr_model?key=state.status`
                );
                const result = statusResponse.data.result;
                let finalStatus = "offline";

                switch (result) {
                    case "disconnected":
                    case "off":
                        finalStatus = "offline"
                        break;
                    case "pausing":
                    case "paused":
                        finalStatus = "paused";
                    case "busy":
                    case "cancelling":
                    case "resuming":
                    case "updating":
                    case "starting":
                    case "simulating":
                    case "changingTool":
                    case "processing":
                        finalStatus = "busy"
                        break;
                    case "halted":
                        finalStatus = "error"
                        break;
                    case "idle":
                        finalStatus = "available"
                    default:
                        break;
                }

                equipment = await Equipment.findByIdAndUpdate(id, {
                    status: finalStatus
                });
            }
            return res.status(200).json(equipment);
        } else {
            return res.status(400).send({ message: "Missing Equipment ID." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when updating equipment.",
            error: err.message,
        });
    }
};

/**
 * Retrieves an equipment from MongoDB based on id.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const getEquipment = async (req, res) => {
    const id = req.params?.id;

    try {
        if (id) {
            const equipment = await Equipment.findById(id);
            if (!equipment) {
                return res
                    .status(404)
                    .send({ message: "Equipment not found." });
            }
            return res.status(200).json(equipment);
        } else {
            return res.status(400).send({ message: "Missing Equipment ID." });
        }
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when retrieving equipment.",
            error: err.message,
        });
    }
};

/**
 * Gets all equipment based off a filter
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - respones details (with status)
 */
const getAllEquipment = async (req, res) => {
    const { category } = req.query;
    try {
        let filter = {};
        if (category) {
            if (ObjectId.isValid(category)) {
                filter.category = ObjectId.createFromHexString(category); // Convert to ObjectId
            } else {
                filter.category = category; // It's a string, use it as is
            }
        }
        const equipments = await Equipment.find(filter).sort({ name: 1 });
        return res.status(200).json(equipments);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error when retrieving all equipment.",
            message: err.message,
        });
    }
};

module.exports = {
    createEquipment,
    deleteEquipment,
    editEquipment,
    getEquipment,
    getAllEquipment,
    updateStatus,
};
