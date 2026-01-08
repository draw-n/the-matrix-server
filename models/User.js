const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

const UserSchema = new Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    access: {
        type: String,
        require: true,
        enum: ["novice", "proficient", "expert", "moderator", "admin"],
        /* 
            novice = never taken rapid prototyping
            proficient = taken rapid prototyping and maybe a few projects
            expert = "superuser", allowed certain permissions
            moderator = has edit access to issues and other things
            admin = edit access to everything, including user roles
        */
    },
    status: {
        type: String,
        require: true,
        enum: ["undergraduate", "graduate", "faculty"],
        /*
            undergraduate - have a graduation date, when reached need to remove
            graduate - have graduation date, when reached need to remove
            faculty - never deleted unless manually
        */
    },
    graduationDate: {
        type: Date,
    },
    departments: {
        type: [String], // if faculty, department, if student, major(s) and minors
    },
    remotePrints: [
        {
            date: {
                type: Date,
            },
            fileName: {
                type: String,
            },
        },
    ],
});

UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};
UserSchema.methods.setPassword = async function (newPassword) {
    this.password = newPassword;
};

module.exports = User = mongoose.model("user", UserSchema);
