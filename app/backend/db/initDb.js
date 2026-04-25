const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");

// Create a connection without specifying the database
const connection = mysql.createConnection({
  host: "localhost",
  user: "root", // Replace with your MySQL username
  password: "", // Replace with your MySQL password
});

// Read schema file
const schema = fs.readFileSync(
  path.join(__dirname, "./bingo-game.sql"),
  "utf-8"
);

// Create the database if it doesn't exist
connection.query("CREATE DATABASE IF NOT EXISTS bingo_game;", (err) => {
  if (err) {
    console.error("Error creating database:", err.message);
    process.exit(1);
  }
  console.log("Database created or already exists.");

  // Switch to the database
  connection.query("USE bingo_game;", (err) => {
    if (err) {
      console.error("Error using database 'bingo_game':", err.message);
      process.exit(1);
    }
    console.log("Using database 'bingo_game'.");

    // Apply the schema
    connection.query(schema, (err) => {
      if (err) {
        console.error("Error applying schema:", err.message);
      } else {
        console.log("Schema applied successfully.");
      }
      connection.end();
    });
  });
});
