const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const CategorySchema = new Schema({
    _id: {
        type: ObjectId,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    defaultIssues: [{ type: String, required: true }],
    properties: [
        {
            type: String,
            enum: ["temperature"]
        },
    ],
    color: { type: String, required: true },
});

module.exports = Category = mongoose.model("categories", CategorySchema);
