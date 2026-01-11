const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const JobSchema = new Schema({
    _id: {
        type: ObjectId,
        required: true,
    },
    uuid: {
        type: String,
        required: true,
        unique: true,
    },
    equipmentId: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    gcodeFileName: { type: String, required: true },
    status: {
        type: String,
        enum: ["queued", "sent"],
        required: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = Job = mongoose.model("jobs", JobSchema);