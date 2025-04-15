const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const AccessSchema = new Schema({
    _id: {
        type: ObjectId,
        required: true,
    },
    role: {
        type: String,
        required: true
    },
    accessCode: {
        type: String,
        required: true
    }
});

module.exports = Access = mongoose.model(
    "access",
    AccessSchema
);
