const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const AnnouncementSchema = new Schema({
    _id: {
        type: ObjectId,
        required: true,
    },
    title: {
        type: String,
    },
    type: {
        type: String,
        required: true,
        enum: ["event", "classes", "other"],
    },
    status: {
        type: String,
        enum: ["scheduled", "posted"],
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    createdBy: {
        type: ObjectId,
        ref: "User",
        required: true,
    },
    dateCreated: {
        type: Date,
        required: true,
    },
    lastUpdatedBy: {
        type: ObjectId,
        ref: "User",
        required: true,
    },
    dateLastUpdated: {
        type: Date,
        required: true,
    },
});

module.exports = Announcement = mongoose.model(
    "announcement",
    AnnouncementSchema
);
