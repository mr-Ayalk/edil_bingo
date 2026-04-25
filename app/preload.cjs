// import { contextBridge, ipcRenderer } from "electron";
// import path from "path";
// import { fileURLToPath } from "url";

// // Resolve __dirname for ES Modules
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Debug Log
// console.log("Preload script loaded!");

// // Expose APIs securely
// contextBridge.exposeInMainWorld("electronAPI", {
//   resolvePath: (...segments) => {
//     console.log("resolvePath called with:", segments);
//     return path.join(__dirname, ...segments);
//   },
//   send: (channel, data) => {
//     ipcRenderer.send(channel, data);
//   },
//   receive: (channel, callback) => {
//     ipcRenderer.on(channel, (_, ...args) => callback(...args));
//   },
// });
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

console.log("Preload script bridge established!");

contextBridge.exposeInMainWorld("electronAPI", {
  resolvePath: (...segments) => path.join(__dirname, ...segments),
  send: (channel, data) => ipcRenderer.send(channel, data),
  receive: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  }
});