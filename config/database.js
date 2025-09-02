const mongoose = require("mongoose");
const dotenv = require("dotenv").config();

const connectDB = async () => {
    try {
        mongoose.connect(process.env.MONGO_URI);
        console.log("Successfully connected to MongoDB.");
    } catch (err) {
        console.error(err.message);
    }
};

module.exports = connectDB;
