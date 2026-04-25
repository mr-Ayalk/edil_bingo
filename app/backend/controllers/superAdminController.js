const bcrypt = require("bcryptjs");
const { pool } = require("../db/config");

exports.addSuperAgent = async (req, res) => {
  const { username, password, name, email, phone, agentLimit, stake } =
    req.body;

  try {
    // Check if the super agent username or email already exists
    pool.query(
      "SELECT * FROM super_agents WHERE username = ? OR email = ?",
      [username, email],
      async (err, results) => {
        if (err) {
          console.error("Error checking for existing super agent:", err);
          return res.status(500).json({ message: "Server Error" });
        }

        if (results.length > 0) {
          return res.status(400).json({
            message:
              "Super Agent with the same username or email already exists",
          });
        }

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new super agent into the database
        pool.query(
          "INSERT INTO super_agents (username, password, name, email, phone, agentLimit, agents, stake, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
          [
            username,
            hashedPassword,
            name,
            email,
            phone,
            agentLimit,
            JSON.stringify([]),
            stake,
          ],
          (insertErr, insertResults) => {
            if (insertErr) {
              console.error("Error inserting super agent:", insertErr);
              return res
                .status(500)
                .json({ message: "Failed to add super agent" });
            }
            res.status(201).json({ message: "Super agent added successfully" });
          }
        );
      }
    );
  } catch (error) {
    console.error("Error in addSuperAgent:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Fetch all super agents
exports.getAllSuperAgents = (req, res) => {
  pool.query("SELECT * FROM super_agents", (err, results) => {
    if (err) {
      console.error("Error fetching super agents:", err);
      return res.status(500).json({ message: "Server Error" });
    }
    res.status(200).json(results);
  });
};

exports.changeAdminIdPassword = async (req, res) => {
  const { adminId, currentPassword, newPassword } = req.body;

  try {
    // Fetch the user's current password hash from the database
    pool.query(
      "SELECT password FROM admins WHERE adminId = ?",
      [adminId],
      async (err, results) => {
        if (err) {
          console.error("Error fetching user data:", err);
          return res.status(500).json({ message: "Server Error" });
        }

        if (results.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        const hashedPassword = results[0].password;

        // Compare the current password with the stored hash
        const isMatch = await bcrypt.compare(currentPassword, hashedPassword);
        if (!isMatch) {
          return res
            .status(400)
            .json({ message: "Current password is incorrect" });
        }

        // Hash the new password
        const newHashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password in the database
        pool.query(
          "UPDATE admins SET password = ? WHERE adminId = ?",
          [newHashedPassword, adminId],
          (updateErr, updateResults) => {
            if (updateErr) {
              console.error("Error updating password:", updateErr);
              return res
                .status(500)
                .json({ message: "Failed to update password" });
            }

            res.status(200).json({ message: "Password changed successfully" });
          }
        );
      }
    );
  } catch (error) {
    console.error("Error in changePassword:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Add an agent to a super agent
exports.addAgentToSuperAgent = async (req, res) => {
  const { superAgentId, agentId } = req.body;

  pool.query(
    "SELECT agents, agentLimit FROM super_agents WHERE superAgentId = ?",
    [superAgentId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ message: "Super Agent not found" });
      }

      let superAgent = results[0];
      let agents = JSON.parse(superAgent.agents || "[]");

      // Check if the agent limit is reached
      if (agents.length >= superAgent.agentLimit) {
        return res.status(400).json({ message: "Agent limit reached" });
      }

      // Check if the agent is already added
      if (agents.includes(agentId)) {
        return res.status(400).json({ message: "Agent already assigned" });
      }

      // Add the new agent
      agents.push(agentId);

      // Update the super agent's agents array
      pool.query(
        "UPDATE super_agents SET agents = ? WHERE superAgentId = ?",
        [JSON.stringify(agents), superAgentId],
        (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ message: "Failed to add agent" });
          }
          res.status(200).json({ message: "Agent added to super agent" });
        }
      );
    }
  );
};

// Enable or disable an agent by super agent
exports.toggleAgentStatusAsSuper = (req, res) => {
  // Ensure superAgentId and agentId are treated as numbers
  const superAgentId = Number(req.body.superAgentId);
  const agentId = Number(req.body.agentId);
  const { enabled } = req.body;

  // Check if the agent belongs to the super agent
  pool.query(
    "SELECT agents FROM super_agents WHERE superAgentId = ?",
    [superAgentId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ message: "Super Agent not found" });
      }

      let agents = JSON.parse(results[0].agents || "[]");
      console.log(agents, agentId);

      // // Verify if the agent is managed by the super agent
      // if (!agents.includes(agentId.toString())) {
      //   // Convert agentId to string
      //   return res
      //     .status(403)
      //     .json({ message: "Agent does not belong to this super agent" });
      // }

      // Proceed to toggle the agent's status
      pool.query(
        "UPDATE agents SET enabled = ? WHERE agentId = ?",
        [enabled, agentId],
        (err, updateResults) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Failed to update agent status" });
          }
          if (updateResults.affectedRows === 0) {
            return res.status(404).json({ message: "Agent not found" });
          }
          res.status(200).json({
            message: `Agent ${enabled ? "enabled" : "disabled"} successfully`,
          });
        }
      );
    }
  );
};

// Allow super agents or subagents to modify agents under them
exports.modifyAgent = async (req, res) => {
  const { superAgentId, agentId, username, name, email, phone, password } =
    req.body;

  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  // Check if the agent belongs to the super agent
  pool.query(
    "SELECT agents FROM super_agents WHERE superAgentId = ?",
    [superAgentId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ message: "Super Agent not found" });
      }

      let agents = JSON.parse(results[0].agents || "[]");

      //   // Verify if the agent is managed by the super agent
      //   if (!agents.includes(agentId)) {
      //     return res
      //       .status(403)
      //       .json({ message: "Agent does not belong to this super agent" });
      //   }

      // Proceed to update the agent's details
      pool.query(
        "UPDATE agents SET username = ?, name = ?, email = ?, phone = ?, password = COALESCE(?, password) WHERE agentId = ?",
        [username, name, email, phone, hashedPassword, agentId],
        (err, updateResults) => {
          if (err)
            return res.status(500).json({ message: "Failed to update agent" });
          if (updateResults.affectedRows === 0)
            return res.status(404).json({ message: "Agent not found" });
          res
            .status(200)
            .json({ message: "Agent details updated successfully" });
        }
      );
    }
  );
};

// Inside your controller file
exports.getAgentsBySuperAgent = (req, res) => {
  const { superAgentId } = req.params;

  // Fetch agents managed by this super agent
  pool.query(
    "SELECT * FROM agents WHERE agentId IN (SELECT agentId FROM super_agents WHERE superAgentId = ?)",
    [superAgentId],
    (err, results) => {
      if (err) {
        console.error("Error fetching agents:", err);
        return res.status(500).json({ message: "Server Error" });
      }
      res.status(200).json(results);
    }
  );
};
