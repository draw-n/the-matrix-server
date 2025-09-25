const cors = require("cors");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const MongoStore = require("connect-mongo");
require("dotenv").config();
require("./config/passport.js");

const connectDB = require("./config/database.js");
connectDB();

const PORT = process.env.PORT || 3001;

const app = express();

app.use(express.json({ limit: '300mb' }));
app.use(express.urlencoded({ extended: true, limit: '300mb' }));


// CORS setup (adjust origin as needed)
app.use(
    cors({
        origin: process.env.FRONT_END_ORIGIN, // Change to your frontend URL if needed
        credentials: true,
    })
);

app.use(
    session({
        secret: process.env.SESSION_SECRET || "your secret key",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
        cookie: {
            httpOnly: true,
            secure: false, // set to true if using HTTPS
            sameSite: "lax", // or "none" if using HTTPS and cross-site
            maxAge: 1000 * 60 * 60 * 24, // 1 day
        },
    })
);

app.use(passport.initialize());
app.use(passport.session()); // persistent login session

app.use("/jobs", require("./routes/jobs.router.js"));
app.use("/issues", require("./routes/issues.router.js"));
app.use("/announcements", require("./routes/announcements.router.js"));
app.use("/users", require("./routes/users.router.js"));
app.use("/equipment", require("./routes/equipment.router.js"));
app.use("/materials", require("./routes/materials.router.js"));
app.use("/categories", require("./routes/categories.router.js"));
app.use("/accesses", require("./routes/access.router.js"));

app.get("/", (req, res) => {
    res.send("API running");
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
