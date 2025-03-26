const express = require("express");
const session = require("express-session");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
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

//configuration for passport
app.use(
    session({
        secret: process.env.SESSION_KEY,
        resave: false,
        saveUninitialized: false,
        cookie: { secure: true },
        maxAge: null,
    })
); //session secret
app.use(passport.initialize());
app.use(passport.session()); //persistent login session
app.use(express.json());

connectDB();

/*const allowedOrigins = ["https://localhost", "https://df-updates.vercel.app"];

const corsOptions = {
    origin: (origin, callback) => {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true); // Allow the origin
        } else {
            callback(new Error("Not allowed by CORS")); // Reject the origin
        }
    },
    optionsSuccessStatus: 200, // For legacy browser support
};*/

var storage = multer.diskStorage({
    // destination: function (req, file, cb) { //keep hidden in production for now, don't want files constantly getting stored lol
    //   console.log(file);

    // cb(null, path.join(__dirname, "/uploads/"));
    // },
    filename: function (req, file, cb) {
        cb(
            null,
            file.fieldname + "-" + Date.now() + path.extname(file.originalname)
        );
    },
    fileFilter: function (req, file, callback) {
        console.log(file.originalname);
        var ext = path.extname(file.originalname);
        if (ext !== ".3mf" && ext !== ".stl") {
            return callback(new Error("Only models are allowed"));
        }
        callback(null, true);
    },
});
const upload = multer({ storage: storage });
const fileUpload = upload.fields([{ name: "file", maxCount: 1 }]);

app.post("/upload", fileUpload, (req, res) => {
    res.json({ message: "Model successfully uploaded!" });
});

app.use("/issues", require("./routes/issues.router.js"));
app.use("/announcements", require("./routes/announcements.router.js"));
app.use("/users", require("./routes/users.router.js"));
app.use("/equipment", require("./routes/equipment.router.js"));
app.use("/materials", require("./routes/materials.router.js"));
app.use("/categories", require("./routes/categories.router.js"));

app.get("/", (req, res) => {
    res.send("Ello :D");
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
