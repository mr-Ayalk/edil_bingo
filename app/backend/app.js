const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const { pool } = require("./db/config");
const gameRoutes = require("./routes/gameRoutes");
const agentRoutes = require("./routes/agentRoutes");
const superAdminRoutes = require("./routes/superAdminRoutes");
const superAgentRoutes = require("./routes/superAgentRoutes");
const logoRoutes = require("./routes/logoRoutes");

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://game3.minchbingo.com",
      "https://game.minchbingo.com",
    ], // Add any domains that need access here
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(bodyParser.json());

// Set up storage for the logo
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "https://game3.minchbingo.com/"); // Folder where logos will be saved
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo${ext}`); // Filename for the logo (e.g., logo.png)
  },
});

const upload = multer({ storage: logoStorage });

// Serve static files (logos) from the "public" folder
app.use(express.static("public"));

// Route for handling logo upload
app.post("/api/admins/change-logo", upload.single("logo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No logo file uploaded" });
  }

  // Construct the path to the uploaded logo
  const logoPath = `https://game3.minchbingo.com/${req.file.filename}`; // Path to the logo file
  return res.status(200).json({ logoPath });
});

// Routes
app.use("/api/games", gameRoutes);
app.use("/api", agentRoutes);
app.use("/api", superAdminRoutes);
app.use("/api", superAgentRoutes);
app.use("/api", logoRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
