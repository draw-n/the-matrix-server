const User = require("../models/User.js");
const Access = require("../models/Access.js");
/**
 * Creates a new user, likely at sign in
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const createUser = async (req, res) => {
    const { firstName, lastName, email, password, accessCode } = req.body;

    try {
        let user = await User.findOne({ email: new RegExp(email, "i") });
        if (user) {
            return res.status(400).json({ message: "User already exists." });
        }

        let access = "novice";

        if (accessCode == process.env.ACCESS_CODE) {
            access = "admin";
        } else {
            const accessResult = await Access.findOne({
                accessCode: accessCode,
            });

            if (!accessResult) {
                return res
                    .status(400)
                    .send({ message: "Access code incorrect." });
            }

            access = accessResult.role;
        }
        user = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password,
            access,
        });

        await user.save();

        return res
            .status(200)
            .json({ message: "User registered successfully." });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send({
            message: "Error with registering new user",
            error: err.message,
        });
    }
};

/**
 * Deletes a user from MongoDB.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const deleteUser = async (req, res) => {
    const id = req.params?.id;

    try {
        if (id) {
            const user = await User.findByIdAndDelete(id);
            if (!user) {
                return res.status(404).send({ message: "User not found." });
            }

            return res
                .status(200)
                .json({ message: "Successfully deleted user." });
        } else {
            return res.status(400).send({ message: "Missing User ID." });
        }
    } catch (err) {
        console.error(err.message);
        return res
            .status(500)
            .send({ message: "Error when deleting user.", error: err.message });
    }
};

/**
 * Updates a user in MongoDB.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const updateUser = async (req, res) => {
    const id = req.params?.id;
    try {
        if (id) {
            const user = await User.findByIdAndUpdate(id, req.body);
            if (!user) {
                return res.status(404).send({ message: "User not found." });
            }

            return res.status(200).json(user);
        } else {
            return res.status(400).send({ message: "Missing User ID." });
        }
    } catch (err) {
        console.error(err.message);
        return res
            .status(500)
            .send({ message: "Error when updating user.", error: err.message });
    }
};

/**
 * Retrieves a user from MongoDB based on id.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const getUser = async (req, res) => {
    const id = req.params?.id;

    try {
        if (id) {
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).send("User not found.");
            }

            return res.status(200).json({ user });
        } else {
            return res.status(400).send({ message: "Missing User ID." });
        }
    } catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).send({
            message: "Error when retrieving user.",
            error: err.message,
        });
    }
};

/**
 * Gets all issues from MongoDB based on filters.
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const getAllUsers = async (req, res) => {
    const { access } = req.query;
    try {
        let filter = {};
        if (access) {
            filter.access = new RegExp(access, "i");
        }
        const user = await User.find(filter).sort({ firstName: 1 });
        return res.status(200).json(user);
    } catch (err) {
        return res.status(500).send({ message: err.message });
    }
};

/**
 * retrieves all user emails from MongoDB
 * @param {*} req - request details
 * @param {*} res - response details
 * @returns - response details (with status)
 */
const getEmails = async (req, res) => {
    try {
        const users = await User.find();

        const emails = users.map(user => user.email).join(',');

        res.setHeader('Content-Disposition', 'attachment; filename="emails.txt"');
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(emails);
    } catch (err) {
        return res.status(500).send({ message: err.message });
    }
};

module.exports = {
    createUser,
    deleteUser,
    updateUser,
    getUser,
    getAllUsers,
    getEmails,
};
