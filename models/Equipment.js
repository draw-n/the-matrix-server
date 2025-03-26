const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const EquipmentSchema = new Schema({
    _id: {
        type: ObjectId,
        required: true,
    },
    name: { type: String, required: true },
    routePath: { type: String, required: true },
    headline: { type: String },
    category: {
        type: ObjectId,
        required: true,
        ref: "Category",
    },
    properties: {
        nozzle: { type: Number },
        materials: [{ type: String }],
    },
    status: {
        type: String,
        enum: ["available", "paused", "busy", "error", "offline"],
        required: true,
    },
    /*
        available - printer is working as intended and no one is printing with it
        paused - printer is working as intended but it's paused currently
        busy - printer is working as intended and it is printing something
        error - printer has a reported issue or is being fixed - won't allow prints on this
        offline - printer is completely offline (can't find in the network) - won't allow prints on this
    */

    description: {
        type: String,
        required: true,
    },
    avatarImage: {
        type: ObjectId,
        ref: "File",
    },
});

module.exports = Equipment = mongoose.model("equipment", EquipmentSchema);
