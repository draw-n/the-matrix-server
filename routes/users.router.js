const express = require("express");
const passport = require("passport");
const {
    createUser,
    getUser,
    getAllUsers,
    updateUser,
    deleteUser,
    getEmails,
} = require("../controllers/users.controllers.js");

const router = express.Router();

router.post("/", createUser);
router.put("/:id", updateUser);
router.get("/", getAllUsers);
router.get("/me", (req, res) => {
    if (req.isAuthenticated() && req.user) {
        // Remove password field if present
        const { password, ...userWithoutPassword } = req.user.toObject
            ? req.user.toObject()
            : req.user;
        res.json({ user: userWithoutPassword });
    } else {
        res.json({ user: null });
    }
});
router.get("/emails", getEmails);
router.get("/:id", getUser);
router.delete("/:id", deleteUser);

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
router.post("/logout", (req, res) => {
    req.logout(function (err) {
        if (err) return res.status(500).json({ message: "Logout failed" });
        req.session?.destroy(() => {
            res.clearCookie("connect.sid");
            res.json({ message: "Logged out" });
        });
    });
});
module.exports = router;
