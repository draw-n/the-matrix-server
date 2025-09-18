const mongoose = require("mongoose");
const dotenv = require("dotenv").config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Successfully connected to MongoDB.");
        return mongoose.connection;
    } catch (err) {
        console.error(err.message);
    }
};

module.exports = connectDB;
