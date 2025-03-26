const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const IssueSchema = new Schema({
    _id: {
        type: ObjectId,
        required: true,
    },
    equipment: {
        type: ObjectId,
        ref: "Equipment",
        required: true,
    },
    status: {
        type: String,
        enum: ["open", "in-progress", "completed"],
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
    assignedTo: [{
        type: ObjectId,
        ref: "User"
    }],
});

module.exports = Issue = mongoose.model("issue", IssueSchema);
