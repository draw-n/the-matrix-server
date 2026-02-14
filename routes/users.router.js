const express = require("express");
const passport = require("passport");
const {
    createUser,
    getUserById,
    getAllUsers,
    updateUserById,
    deleteUserById,
    getEmails,
    firstTimeSetup,
    changePassword,
} = require("../controllers/users.controllers.js");

const { ensureAuthenticated } = require("../middleware/auth.js");
const { retrieveDepartments } = require("../utils/department.utils.js");

const router = express.Router();

router.post("/", createUser);
router.put("/first-time", ensureAuthenticated, firstTimeSetup);
router.put("/change-password", ensureAuthenticated, changePassword);
router.put("/:uuid", ensureAuthenticated, updateUserById);
router.get("/", ensureAuthenticated, getAllUsers);
router.get("/departments", ensureAuthenticated, retrieveDepartments);
router.get("/me", (req, res) => {
    if (req.isAuthenticated() && req.user) {
        const { password, ...userWithoutPassword } = req.user.toObject
            ? req.user.toObject()
            : req.user;
        return res.status(200).json({ user: userWithoutPassword });
    } else {
        return res.status(401).json({ user: null });
    }
});
router.get("/emails", ensureAuthenticated, getEmails);
router.get("/:uuid", ensureAuthenticated, getUserById);
router.delete("/:uuid", ensureAuthenticated, deleteUserById);

router.post("/register", createUser);
router.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);
        if (!user)
            return res
                .status(401)
                .json({ user: null, message: info?.message || "Login failed" });
        req.logIn(user, (err) => {
            if (err) return next(err);
            // Remove password field if present
            const { password, ...userWithoutPassword } = user.toObject
                ? user.toObject()
                : user;
            return res.json({ user: userWithoutPassword });
        });
    })(req, res, next);
});
router.post("/logout", ensureAuthenticated, (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ message: "Logout failed" });
        req.session?.destroy(() => {
            res.clearCookie("connect.sid");
            return res.status(200).json({ message: "Logged out" });
        });
    });
});
module.exports = router;
