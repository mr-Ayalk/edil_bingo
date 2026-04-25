const express = require("express");
const { getLogo } = require("../controllers/logoController");
const router = express.Router();

// Enable CORS for this route (specific route-level CORS handling)
const cors = require("cors");

router.get("/logo", cors(), getLogo); // Get the latest logo

module.exports = router;
