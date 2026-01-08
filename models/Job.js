const JobSchema = new Schema({
    _id: {
        type: ObjectId,
        required: true,
    },
    equipmentId: {
        type: ObjectId,
        required: true,
    },
    userId: {
        type: ObjectId,
        required: true,
    },
    gcodeFileName: { type: String, required: true },
    status: {
        type: String,
        enum: ["queued", "sent"],
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = Job = mongoose.model("job", JobSchema);