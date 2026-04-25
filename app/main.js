// import { app, BrowserWindow } from "electron";
// import path from "path";
// import { exec } from "child_process";
// import isDev from "electron-is-dev"; // Electron dev mode utility
// import { fileURLToPath } from "url"; // Required for __dirname in ES modules
// import startMySQL from "./start-mysql.js";

// // Resolve __dirname for ES modules
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// startMySQL();

// let mainWindow;

// // Function to create Electron window
// const createWindow = () => {
//   mainWindow = new BrowserWindow({
//     width: 1200,
//     height: 800,
//     webPreferences: {
//       preload: path.join(__dirname, "preload.js"), // Ensure correct path to preload
//       nodeIntegration: true, // Must be false for contextBridge to work
//       contextIsolation: true, // Required for secure context exposure
//       enableRemoteModule: false,
//     },
//   });

//   // Load React app in dev mode or production build
//   if (isDev) {
//     mainWindow.loadURL("http://localhost:5173");
//   } else {
//     mainWindow.loadFile(path.join(__dirname, "./build/index.html")); // Adjust path if necessary
//     mainWindow.on("focus", () => {
//       mainWindow.webContents.send("window-focus");
//     });
//   }

//   mainWindow.on("closed", () => (mainWindow = null));
// };

// // Function to start Node.js backend
// const startBackend = () => {
//   const serverPath = path.resolve(__dirname, "backend/app.js"); // Use path.resolve for absolute paths

//   console.log(`Resolved backend path: ${serverPath}`); // Debug path output

//   const serverProcess = exec(`node "${serverPath}"`, (err, stdout, stderr) => {
//     if (err) {
//       console.error(`Error starting backend: ${err.message}`);
//       return;
//     }
//     if (stdout) console.log(`Backend stdout: ${stdout}`);
//     if (stderr) console.error(`Backend stderr: ${stderr}`);
//   });

//   // Ensure backend process is killed when the app is quit
//   app.on("before-quit", () => {
//     serverProcess.kill();
//   });
// };

// // App lifecycle management
// app.whenReady().then(() => {
//   startMySQL(); // Start the MySQL server
//   startBackend(); // Start the backend server
//   createWindow(); // Create the Electron window
// });

// app.on("window-all-closed", () => {
//   // Quit the app when all windows are closed (except on macOS)
//   if (process.platform !== "darwin") app.quit();
// });

// app.on("activate", () => {
//   // Recreate a window if none are open (macOS behavior)
//   if (BrowserWindow.getAllWindows().length === 0) createWindow();
// });

import { app, BrowserWindow } from "electron";
import path from "path";
import { spawn } from "child_process";
import isDev from "electron-is-dev"; // Electron dev mode utility
import { fileURLToPath } from "url"; // Required for __dirname in ES modules
// import startMySQL from "./start-mysql.js";

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// startMySQL();

let mainWindow;
let serverProcess;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false, 
      contextIsolation: true, 
      sandbox: false,
      enableRemoteModule: false,
    },
  });

  // FORCE LOAD THE LOCAL FILE
  // This points to the compiled HTML file in your build folder
  mainWindow.loadFile(path.join(__dirname, "build", "index.html"));
  
  // DevTools will show us exactly why the screen is white if it fails
  mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

// Function to start Node.js backend
const startBackend = () => {
  const serverPath = path.resolve(__dirname, "backend/app.js"); // Use path.resolve for absolute paths

  console.log(`Resolved backend path: ${serverPath}`); // Debug path output

  // Start backend process using spawn
  serverProcess = spawn("node", [serverPath]);

  // Log backend output
  serverProcess.stdout.on("data", (data) => {
    console.log(`Backend stdout: ${data}`);
  });

  serverProcess.stderr.on("data", (data) => {
    console.error(`Backend stderr: ${data}`);
  });

  serverProcess.on("close", (code) => {
    console.error(`Backend process exited with code ${code}`);
  });

  // Ensure backend process is killed when the app is quit
  app.on("before-quit", () => {
    console.log("App is quitting. Killing backend process.");
    if (serverProcess) {
      serverProcess.kill();
    }
  });
};

// Utility function to check if a port is available
// const checkPort = (port) => {
//   const net = require("net");
//   return new Promise((resolve, reject) => {
//     const tester = net.createServer()
//       .once("error", (err) => {
//         if (err.code === "EADDRINUSE") reject(new Error("Port in use"));
//         else reject(err);
//       })
//       .once("listening", () => tester.once("close", () => resolve()).close())
//       .listen(port);
//   });
// };

// App lifecycle management
app.whenReady().then(async () => {
  try {
    // await checkPort(8000); // Ensure port 8000 is available
    // startMySQL(); // Start the MySQL server
    startBackend(); // Start the backend server
    createWindow(); // Create the Electron window
  } catch (err) {
    console.error("Error during app startup:", err);
  }
});

app.on("window-all-closed", () => {
  // Quit the app when all windows are closed (except on macOS)
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  // Recreate a window if none are open (macOS behavior)
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Global error handling for backend
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
