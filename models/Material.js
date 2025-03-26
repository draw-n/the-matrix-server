const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const MaterialSchema = new Schema({
    _id: {
        type: ObjectId,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    shortName: {
        type: String,
        required: true,
    },
    category: {
        type: ObjectId,
        required: true,
        ref: "Category"
    },
    properties: {
        type: [{ type: String }],
    },
    description: {
        type: String,
    },
    remotePrintAvailable: {
        type: Boolean,
        required: true,
    },
    temperatures: {
        extruder: {
            firstLayer: { type: Number },
            otherLayers: { type: Number },
        },
        bed: {
            firstLayer: { type: Number },
            otherLayers: { type: Number },
        },
    },
    //image: {
    //TODO: revisit adding an image feature to mongodb
    //}
});

module.exports = Material = mongoose.model("material", MaterialSchema);
