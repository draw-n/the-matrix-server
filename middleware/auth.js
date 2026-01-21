const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
};

const ensureAccess = (accesses) => {
    return (req, res, next) => {
        if (
            req.isAuthenticated() &&
            req.user &&
            accesses.includes(req.user.access)
        ) {
            return next();
        }
        return res.status(403).json({ message: "Forbidden" });
    };
};

module.exports = {
    ensureAuthenticated,
    ensureAccess,
};