const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// Set the path to the writable directory
const dbPath = path.join(
  process.env.APPDATA || process.env.HOME,
  "bingo-game",
  "bingo-game.db"
);

// Ensure the directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Check if the database exists; if not, copy it from a default location
if (!fs.existsSync(dbPath)) {
  const defaultDbPath = path.resolve(__dirname, "..", "bingo-game.db");
  fs.copyFileSync(defaultDbPath, dbPath);
  console.log("Database copied to:", dbPath);
}

// Initialize SQLite database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error connecting to SQLite database:", err.message);
  } else {
    console.log("Connected to SQLite database at:", dbPath);
  }
});

module.exports = { db };
