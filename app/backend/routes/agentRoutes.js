// routes/agentRoutes.js
const express = require("express");
const router = express.Router();
const agentController = require("../controllers/agentController");
const transactionController = require("../controllers/transactionController");

// Login route
router.post("/login", agentController.login);
router.put("/recharge-balance", agentController.rechargeBalance);

// Get agent details route
router.get("/agent/:agentId", agentController.getUserDetails);

router.post("/agents/update-balance", agentController.updateAgentBalance);

// Create a new agent
router.post("/agents/create", agentController.createAgent);
router.post("/agents/topup", agentController.topUpAgentBalance);

router.post("/agent/card-numbers", agentController.getAgentCardNumbers);

// Route to get all transactions
router.get("/transactions", transactionController.getTransactions);

// Get all agents
router.get("/agents/all", agentController.getAllAgents);

// Get a single agent by ID
// router.get("/agents/:agentId", agentController.getAgentById);

// // Update agent details
// router.put("/:agentId", authMiddleware, agentController.updateAgent);

// Delete an agent
router.delete("/agents/:agentId", agentController.deleteAgent);
router.delete("/super-agents/:superAgentId", agentController.deleteSuperAgent);

// Routes for managing agent cards
router.post("/agents/:agentId/cards", agentController.addOrUpdateAgentCards); // Create or update agent cards
router.get("/agents/:agentId/cards", agentController.getAgentCards); // Get agent's cards
router.put("/agents/:agentId/cards", agentController.updateAgentCard); // Update specific card by cardnumber
router.delete("/agents/:agentId/cards", agentController.deleteAgentCard); // Delete card by cardnumber

module.exports = router;
