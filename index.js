const express = require("express");
const session = require("express-session");
const cors = require("cors");
const passport = require("passport");

const connectDB = require("./config/database.js");

const PORT = process.env.PORT || 3001;

const app = express();
require("./config/passport.js");

app.use(
    cors({
        origin: process.env.FRONT_END_ORIGIN,
        credentials: true,
    })
);

app.use(
    session({
        secret: "idk",
        resave: false,
        saveUninitialized: false,
        cookie: { secure: true },
        maxAge: null,
    })
);

app.use(passport.initialize());
app.use(passport.session()); //persistent login session
app.use(express.json());

connectDB();


app.use("/jobs", require("./routes/jobs.router.js"));
app.use("/issues", require("./routes/issues.router.js"));
app.use("/announcements", require("./routes/announcements.router.js"));
app.use("/users", require("./routes/users.router.js"));
app.use("/equipment", require("./routes/equipment.router.js"));
app.use("/materials", require("./routes/materials.router.js"));
app.use("/categories", require("./routes/categories.router.js"));
app.use("/accesses", require("./routes/access.router.js"));

app.get("/", (req, res) => {
    res.send(process.env.ATLAS_URI);
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
