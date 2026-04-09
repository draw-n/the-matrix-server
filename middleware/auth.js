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

const ensureInternalRequest = (req, res, next) => {
    const secret = req.headers["x-internal-key"];

    if (!secret || secret !== process.env.PI_SECRET_KEY) {
        console.warn(`Blocked unauthorized request to /internal`);
        return res.status(403).json({ message: "Forbidden" });
    }

    return next();
};

module.exports = {
    ensureAuthenticated,
    ensureAccess,
    ensureInternalRequest
};