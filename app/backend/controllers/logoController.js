// controllers/logoController.js
const { pool } = require("../db/config");

// Controller to get the current logo URLs (both dark and light logos)
const getLogo = (req, res) => {
  pool.query(
    "SELECT dark_logo, light_logo, uploaded_at FROM logos ORDER BY uploaded_at DESC LIMIT 1",
    (error, rows) => {
      if (error) {
        console.error("Error fetching logos:", error.message); // Log the error message
        return res
          .status(500)
          .json({ message: "Internal server error", error: error.message }); // Respond with error
      }

      if (rows.length > 0) {
        return res.status(200).json({
          darkLogoUrl: rows[0].dark_logo,
          lightLogoUrl: rows[0].light_logo,
          uploadedAt: rows[0].uploaded_at,
        });
      } else {
        return res.status(404).json({ message: "No logos found" });
      }
    }
  );
};

module.exports = { getLogo };
