const express = require("express");
const router = express.Router();
const superAgentController = require("../controllers/superAgentController");

// Add an agent to a super agent
router.post(
  "/super-agents/add-agent", // Include superAgentId in the route
  superAgentController.addAgentToSuperAgent
);

// Enable or disable agent
// router.post(
//   "/super-agents/:superAgentId/toggle-agent-status", // Include superAgentId in the route
//   superAgentController.toggleAgentStatusAsSuper
// );

// // Modify agent details by super agent or subagent
// router.put(
//   "/super-agents/:superAgentId/modify-agent", // Include superAgentId in the route
//   superAgentController.modifyAgent
// );

// router.get("/super-agents", superAgentController.getAllSuperAgents); // Endpoint to get all super agents

// router.get(
//   "/super-agents/:superAgentId/agents",
//   superAgentController.getAgentsBySuperAgent
// );

module.exports = router;
