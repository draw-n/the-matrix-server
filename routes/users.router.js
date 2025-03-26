const express = require("express");
const passport = require("passport");
const {
    createUser,
    getUser,
    getAllUsers,
    updateUser,
    deleteUser,
} = require("../controllers/users.controllers.js");

const router = express.Router();

router.post("/", createUser);
router.put("/:id", updateUser);
router.get("/", getAllUsers);
router.get("/:id", getUser);
router.delete("/:id", deleteUser);
router.post("/register", createUser);
router.post("/login", (req, res, next) => {
    passport.authenticate("local", { session: true }, (err, user, info) => {
        if (err) {
            // If there's an internal server error
            return res.status(500).json({ error: "Internal server error" });
        }

        if (!user) {
            // If the authentication fails, `user` will be null and `info` will contain the message
            return res
                .status(400)
                .json({ message: info.message || "Authentication failed" });
        }

        // If the user is authenticated, log them in
        req.login(user, (loginErr) => {
            if (loginErr) {
                return res
                    .status(500)
                    .json({ error: "Failed to login the user." });
            }

            // Convert the user to a plain object if necessary
            let plainUser = user.toObject ? user.toObject() : user;

            // Remove sensitive data like password
            delete plainUser.password;

            // Send success response with the user object (without password)
            return res
                .status(200)
                .json({ message: "Login successful", user: plainUser });
        });
    })(req, res, next); // Execute the passport strategy
});
module.exports = router;
