const bcrypt = require("bcryptjs");
const { pool } = require("../db/config");

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

exports.getSuperAgentById = (req, res) => {
  const { superAgentId } = req.params; // Assuming the ID is passed as a route parameter

  pool.query(
    "SELECT * FROM super_agents WHERE superAgentId = ?",
    [superAgentId],
    (err, results) => {
      if (err) {
        console.error("Error fetching super agent:", err);
        return res.status(500).json({ message: "Server Error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Super Agent not found" });
      }

      res.status(200).json(results[0]); // Return the first result since we're expecting one super agent
    }
  );
};

exports.addSuperAgent = async (req, res) => {
  const {
    username,
    password,
    name,
    email,
    phone,
    agentLimit,
    stake,
    balance,
    agentType,
  } = req.body;

  try {
    // Validate agentType field
    if (!["prepaid", "postpaid"].includes(agentType)) {
      return res.status(400).json({
        message: "Invalid agentType. Must be 'prepaid' or 'postpaid'.",
      });
    }

    // If the agent is prepaid, ensure that the balance is provided
    if (agentType === "prepaid" && (balance === undefined || balance < 0)) {
      return res.status(400).json({
        message: "For prepaid agents, a valid balance is required.",
      });
    }

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
          "INSERT INTO super_agents (username, password, name, email, phone, agentLimit, agents, stake, balance, agentType, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
          [
            username,
            hashedPassword,
            name,
            email,
            phone,
            agentLimit,
            JSON.stringify([]), // Assuming agents is an empty array initially
            stake,
            agentType === "prepaid" ? balance : null, // Only set balance if prepaid
            agentType, // Store the agent type (prepaid or postpaid)
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

exports.topUpSuperAgentBalance = async (req, res) => {
  const { superAgentId, topUpAmount } = req.body;
  const performedBy = req.user?.username || "Unknown"; // Replace with your authentication mechanism

  // Input validation
  if (topUpAmount <= 0 || isNaN(topUpAmount)) {
    return res.status(400).json({
      message: "Top-up amount must be a positive number.",
    });
  }

  try {
    // Check if the super agent exists and is of type 'prepaid'
    pool.query(
      "SELECT * FROM super_agents WHERE superAgentId = ?",
      [superAgentId],
      (err, results) => {
        if (err) {
          console.error("Error retrieving super agent:", err);
          return res.status(500).json({ message: "Server Error" });
        }

        if (results.length === 0) {
          return res.status(404).json({ message: "Super agent not found" });
        }

        const superAgent = results[0];

        // Check if the agent is 'prepaid'
        if (superAgent.agentType !== "prepaid") {
          return res.status(400).json({
            message: "Only prepaid agents can receive a top-up.",
          });
        }

        // Get the current balance of the super agent
        const currentBalance = superAgent.balance || 0.0;

        // Calculate the new balance after the top-up
        const newBalance = parseFloat(currentBalance) + parseFloat(topUpAmount);

        // Update the balance in the database
        pool.query(
          "UPDATE super_agents SET balance = ? WHERE superAgentId = ?",
          [newBalance, superAgentId],
          (updateErr) => {
            if (updateErr) {
              console.error("Error updating super agent balance:", updateErr);
              return res
                .status(500)
                .json({ message: "Failed to top-up balance" });
            }

            // Log the transaction
            const topUpDay = new Date();
            pool.query(
              "INSERT INTO top_up_transactions (superAgentId, topUpAmount, topUpDay, performedBy) VALUES (?, ?, ?, ?)",
              [superAgentId, topUpAmount, topUpDay, performedBy],
              (logErr) => {
                if (logErr) {
                  console.error("Error logging transaction:", logErr);
                  return res.status(500).json({
                    message: "Balance updated, but failed to log transaction.",
                  });
                }

                // Respond with success
                res.status(200).json({
                  message: "Super agent balance updated successfully",
                  newBalance: newBalance,
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error("Error in topUpSuperAgentBalance:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getTopUpTransactions = async (req, res) => {
  const { superAgentId, performedBy, startDate, endDate } = req.query;

  try {
    let query = "SELECT * FROM top_up_transactions WHERE 1=1";
    const queryParams = [];

    if (superAgentId) {
      query += " AND superAgentId = ?";
      queryParams.push(superAgentId);
    }

    if (performedBy) {
      query += " AND performedBy = ?";
      queryParams.push(performedBy);
    }

    if (startDate && endDate) {
      query += " AND topUpDay BETWEEN ? AND ?";
      queryParams.push(new Date(startDate), new Date(endDate));
    }

    pool.query(query, queryParams, (err, results) => {
      if (err) {
        console.error("Error retrieving top-up transactions:", err);
        return res.status(500).json({ message: "Server Error" });
      }
      res.status(200).json({ transactions: results });
    });
  } catch (error) {
    console.error("Error in getTopUpTransactions:", error);
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

exports.changeAdminPassword = (req, res) => {
  const { adminId, currentPassword, newPassword } = req.body;

  // Fetch the admin's current password hash from the database
  pool.query(
    "SELECT password FROM admins WHERE id = ?",
    [adminId],
    (err, results) => {
      if (err) {
        console.error("Error fetching admin:", err);
        return res.status(500).json({ message: "Server Error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Admin not found" });
      }

      const hashedPassword = results[0].password;

      // Compare the current password with the stored hash
      bcrypt.compare(currentPassword, hashedPassword, (err, isMatch) => {
        if (err) {
          console.error("Error comparing passwords:", err);
          return res.status(500).json({ message: "Server Error" });
        }
        if (!isMatch) {
          return res
            .status(400)
            .json({ message: "Current password is incorrect" });
        }

        // Hash the new password
        bcrypt.hash(newPassword, 10, (err, newHashedPassword) => {
          if (err) {
            console.error("Error hashing new password:", err);
            return res.status(500).json({ message: "Server Error" });
          }

          // Update the password in the database
          pool.query(
            "UPDATE admins SET password = ? WHERE id = ?",
            [newHashedPassword, adminId],
            (err) => {
              if (err) {
                console.error("Error updating password:", err);
                return res.status(500).json({ message: "Server Error" });
              }

              res
                .status(200)
                .json({ message: "Password changed successfully" });
            }
          );
        });
      });
    }
  );
};

// Allow super agents or subagents to modify agents under them
exports.modifyAgent = async (req, res) => {
  const {
    superAgentId,
    agentId,
    username,
    name,
    email,
    phone,
    stake,
    password,
  } = req.body;

  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  // Check if the agent belongs to the super agent
  pool.query(
    "SELECT agents FROM super_agents WHERE superAgentId = ?",
    [superAgentId],
    (err, results) => {
      // if (err || results.length === 0) {
      //   return res.status(404).json({ message: "Super Agent not found" });
      // }

      // let agents = JSON.parse(results[0].agents || "[]");

      // // Verify if the agent is managed by the super agent
      // if (!agents.includes(agentId)) {
      //   return res
      //     .status(403)
      //     .json({ message: "Agent does not belong to this super agent" });
      // }

      // Proceed to update the agent's details
      pool.query(
        "UPDATE agents SET username = ?, name = ?, email = ?, phone = ?, stake = ?, password = COALESCE(?, password) WHERE agentId = ?",
        [username, name, email, phone, stake, hashedPassword, agentId],
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

  // Fetch the agents array from the super_agents table
  pool.query(
    "SELECT agents FROM super_agents WHERE superAgentId = ?",
    [superAgentId],
    (err, results) => {
      if (err) {
        console.error("Error fetching super agent:", err);
        return res.status(500).json({ message: "Server Error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Super Agent not found" });
      }

      const agentsArray = JSON.parse(results[0].agents); // Parse the JSON string to an array
      if (agentsArray.length === 0) {
        return res.status(200).json([]); // No agents to return
      }

      // Fetch the agents matching the IDs in the agents array
      pool.query(
        "SELECT * FROM agents WHERE agentId IN (?)",
        [agentsArray],
        (err, agentResults) => {
          if (err) {
            console.error("Error fetching agents:", err);
            return res.status(500).json({ message: "Server Error" });
          }
          res.status(200).json(agentResults);
        }
      );
    }
  );
};

exports.modifySuperAgent = async (req, res) => {
  const { superAgentId, username, name, email, phone, password, agentLimit } =
    req.body;

  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  // Update the super agent's details
  pool.query(
    "UPDATE super_agents SET username = ?, name = ?, email = ?, agentLimit = ?, phone = ?, password = COALESCE(?, password) WHERE superAgentId = ?",
    [username, name, email, agentLimit, phone, hashedPassword, superAgentId],
    (err, updateResults) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to update super agent" });
      }
      if (updateResults.affectedRows === 0) {
        return res.status(404).json({ message: "Super Agent not found" });
      }
      res
        .status(200)
        .json({ message: "Super Agent details updated successfully" });
    }
  );
};
