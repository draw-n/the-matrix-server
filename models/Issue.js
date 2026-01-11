const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const IssueSchema = new Schema({
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
        ref: "Equipment",
        required: true,
    },
    status: {
        type: String,
        enum: ["open", "in-progress", "completed"],
        required: true,
    },
    initialDescription: {
        type: String,
    },
    description: {
        type: String,
        required: true,
    },
    createdBy: {
        type: String,
        ref: "User",
        required: true,
    },
    dateCreated: {
        type: Date,
        required: true,
    },
    assignedTo: [
        {
            type: String,
            ref: "User",
        },
    ],
});

module.exports = Issue = mongoose.model("issues", IssueSchema);
