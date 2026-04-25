const express = require("express");
const router = express.Router();
const superAgentController = require("../controllers/superAgentController");

// Add an agent to a super agent
router.post(
  "/super-agents/:superAgentId/add-agent", // Include superAgentId in the route
  superAgentController.addAgentToSuperAgent
);

// Add a super agent
router.post(
  "/super-agents/create", // Include superAgentId in the route
  superAgentController.addSuperAgent
);
// Add a super agent
router.post(
  "/super-agents/topUp", // Include superAgentId in the route
  superAgentController.topUpSuperAgentBalance
);

router.get("/topups", superAgentController.getTopUpTransactions);

// Enable or disable agent
router.post(
  "/super-agents/:superAgentId/toggle-agent-status", // Include superAgentId in the route
  superAgentController.toggleAgentStatusAsSuper
);

// Modify agent details by super agent or subagent
router.put(
  "/super-agents/:superAgentId/modify", // Include superAgentId in the route
  superAgentController.modifySuperAgent
);

router.put(
  "/agents/:superAgentId/modify", // Include superAgentId in the route
  superAgentController.modifyAgent
);

router.get("/super-agents", superAgentController.getAllSuperAgents); // Endpoint to get all super agents

router.get(
  "/super-agents/:superAgentId",
  superAgentController.getSuperAgentById
);

router.get(
  "/super-agents/:superAgentId/agents",
  superAgentController.getAgentsBySuperAgent
);
router.post(
  "/admins/change-password",
  superAgentController.changeAdminPassword
);

module.exports = router;
