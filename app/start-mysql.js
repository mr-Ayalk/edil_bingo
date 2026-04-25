import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// Start MySQL server
const startMySQL = () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Path to the MySQL executable
  const mysqlPath = path.join(__dirname, "mysql", "bin", "mysqld.exe");
  const dataDir = path.join(__dirname, "mysql", "data"); // MySQL data directory

  // Command to start MySQL server
  const startCommand = `"${mysqlPath}" --console --datadir="${dataDir}"`;

  // Start the MySQL server
  const mysqlProcess = exec(startCommand, (err, stdout, stderr) => {
    if (err) {
      console.error("Failed to start MySQL:", err.message);
      return;
    }
    console.log("MySQL server started successfully.");
    console.log(stdout);
    console.error(stderr);
  });

  // Ensure MySQL process is killed when the app exits
  process.on("exit", () => {
    mysqlProcess.kill(); // Kills the MySQL process when the app exits
  });

  // Handle app termination signals for proper cleanup
  process.on("SIGINT", () => {
    console.log("Received SIGINT. Stopping MySQL...");
    mysqlProcess.kill(); // Kill MySQL when the app is interrupted
    process.exit(); // Exit the app
  });

  process.on("SIGTERM", () => {
    console.log("Received SIGTERM. Stopping MySQL...");
    mysqlProcess.kill(); // Kill MySQL on termination
    process.exit(); // Exit the app
  });
};

export default startMySQL;
