const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../db/config");
const axios = require("axios");

exports.rechargeBalance = async (req, res) => {
  const { voucherCode, agentId } = req.body;

  try {
    // Check the voucher status first without marking it as used
    const response = await axios.get(
      `https://api-hasset.gizzebingo.com/api/vouchers/status?voucherCode=${voucherCode}`
    );

    // Validate the voucher status
    if (response.status !== 200 || !response.data.status) {
      return res.status(400).json({ message: "Invalid voucher" });
    }

    if (response.data.status === "used") {
      return res.status(400).json({ message: "Voucher already used" });
    }

    if (response.data.status === "active") {
      const voucherAmount = response.data.amount;

      // Validate the voucher amount
      if (!voucherAmount || isNaN(voucherAmount) || voucherAmount <= 0) {
        return res.status(400).json({ message: "Invalid voucher amount" });
      }

      // Update agent's balance locally
      db.run(
        "UPDATE agents SET balance = balance + ? WHERE agentId = ?",
        [voucherAmount, agentId],
        function (err) {
          if (err) {
            console.error("Error updating agent balance:", err);
            return res
              .status(500)
              .json({ message: "Failed to update balance" });
          }

          // Mark the voucher as used only after successful balance update
          axios
            .put("https://api-hasset.gizzebingo.com/api/vouchers/mark-used", {
              voucherCode,
            })
            .then(() => {
              res.status(200).json({
                message: "Balance recharged successfully",
                amount: voucherAmount,
              });
            })
            .catch((err) => {
              console.error("Error marking voucher as used online:", err);
              res
                .status(500)
                .json({ message: "Failed to mark voucher as used" });
            });
        }
      );
    } else {
      return res.status(400).json({ message: "Invalid voucher" });
    }
  } catch (error) {
    console.error("Error validating voucher with online backend:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Login API
exports.login = async (req, res) => {
  const { username, password } = req.body;

  // Check in agents table
  db.get(
    "SELECT * FROM agents WHERE username = ?",
    [username],
    async (err, agent) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Database error", error: err.message });
      }

      if (agent) {
        // Check if the agent is enabled
        if (agent.enabled !== 1) {
          return res.status(403).json({
            message: "Your account is disabled. Please contact your agent.",
          });
        }

        // Verify the password
        const validPassword = await bcrypt.compare(password, agent.password);
        if (!validPassword) {
          return res
            .status(401)
            .json({ message: "Invalid username or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: agent.agentId, type: "agent" },
          "secretkey",
          { expiresIn: "1h" }
        );

        return res.json({
          token,
          agentId: agent.agentId,
          userType: "agent",
        });
      }

      // If no agent found, send invalid credentials response
      return res.status(401).json({ message: "Invalid username or password" });
    }
  );
};

// Get all agents
exports.getAllAgents = (req, res) => {
  db.get(
    "SELECT agentId, username, name, email, phone, currentBalance FROM agents",
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Database error" });
      }
      res.json(results);
    }
  );
};

exports.getAgentCardNumbers = (req, res) => {
  const { agentId } = req.body;

  // Check if agentId is provided
  if (!agentId) {
    return res.status(400).json({ message: "Agent ID is required" });
  }

  // Query to retrieve the agent's card data
  db.get(
    "SELECT data FROM agent_cards WHERE agentID = ?",
    [agentId],
    (err, row) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ message: "Failed to retrieve agent cards" });
      }

      if (!row) {
        return res
          .status(404)
          .json({ message: "No cards found for this agent" });
      }

      try {
        // Parse the card data
        const agentCardsData = JSON.parse(row.data);

        // Extract card numbers and sort them in ascending order
        const cardNumbers = agentCardsData.cards
          .map((card) => parseInt(card.cardnumber)) // Ensure cardnumber is treated as an integer
          .filter((num) => !isNaN(num)) // Remove any invalid numbers
          .sort((a, b) => a - b); // Sort numbers in ascending order

        res.status(200).json({
          agentId: agentId,
          cardNumbers: cardNumbers,
        });
      } catch (parseError) {
        console.error("Error parsing agent cards data:", parseError);
        res.status(500).json({ message: "Error parsing agent cards data" });
      }
    }
  );
};

exports.createAgent = async (req, res) => {
  const {
    username,
    password,
    name,
    email,
    phone,
    stake,
    superAgentId,
    agentType,
  } = req.body;

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert agent
    db.get(
      "INSERT INTO agents (username, password, name, email, phone, stake, superAgentId, agentType) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        username,
        hashedPassword,
        name,
        email,
        phone,
        stake,
        superAgentId,
        agentType,
      ],
      (err, results) => {
        if (err) {
          return res.status(500).json({ message: "Failed to create agent" });
        }

        const agentId = results.insertId;
        // Prepare agent cards data
        const agentCardsData = JSON.stringify({
          agentID: agentId,
          cards: [
            {
              cardnumber: "1",
              numbers: [
                [9, 27, 35, 51, 61],
                [15, 16, 33, 56, 70],
                [11, 30, null, 52, 74],
                [12, 24, 45, 47, 66],
                [1, 23, 41, 59, 64],
              ],
            },
            {
              cardnumber: "2",
              numbers: [
                [1, 30, 35, 60, 74],
                [15, 16, 42, 58, 75],
                [3, 18, null, 54, 73],
                [9, 22, 39, 47, 69],
                [2, 23, 34, 52, 63],
              ],
            },
            {
              cardnumber: "3",
              numbers: [
                [9, 16, 37, 59, 62],
                [2, 17, 45, 47, 61],
                [15, 23, null, 46, 68],
                [3, 28, 31, 53, 72],
                [1, 18, 34, 56, 63],
              ],
            },
            {
              cardnumber: "4",
              numbers: [
                [9, 28, 38, 53, 73],
                [10, 17, 42, 54, 74],
                [3, 27, null, 58, 72],
                [4, 25, 35, 59, 65],
                [15, 24, 41, 46, 66],
              ],
            },
            {
              cardnumber: "5",
              numbers: [
                [1, 23, 43, 49, 64],
                [6, 17, 45, 60, 66],
                [15, 27, null, 54, 62],
                [3, 22, 32, 52, 72],
                [5, 26, 38, 58, 74],
              ],
            },
            {
              cardnumber: "6",
              numbers: [
                [3, 19, 45, 49, 73],
                [15, 17, 39, 51, 71],
                [8, 20, null, 54, 63],
                [4, 25, 41, 52, 66],
                [12, 18, 34, 60, 68],
              ],
            },
            {
              cardnumber: "7",
              numbers: [
                [3, 21, 31, 51, 69],
                [12, 28, 43, 47, 67],
                [2, 19, null, 59, 75],
                [8, 22, 38, 53, 62],
                [6, 16, 33, 60, 61],
              ],
            },
            {
              cardnumber: "8",
              numbers: [
                [3, 23, 39, 55, 64],
                [10, 26, 37, 49, 74],
                [7, 21, null, 54, 67],
                [9, 19, 31, 58, 65],
                [15, 18, 32, 53, 73],
              ],
            },
            {
              cardnumber: "9",
              numbers: [
                [6, 21, 31, 54, 68],
                [2, 23, 36, 57, 69],
                [3, 30, null, 56, 71],
                [7, 24, 43, 59, 66],
                [5, 26, 33, 53, 75],
              ],
            },
            {
              cardnumber: "10",
              numbers: [
                [9, 25, 37, 49, 66],
                [14, 29, 44, 46, 67],
                [5, 27, null, 56, 72],
                [10, 28, 45, 54, 62],
                [8, 22, 43, 58, 65],
              ],
            },
            {
              cardnumber: "11",
              numbers: [
                [13, 23, 41, 53, 75],
                [11, 25, 39, 56, 69],
                [4, 17, null, 50, 61],
                [12, 22, 45, 59, 66],
                [1, 16, 35, 60, 67],
              ],
            },
            {
              cardnumber: "12",
              numbers: [
                [8, 18, 35, 49, 69],
                [5, 29, 32, 58, 72],
                [12, 25, null, 47, 61],
                [14, 20, 33, 56, 63],
                [13, 17, 44, 59, 68],
              ],
            },
            {
              cardnumber: "13",
              numbers: [
                [13, 26, 31, 50, 66],
                [7, 20, 38, 52, 75],
                [6, 24, null, 49, 63],
                [12, 30, 35, 53, 71],
                [11, 16, 45, 46, 72],
              ],
            },
            {
              cardnumber: "14",
              numbers: [
                [15, 18, 38, 54, 61],
                [9, 22, 43, 50, 70],
                [6, 26, null, 46, 71],
                [5, 19, 42, 55, 73],
                [4, 28, 31, 58, 67],
              ],
            },
            {
              cardnumber: "15",
              numbers: [
                [13, 22, 44, 51, 69],
                [11, 16, 34, 53, 61],
                [4, 30, null, 59, 66],
                [2, 20, 32, 49, 67],
                [10, 21, 36, 60, 73],
              ],
            },
            {
              cardnumber: "16",
              numbers: [
                [6, 22, 36, 58, 69],
                [10, 28, 31, 49, 71],
                [2, 17, null, 46, 75],
                [11, 24, 37, 60, 72],
                [13, 16, 39, 59, 62],
              ],
            },
            {
              cardnumber: "17",
              numbers: [
                [9, 25, 31, 49, 69],
                [15, 18, 42, 60, 75],
                [4, 29, null, 58, 68],
                [14, 30, 40, 47, 67],
                [11, 23, 43, 48, 74],
              ],
            },
            {
              cardnumber: "18",
              numbers: [
                [7, 20, 44, 54, 63],
                [9, 17, 33, 48, 65],
                [1, 21, null, 49, 66],
                [3, 19, 37, 46, 72],
                [13, 28, 34, 58, 61],
              ],
            },
            {
              cardnumber: "19",
              numbers: [
                [7, 27, 44, 52, 73],
                [1, 24, 35, 56, 72],
                [13, 19, null, 51, 75],
                [3, 20, 42, 54, 64],
                [12, 21, 38, 47, 69],
              ],
            },
            {
              cardnumber: "20",
              numbers: [
                [2, 17, 37, 59, 71],
                [8, 27, 41, 53, 64],
                [13, 24, null, 50, 70],
                [3, 25, 35, 46, 65],
                [11, 26, 31, 54, 69],
              ],
            },
            {
              cardnumber: "21",
              numbers: [
                [12, 25, 36, 58, 65],
                [11, 27, 34, 60, 69],
                [2, 16, null, 48, 68],
                [10, 21, 43, 59, 67],
                [8, 30, 42, 53, 71],
              ],
            },
            {
              cardnumber: "22",
              numbers: [
                [7, 18, 36, 53, 68],
                [2, 19, 45, 57, 67],
                [4, 30, null, 54, 61],
                [14, 23, 33, 48, 73],
                [15, 24, 41, 55, 66],
              ],
            },
            {
              cardnumber: "23",
              numbers: [
                [15, 18, 43, 56, 63],
                [14, 27, 44, 50, 66],
                [7, 23, null, 57, 73],
                [4, 30, 32, 51, 71],
                [1, 16, 45, 48, 69],
              ],
            },
            {
              cardnumber: "24",
              numbers: [
                [10, 28, 33, 49, 66],
                [15, 25, 40, 55, 62],
                [7, 29, null, 59, 72],
                [8, 22, 44, 60, 65],
                [4, 27, 39, 58, 61],
              ],
            },
            {
              cardnumber: "25",
              numbers: [
                [15, 20, 34, 49, 64],
                [8, 28, 41, 50, 72],
                [6, 22, null, 54, 73],
                [14, 21, 37, 46, 75],
                [5, 19, 40, 59, 69],
              ],
            },
            {
              cardnumber: "26",
              numbers: [
                [14, 19, 37, 54, 72],
                [12, 20, 43, 49, 63],
                [10, 27, null, 57, 70],
                [7, 26, 41, 59, 67],
                [3, 21, 42, 53, 61],
              ],
            },
            {
              cardnumber: "27",
              numbers: [
                [12, 26, 34, 57, 71],
                [11, 24, 32, 48, 72],
                [5, 27, null, 52, 61],
                [13, 18, 38, 49, 69],
                [6, 28, 31, 51, 70],
              ],
            },
            {
              cardnumber: "28",
              numbers: [
                [6, 27, 32, 54, 74],
                [12, 24, 41, 58, 70],
                [14, 16, null, 49, 65],
                [2, 21, 35, 46, 61],
                [15, 22, 45, 50, 69],
              ],
            },
            {
              cardnumber: "29",
              numbers: [
                [5, 19, 41, 52, 73],
                [15, 30, 33, 58, 69],
                [9, 24, null, 55, 62],
                [1, 26, 32, 50, 74],
                [13, 18, 35, 59, 64],
              ],
            },
            {
              cardnumber: "30",
              numbers: [
                [13, 29, 32, 47, 66],
                [8, 23, 43, 51, 69],
                [2, 20, null, 56, 68],
                [5, 25, 34, 46, 75],
                [4, 28, 41, 53, 73],
              ],
            },
            {
              cardnumber: "31",
              numbers: [
                [3, 19, 37, 53, 61],
                [12, 25, 35, 51, 71],
                [6, 24, null, 48, 75],
                [8, 22, 38, 59, 64],
                [2, 18, 33, 50, 65],
              ],
            },
            {
              cardnumber: "32",
              numbers: [
                [4, 18, 42, 59, 64],
                [10, 23, 37, 60, 74],
                [3, 16, null, 47, 67],
                [11, 28, 40, 53, 75],
                [8, 17, 31, 58, 63],
              ],
            },
            {
              cardnumber: "33",
              numbers: [
                [3, 26, 37, 46, 70],
                [11, 20, 38, 51, 72],
                [5, 28, null, 59, 69],
                [12, 23, 41, 54, 64],
                [15, 22, 39, 60, 68],
              ],
            },
            {
              cardnumber: "34",
              numbers: [
                [12, 24, 31, 53, 69],
                [9, 21, 32, 58, 70],
                [6, 29, null, 46, 68],
                [11, 22, 36, 56, 62],
                [2, 25, 38, 60, 65],
              ],
            },
            {
              cardnumber: "35",
              numbers: [
                [5, 22, 42, 51, 68],
                [1, 28, 41, 60, 70],
                [8, 27, null, 49, 74],
                [4, 21, 45, 55, 72],
                [3, 20, 43, 53, 62],
              ],
            },
            {
              cardnumber: "36",
              numbers: [
                [2, 21, 42, 48, 63],
                [12, 22, 45, 50, 69],
                [9, 18, null, 57, 73],
                [10, 25, 33, 47, 72],
                [5, 23, 32, 59, 65],
              ],
            },
            {
              cardnumber: "37",
              numbers: [
                [4, 18, 34, 47, 70],
                [3, 19, 33, 53, 61],
                [15, 20, null, 56, 75],
                [6, 23, 35, 54, 63],
                [1, 22, 40, 50, 69],
              ],
            },
            {
              cardnumber: "38",
              numbers: [
                [13, 20, 41, 48, 74],
                [10, 21, 36, 58, 62],
                [11, 17, null, 53, 73],
                [6, 30, 35, 50, 63],
                [3, 24, 32, 51, 70],
              ],
            },
            {
              cardnumber: "39",
              numbers: [
                [11, 21, 42, 52, 69],
                [5, 30, 41, 54, 68],
                [12, 28, null, 55, 66],
                [13, 22, 34, 57, 72],
                [14, 27, 33, 51, 61],
              ],
            },
            {
              cardnumber: "40",
              numbers: [
                [2, 24, 32, 46, 66],
                [5, 18, 35, 49, 71],
                [7, 16, null, 58, 65],
                [12, 25, 33, 53, 67],
                [14, 30, 38, 50, 70],
              ],
            },
            {
              cardnumber: "41",
              numbers: [
                [12, 27, 38, 46, 63],
                [11, 26, 39, 58, 74],
                [14, 18, null, 48, 61],
                [1, 17, 44, 57, 75],
                [3, 24, 34, 60, 69],
              ],
            },
            {
              cardnumber: "42",
              numbers: [
                [13, 28, 40, 52, 70],
                [2, 18, 41, 55, 62],
                [4, 20, null, 53, 72],
                [1, 30, 42, 51, 71],
                [12, 23, 34, 50, 69],
              ],
            },
            {
              cardnumber: "43",
              numbers: [
                [8, 22, 45, 57, 66],
                [7, 25, 38, 51, 71],
                [5, 17, null, 50, 68],
                [15, 27, 43, 46, 70],
                [11, 24, 44, 52, 61],
              ],
            },
            {
              cardnumber: "44",
              numbers: [
                [7, 29, 43, 53, 75],
                [12, 22, 38, 46, 64],
                [11, 21, null, 59, 73],
                [2, 18, 45, 49, 74],
                [8, 23, 40, 55, 63],
              ],
            },
            {
              cardnumber: "45",
              numbers: [
                [12, 30, 40, 54, 68],
                [10, 18, 34, 59, 69],
                [13, 16, null, 60, 63],
                [14, 25, 42, 52, 66],
                [1, 28, 35, 55, 74],
              ],
            },
            {
              cardnumber: "46",
              numbers: [
                [9, 25, 45, 48, 63],
                [10, 18, 36, 54, 71],
                [7, 24, null, 60, 68],
                [11, 20, 38, 55, 69],
                [5, 26, 31, 57, 74],
              ],
            },
            {
              cardnumber: "47",
              numbers: [
                [4, 18, 33, 47, 64],
                [7, 24, 38, 52, 69],
                [3, 27, null, 56, 63],
                [2, 20, 32, 46, 74],
                [6, 22, 41, 60, 66],
              ],
            },
            {
              cardnumber: "48",
              numbers: [
                [14, 26, 40, 59, 72],
                [7, 27, 34, 57, 62],
                [5, 19, null, 55, 66],
                [15, 29, 43, 58, 68],
                [12, 24, 45, 51, 64],
              ],
            },
            {
              cardnumber: "49",
              numbers: [
                [2, 22, 37, 53, 67],
                [14, 20, 34, 54, 74],
                [13, 26, null, 47, 61],
                [15, 21, 35, 55, 62],
                [9, 24, 40, 51, 73],
              ],
            },
            {
              cardnumber: "50",
              numbers: [
                [13, 18, 44, 50, 74],
                [10, 22, 41, 54, 66],
                [3, 29, null, 47, 70],
                [15, 27, 43, 60, 69],
                [6, 28, 34, 53, 71],
              ],
            },
            {
              cardnumber: "51",
              numbers: [
                [4, 25, 31, 55, 75],
                [8, 17, 43, 60, 63],
                [10, 23, null, 49, 69],
                [14, 16, 44, 59, 67],
                [3, 24, 40, 54, 68],
              ],
            },
            {
              cardnumber: "52",
              numbers: [
                [6, 16, 43, 50, 72],
                [2, 20, 32, 58, 67],
                [11, 22, null, 59, 73],
                [5, 21, 41, 56, 68],
                [4, 30, 33, 49, 64],
              ],
            },
            {
              cardnumber: "53",
              numbers: [
                [15, 18, 35, 49, 67],
                [3, 25, 45, 51, 62],
                [4, 29, null, 59, 73],
                [10, 21, 37, 57, 66],
                [1, 20, 41, 47, 75],
              ],
            },
            {
              cardnumber: "54",
              numbers: [
                [13, 27, 38, 54, 75],
                [12, 21, 32, 52, 71],
                [7, 22, null, 55, 62],
                [2, 30, 39, 47, 73],
                [5, 23, 34, 57, 65],
              ],
            },
            {
              cardnumber: "55",
              numbers: [
                [5, 29, 34, 57, 69],
                [10, 16, 40, 53, 74],
                [3, 26, null, 54, 73],
                [2, 20, 39, 56, 61],
                [13, 24, 43, 46, 67],
              ],
            },
            {
              cardnumber: "56",
              numbers: [
                [13, 23, 36, 58, 63],
                [15, 28, 43, 53, 61],
                [7, 16, null, 46, 70],
                [14, 18, 44, 52, 65],
                [6, 25, 34, 50, 62],
              ],
            },
            {
              cardnumber: "57",
              numbers: [
                [6, 30, 45, 49, 64],
                [9, 17, 38, 48, 65],
                [12, 29, null, 47, 62],
                [15, 22, 31, 46, 70],
                [1, 23, 37, 50, 74],
              ],
            },
            {
              cardnumber: "58",
              numbers: [
                [13, 29, 40, 53, 71],
                [5, 25, 34, 51, 68],
                [8, 20, null, 57, 73],
                [7, 21, 37, 60, 72],
                [4, 26, 35, 49, 67],
              ],
            },
            {
              cardnumber: "59",
              numbers: [
                [14, 23, 41, 51, 61],
                [4, 24, 38, 56, 75],
                [3, 21, null, 52, 63],
                [13, 17, 33, 57, 67],
                [2, 26, 32, 49, 69],
              ],
            },
            {
              cardnumber: "60",
              numbers: [
                [14, 16, 35, 60, 66],
                [9, 18, 31, 55, 74],
                [15, 23, null, 57, 62],
                [11, 22, 37, 49, 70],
                [6, 26, 41, 48, 71],
              ],
            },
            {
              cardnumber: "61",
              numbers: [
                [7, 27, 43, 57, 71],
                [1, 21, 40, 53, 61],
                [2, 20, null, 55, 63],
                [4, 29, 35, 49, 62],
                [3, 26, 39, 48, 74],
              ],
            },
            {
              cardnumber: "62",
              numbers: [
                [8, 23, 34, 50, 68],
                [5, 18, 41, 57, 67],
                [6, 22, null, 52, 64],
                [2, 24, 45, 48, 70],
                [1, 25, 43, 54, 72],
              ],
            },
            {
              cardnumber: "63",
              numbers: [
                [2, 17, 37, 52, 63],
                [3, 24, 44, 47, 62],
                [6, 27, null, 49, 74],
                [10, 16, 45, 58, 73],
                [9, 18, 38, 53, 61],
              ],
            },
            {
              cardnumber: "64",
              numbers: [
                [7, 19, 36, 46, 64],
                [14, 16, 33, 50, 72],
                [15, 29, null, 59, 66],
                [11, 23, 32, 56, 70],
                [10, 24, 34, 47, 73],
              ],
            },
            {
              cardnumber: "65",
              numbers: [
                [9, 17, 35, 48, 69],
                [6, 23, 40, 50, 67],
                [13, 27, null, 60, 68],
                [2, 26, 38, 55, 61],
                [12, 24, 42, 59, 71],
              ],
            },
            {
              cardnumber: "66",
              numbers: [
                [11, 22, 33, 47, 75],
                [13, 19, 45, 54, 73],
                [2, 18, null, 56, 66],
                [6, 23, 44, 50, 68],
                [8, 27, 31, 48, 63],
              ],
            },
            {
              cardnumber: "67",
              numbers: [
                [2, 27, 43, 50, 64],
                [6, 22, 41, 60, 68],
                [9, 24, null, 59, 62],
                [1, 17, 38, 58, 67],
                [15, 21, 37, 56, 63],
              ],
            },
            {
              cardnumber: "68",
              numbers: [
                [12, 25, 38, 59, 64],
                [13, 30, 39, 53, 73],
                [4, 23, null, 58, 75],
                [14, 28, 32, 54, 63],
                [5, 22, 44, 48, 67],
              ],
            },
            {
              cardnumber: "69",
              numbers: [
                [14, 23, 36, 46, 63],
                [10, 21, 34, 59, 74],
                [2, 30, null, 57, 72],
                [1, 24, 31, 52, 66],
                [15, 17, 38, 47, 65],
              ],
            },
            {
              cardnumber: "70",
              numbers: [
                [1, 27, 40, 60, 67],
                [14, 19, 33, 53, 65],
                [8, 18, null, 57, 68],
                [13, 26, 32, 48, 70],
                [7, 23, 34, 59, 66],
              ],
            },
            {
              cardnumber: "71",
              numbers: [
                [10, 20, 38, 50, 64],
                [1, 22, 37, 60, 73],
                [7, 30, null, 52, 70],
                [12, 26, 42, 48, 67],
                [14, 16, 41, 57, 75],
              ],
            },
            {
              cardnumber: "72",
              numbers: [
                [6, 29, 41, 53, 68],
                [7, 18, 44, 60, 65],
                [13, 22, null, 58, 71],
                [8, 27, 35, 47, 63],
                [10, 26, 39, 54, 69],
              ],
            },
            {
              cardnumber: "73",
              numbers: [
                [3, 30, 43, 47, 65],
                [15, 19, 42, 48, 68],
                [2, 26, null, 50, 69],
                [11, 29, 34, 57, 61],
                [13, 24, 36, 49, 70],
              ],
            },
            {
              cardnumber: "74",
              numbers: [
                [10, 22, 41, 51, 63],
                [7, 18, 33, 57, 72],
                [5, 19, null, 60, 70],
                [2, 28, 43, 53, 68],
                [1, 25, 36, 50, 61],
              ],
            },
            {
              cardnumber: "75",
              numbers: [
                [13, 19, 45, 49, 66],
                [9, 24, 36, 51, 70],
                [15, 20, null, 55, 71],
                [5, 30, 32, 54, 67],
                [11, 18, 40, 52, 62],
              ],
            },
            {
              cardnumber: "76",
              numbers: [
                [1, 20, 44, 50, 66],
                [5, 18, 34, 49, 67],
                [10, 26, null, 46, 61],
                [2, 30, 38, 58, 62],
                [11, 29, 39, 53, 64],
              ],
            },
            {
              cardnumber: "77",
              numbers: [
                [8, 30, 39, 51, 71],
                [11, 20, 37, 49, 65],
                [13, 26, null, 60, 72],
                [5, 18, 40, 56, 70],
                [4, 24, 36, 53, 74],
              ],
            },
            {
              cardnumber: "78",
              numbers: [
                [9, 30, 43, 58, 73],
                [7, 25, 33, 52, 66],
                [12, 16, null, 60, 74],
                [14, 23, 44, 55, 63],
                [3, 29, 31, 56, 71],
              ],
            },
            {
              cardnumber: "79",
              numbers: [
                [1, 24, 38, 48, 69],
                [4, 28, 31, 47, 64],
                [7, 19, null, 53, 63],
                [15, 20, 37, 58, 66],
                [11, 26, 42, 59, 65],
              ],
            },
            {
              cardnumber: "80",
              numbers: [
                [5, 30, 37, 60, 67],
                [7, 17, 44, 52, 62],
                [11, 16, null, 58, 65],
                [2, 20, 36, 51, 69],
                [3, 27, 41, 54, 72],
              ],
            },
            {
              cardnumber: "81",
              numbers: [
                [7, 23, 39, 58, 73],
                [14, 28, 45, 46, 63],
                [9, 29, null, 60, 69],
                [2, 19, 35, 52, 66],
                [3, 26, 41, 51, 72],
              ],
            },
            {
              cardnumber: "82",
              numbers: [
                [10, 22, 44, 48, 72],
                [4, 27, 37, 49, 66],
                [15, 24, null, 53, 70],
                [1, 20, 40, 47, 65],
                [9, 19, 33, 56, 71],
              ],
            },
            {
              cardnumber: "83",
              numbers: [
                [3, 29, 43, 55, 65],
                [13, 27, 37, 60, 67],
                [12, 30, null, 49, 62],
                [11, 20, 34, 54, 75],
                [14, 28, 41, 47, 72],
              ],
            },
            {
              cardnumber: "84",
              numbers: [
                [14, 17, 36, 48, 73],
                [3, 29, 43, 47, 63],
                [2, 19, null, 56, 67],
                [11, 18, 40, 58, 66],
                [7, 28, 34, 50, 75],
              ],
            },
            {
              cardnumber: "85",
              numbers: [
                [8, 21, 35, 51, 69],
                [5, 26, 42, 52, 61],
                [10, 16, null, 59, 72],
                [1, 30, 31, 57, 71],
                [12, 18, 33, 46, 63],
              ],
            },
            {
              cardnumber: "86",
              numbers: [
                [2, 24, 44, 59, 72],
                [7, 21, 39, 54, 70],
                [3, 17, null, 57, 75],
                [8, 30, 43, 46, 67],
                [11, 25, 45, 49, 68],
              ],
            },
            {
              cardnumber: "87",
              numbers: [
                [2, 19, 35, 60, 69],
                [9, 30, 39, 57, 72],
                [10, 25, null, 47, 67],
                [6, 16, 33, 55, 66],
                [15, 26, 41, 49, 65],
              ],
            },
            {
              cardnumber: "88",
              numbers: [
                [5, 28, 31, 59, 75],
                [8, 22, 34, 56, 61],
                [7, 30, null, 60, 63],
                [1, 16, 40, 57, 65],
                [4, 26, 45, 49, 73],
              ],
            },
            {
              cardnumber: "89",
              numbers: [
                [3, 27, 36, 48, 61],
                [12, 17, 33, 55, 73],
                [6, 25, null, 49, 66],
                [7, 30, 31, 57, 69],
                [15, 19, 45, 53, 70],
              ],
            },
            {
              cardnumber: "90",
              numbers: [
                [11, 16, 45, 60, 65],
                [4, 18, 44, 56, 73],
                [10, 24, null, 53, 62],
                [6, 22, 40, 57, 63],
                [7, 30, 38, 50, 66],
              ],
            },
            {
              cardnumber: "91",
              numbers: [
                [5, 28, 33, 51, 67],
                [10, 20, 42, 53, 72],
                [1, 23, null, 52, 61],
                [3, 29, 45, 60, 70],
                [6, 27, 41, 58, 63],
              ],
            },
            {
              cardnumber: "92",
              numbers: [
                [6, 16, 35, 52, 74],
                [11, 21, 44, 58, 75],
                [8, 22, null, 54, 70],
                [7, 27, 40, 60, 69],
                [10, 26, 31, 50, 72],
              ],
            },
            {
              cardnumber: "93",
              numbers: [
                [2, 24, 41, 55, 70],
                [8, 28, 38, 50, 69],
                [15, 27, null, 49, 72],
                [10, 18, 37, 60, 62],
                [5, 25, 44, 58, 68],
              ],
            },
            {
              cardnumber: "94",
              numbers: [
                [8, 16, 41, 59, 65],
                [1, 19, 37, 46, 66],
                [7, 20, null, 57, 68],
                [6, 17, 43, 49, 70],
                [2, 23, 35, 56, 73],
              ],
            },
            {
              cardnumber: "95",
              numbers: [
                [4, 29, 41, 55, 75],
                [10, 20, 43, 57, 63],
                [12, 26, null, 59, 69],
                [9, 21, 39, 52, 71],
                [13, 19, 35, 49, 70],
              ],
            },
            {
              cardnumber: "96",
              numbers: [
                [12, 18, 39, 54, 69],
                [2, 23, 40, 50, 66],
                [3, 21, null, 56, 71],
                [11, 22, 32, 59, 70],
                [10, 24, 36, 57, 67],
              ],
            },
            {
              cardnumber: "97",
              numbers: [
                [6, 27, 31, 54, 71],
                [4, 19, 32, 55, 67],
                [11, 20, null, 46, 75],
                [13, 17, 36, 57, 69],
                [5, 24, 42, 52, 63],
              ],
            },
            {
              cardnumber: "98",
              numbers: [
                [3, 17, 40, 60, 70],
                [7, 20, 37, 55, 67],
                [5, 30, null, 54, 63],
                [6, 22, 31, 49, 68],
                [10, 24, 38, 52, 64],
              ],
            },
            {
              cardnumber: "99",
              numbers: [
                [12, 27, 38, 56, 70],
                [9, 21, 43, 54, 69],
                [8, 18, null, 48, 65],
                [4, 23, 33, 57, 71],
                [2, 26, 36, 58, 73],
              ],
            },
            {
              cardnumber: "100",
              numbers: [
                [13, 27, 36, 59, 62],
                [9, 18, 32, 54, 70],
                [3, 29, null, 56, 75],
                [2, 19, 43, 58, 61],
                [10, 25, 38, 50, 69],
              ],
            },
          ],
        });

        // Insert agent cards
        db.get(
          "INSERT INTO agent_cards (agentID, data) VALUES (?, ?)",
          [agentId, agentCardsData],
          (err) => {
            if (err) {
              return res
                .status(500)
                .json({ message: "Failed to create agent cards" });
            }
            res.status(201).json({
              message: "Agent and cards created successfully",
              agentId: agentId,
            });
          }
        );
      }
    );
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete an agent
exports.deleteAgent = (req, res) => {
  const agentId = req.params.agentId;

  db.get("DELETE FROM agents WHERE agentId = ?", [agentId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Failed to delete agent" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Agent not found" });
    }
    res.status(200).json({ message: "Agent deleted successfully" });
  });
};

// Top up agent balance without using promise-based MySQL
exports.topUpAgentBalance = (req, res) => {
  const { agentId, amount, superAgentPassword, superAgentId } = req.body;

  // Retrieve super-agent details
  db.get(
    "SELECT * FROM super_agents WHERE superAgentId = ?",
    [superAgentId],
    (err, results) => {
      if (err) {
        console.error("Error retrieving super-agent details:", err);
        return res.status(500).json({ message: "Internal server error" });
      }

      const superAgent = results[0];
      if (!superAgent) {
        return res.status(404).json({ message: "Super-agent not found" });
      }

      // Verify super-agent password
      bcrypt.compare(
        superAgentPassword,
        superAgent.password,
        (err, isMatch) => {
          if (err) {
            console.error("Error verifying password:", err);
            return res.status(500).json({ message: "Internal server error" });
          }

          if (!isMatch) {
            return res.status(401).json({ message: "Invalid password" });
          }

          // Check if super-agent has sufficient balance
          if (parseInt(superAgent.balance) < parseInt(amount)) {
            return res.status(400).json({ message: "Insufficient balance" });
          }

          // Begin transaction
          db.get("START TRANSACTION", (err) => {
            if (err) {
              console.error("Error starting transaction:", err);
              return res.status(500).json({ message: "Internal server error" });
            }

            // Deduct amount from super-agent
            db.get(
              "UPDATE super_agents SET balance = balance - ? WHERE superAgentId = ?",
              [amount, superAgentId],
              (err) => {
                if (err) {
                  console.error("Error updating super-agent balance:", err);
                  return db.get("ROLLBACK", () => {
                    return res
                      .status(500)
                      .json({ message: "Transaction failed" });
                  });
                }

                // Add amount to agent's balance
                db.get(
                  "UPDATE agents SET balance = balance + ? WHERE agentId = ?",
                  [amount, agentId],
                  (err) => {
                    if (err) {
                      console.error("Error updating agent balance:", err);
                      return db.get("ROLLBACK", () => {
                        return res
                          .status(500)
                          .json({ message: "Transaction failed" });
                      });
                    }

                    // Record transaction
                    db.get(
                      "INSERT INTO transactions (superAgentId, agentId, amount, type, createdAt) VALUES (?, ?, ?, 'topup', NOW())",
                      [superAgentId, agentId, amount],
                      (err) => {
                        if (err) {
                          console.error("Error recording transaction:", err);
                          return db.get("ROLLBACK", () => {
                            return res
                              .status(500)
                              .json({ message: "Transaction failed" });
                          });
                        }

                        // Commit transaction
                        db.get("COMMIT", (err) => {
                          if (err) {
                            console.error("Error committing transaction:", err);
                            return res
                              .status(500)
                              .json({ message: "Transaction failed" });
                          }

                          res
                            .status(200)
                            .json({ message: "Top-up successful" });
                        });
                      }
                    );
                  }
                );
              }
            );
          });
        }
      );
    }
  );
};

exports.deleteSuperAgent = (req, res) => {
  const superAgentId = req.params.superAgentId;

  db.get(
    "DELETE FROM super_agents WHERE superAgentId = ?",
    [superAgentId],
    (err, results) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Failed to delete super agent" });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: " Super Agent not found" });
      }
      res.status(200).json({ message: " Super Agent deleted successfully" });
    }
  );
};

// Get agent details
exports.getUserDetails = (req, res) => {
  const agentId = req.params.agentId;

  db.get(
    "SELECT agentId, username, name, email, phone, stake, currentBalance, balance, agentType FROM agents WHERE agentId = ?",
    [agentId],
    (err, agent) => {
      if (err || !agent) {
        return res
          .status(404)
          .json({ message: "Agent not found", error: err?.message });
      }

      res.json(agent);
    }
  );
};

exports.updateAgentBalance = (req, res) => {
  const { agentId, amount, agentType } = req.body;

  // Validate the amount
  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  if (agentType === "prepaid") {
    // Check the agent's balance for prepaid
    db.get(
      "SELECT balance FROM agents WHERE agentId = ?",
      [agentId],
      (err, row) => {
        if (err) {
          return res.status(500).json({
            error: "Failed to retrieve agent balance",
            errorDetails: err.message,
          });
        }

        if (!row) {
          return res.status(404).json({ message: "Agent not found" });
        }

        const balance = row.balance || 0;

        // Check if the agent has sufficient balance
        if (balance < amount) {
          return res.status(400).json({ message: "Insufficient balance" });
        }

        // Update the prepaid agent balance
        db.run(
          "UPDATE agents SET balance = balance - ? WHERE agentId = ?",
          [amount, agentId],
          function (updateErr) {
            if (updateErr) {
              return res.status(500).json({
                error: "Failed to update agent balance",
                errorDetails: updateErr.message,
              });
            }

            res
              .status(200)
              .json({ message: "Agent prepaid balance updated successfully" });
          }
        );
      }
    );
  } else if (agentType === "postpaid") {
    // Update currentBalance for postpaid agents
    db.run(
      "UPDATE agents SET currentBalance = COALESCE(currentBalance, 0) + ? WHERE agentId = ?",
      [amount, agentId],
      function (err) {
        if (err) {
          return res.status(500).json({
            error: "Failed to update agent balance",
            errorDetails: err.message,
          });
        }

        res
          .status(200)
          .json({ message: "Agent postpaid balance updated successfully" });
      }
    );
  } else {
    return res.status(400).json({ error: "Invalid agent type" });
  }
};

// Enable or disable an agent by super agent
exports.toggleAgentStatus = (req, res) => {
  // Ensure superAgentId and agentId are treated as numbers
  const superAgentId = Number(req.body.superAgentId);
  const agentId = Number(req.body.agentId);
  const { enabled } = req.body;

  // Check if the agent belongs to the super agent
  db.get(
    "SELECT agents FROM super_agents WHERE superAgentId = ?",
    [superAgentId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ message: "Super Agent not found" });
      }

      let agents = JSON.parse(results[0].agents || "[]");
      console.log(agents, agentId);

      // Verify if the agent is managed by the super agent
      if (!agents.includes(agentId.toString())) {
        // Convert agentId to string
        return res
          .status(403)
          .json({ message: "Agent does not belong to this super agent" });
      }

      // Proceed to toggle the agent's status
      db.get(
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
  console.log(stake, phone);

  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  // Check if the agent belongs to the super agent
  db.get(
    "SELECT agents FROM super_agents WHERE superAgentId = ?",
    [superAgentId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ message: "Super Agent not found" });
      }

      let agents = JSON.parse(results[0].agents || "[]");

      // Verify if the agent is managed by the super agent
      if (!agents.includes(agentId)) {
        return res
          .status(403)
          .json({ message: "Agent does not belong to this super agent" });
      }

      // Proceed to update the agent's details
      db.get(
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

// ------------
// Add these to your agentController.js file:

// Function to handle card data transformation to 5x5 grid
function transformTo5x5Grid(numbers) {
  const transformedCards = [];
  for (let i = 0; i < numbers.length; i += 5) {
    transformedCards.push(numbers.slice(i, i + 5));
  }
  return transformedCards;
}

// Add or replace agent cards
exports.addOrUpdateAgentCards = async (req, res) => {
  const agentId = req.params.agentId;
  const { cardnumber, numbers } = req.body; // cardnumber and numbers (5x5 grid)

  // Validate the cardnumber
  if (!cardnumber || cardnumber === "") {
    return res.status(400).json({ message: "Card number is required" });
  }

  // Validate the grid structure (must be a 5x5 grid)
  if (!Array.isArray(numbers) || numbers.length !== 5) {
    return res.status(400).json({ message: "Grid must have 5 rows" });
  }

  // Ensure each row has 5 values
  for (let row of numbers) {
    if (row.length !== 5) {
      return res
        .status(400)
        .json({ message: "Each row must contain exactly 5 numbers" });
    }
  }

  // Format the numbers to ensure they're in the correct 5x5 grid
  const formattedNumbers = numbers.map((row) => row.map(Number)); // Convert strings to numbers

  // First, check if the agent already has cards saved
  db.get(
    "SELECT data FROM agent_cards WHERE agentID = ?",
    [agentId],
    (err, row) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ message: "Error retrieving agent cards" });
      }

      let cardData = { agentID: agentId, cards: [] };

      if (row) {
        // If cards already exist, parse the existing card data
        cardData = JSON.parse(row.data);

        // Check if the card number already exists
        const existingCardNumbers = cardData.cards.map(
          (card) => card.cardnumber
        );

        if (existingCardNumbers.includes(cardnumber)) {
          // Update the existing card if it exists
          cardData.cards = cardData.cards.map((card) =>
            card.cardnumber === cardnumber
              ? { ...card, numbers: formattedNumbers } // Replace numbers for the matching cardnumber
              : card
          );
        } else {
          // Add a new card if it doesn't exist already
          cardData.cards.push({ cardnumber, numbers: formattedNumbers });
        }
      } else {
        // If no cards exist for this agent, create a new entry with the card
        cardData.cards.push({ cardnumber, numbers: formattedNumbers });
      }

      // Stringify the updated card data
      const updatedCardData = JSON.stringify(cardData);

      // Update or insert the agent's card data
      db.get(
        "SELECT 1 FROM agent_cards WHERE agentID = ?",
        [agentId],
        (err, result) => {
          if (err) {
            console.error(err);
            return res
              .status(500)
              .json({ message: "Error checking agent data" });
          }

          if (result) {
            // If the agent already has data, update it
            db.run(
              "UPDATE agent_cards SET data = ? WHERE agentID = ?",
              [updatedCardData, agentId],
              (err) => {
                if (err) {
                  console.error(err);
                  return res
                    .status(500)
                    .json({ message: "Error updating agent cards" });
                }
                res
                  .status(200)
                  .json({ message: "Agent cards updated successfully" });
              }
            );
          } else {
            // If no data exists for the agent, insert new record
            db.run(
              "INSERT INTO agent_cards (agentID, data) VALUES (?, ?)",
              [agentId, updatedCardData],
              (err) => {
                if (err) {
                  console.error(err);
                  return res
                    .status(500)
                    .json({ message: "Error saving agent cards" });
                }
                res
                  .status(200)
                  .json({ message: "Agent cards saved successfully" });
              }
            );
          }
        }
      );
    }
  );
};

// Get agent's cards
exports.getAgentCards = (req, res) => {
  const agentId = req.params.agentId;

  db.get(
    "SELECT data FROM agent_cards WHERE agentID = ?",
    [agentId],
    (err, row) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ message: "Error retrieving agent cards" });
      }
      if (!row) {
        return res
          .status(404)
          .json({ message: "No cards found for this agent" });
      }

      try {
        // Parse JSON data
        const agentCards = JSON.parse(row.data);
        res.json(agentCards);
      } catch (parseError) {
        console.error("Error parsing agent cards data:", parseError);
        res.status(500).json({ message: "Error parsing agent cards data" });
      }
    }
  );
};
exports.updateAgentCard = (req, res) => {
  const agentId = req.params.agentId;
  const { cardnumber, numbers } = req.body;

  // Ensure numbers is a valid 5x5 grid and convert all elements to numbers
  let formattedNumbers;

  if (Array.isArray(numbers) && numbers.length === 5) {
    formattedNumbers = numbers.map((row) => {
      if (!Array.isArray(row) || row.length !== 5) {
        return res
          .status(400)
          .json({ message: "Each row must contain exactly 5 numbers" });
      }

      // Convert each element to a number
      return row.map((element) => {
        const num = Number(element);
        if (isNaN(num)) {
          res
            .status(400)
            .json({ message: "All elements must be valid numbers" });
          throw new Error("Invalid number encountered"); // Short-circuit the processing
        }
        return num;
      });
    });
  } else {
    return res.status(400).json({ message: "Invalid 5x5 grid format" });
  }

  // Proceed with the database query
  db.get(
    "SELECT data FROM agent_cards WHERE agentID = ?",
    [agentId],
    (err, row) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ message: "Error retrieving agent cards" });
      }

      if (!row) {
        return res
          .status(404)
          .json({ message: "No cards found for this agent" });
      }

      try {
        const agentCards = JSON.parse(row.data);

        // Find the card to update
        let cardIndex = agentCards.cards.findIndex(
          (card) => card.cardnumber === cardnumber
        );

        if (cardIndex === -1) {
          return res.status(404).json({ message: "Card not found" });
        }

        // Replace the card numbers with the new ones
        agentCards.cards[cardIndex].numbers = formattedNumbers;

        // Prepare the updated card data for saving
        const updatedCardData = JSON.stringify(agentCards);

        // Update the card data in the database
        db.run(
          "UPDATE agent_cards SET data = ? WHERE agentID = ?",
          [updatedCardData, agentId],
          (err) => {
            if (err) {
              console.error(err);
              return res
                .status(500)
                .json({ message: "Error updating agent's card" });
            }
            res.status(200).json({ message: "Card updated successfully" });
          }
        );
      } catch (parseError) {
        console.error("Error parsing agent cards data:", parseError);
        res.status(500).json({ message: "Error parsing agent cards data" });
      }
    }
  );
};

exports.deleteAgentCard = (req, res) => {
  const agentId = req.params.agentId;
  const { cardnumber } = req.body; // Expecting cardnumber in the body

  // Retrieve agent card data
  db.get(
    "SELECT data FROM agent_cards WHERE agentID = ?",
    [agentId],
    (err, row) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ message: "Error retrieving agent cards" });
      }

      if (!row) {
        return res
          .status(404)
          .json({ message: "No cards found for this agent" });
      }

      try {
        const agentCards = JSON.parse(row.data);

        // Filter out the card to delete by cardnumber
        const updatedCards = agentCards.cards.filter(
          (card) => card.cardnumber !== cardnumber
        );

        if (updatedCards.length === agentCards.cards.length) {
          return res.status(404).json({ message: "Card not found" });
        }

        // Update the cards array
        agentCards.cards = updatedCards;
        const updatedCardData = JSON.stringify(agentCards);

        // Update the agent's card data in the database
        db.run(
          "UPDATE agent_cards SET data = ? WHERE agentID = ?",
          [updatedCardData, agentId],
          (err) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: "Error deleting card" });
            }
            res.status(200).json({ message: "Card deleted successfully" });
          }
        );
      } catch (parseError) {
        console.error("Error parsing agent cards data:", parseError);
        res.status(500).json({ message: "Error parsing agent cards data" });
      }
    }
  );
};

// exports.updateAgentCard = (req, res) => {
//   const agentId = req.params.agentId;
//   const { cardnumber, numbers } = req.body;

//   // Ensure the numbers are transformed into the 5x5 grid format
//   const formattedNumbers = transformTo5x5Grid(numbers);

//   db.get(
//     "SELECT data FROM agent_cards WHERE agentID = ?",
//     [agentId],
//     (err, results) => {
//       if (err) {
//         return res
//           .status(500)
//           .json({ message: "Error retrieving agent cards" });
//       }
//       if (results.length === 0) {
//         return res
//           .status(404)
//           .json({ message: "No cards found for this agent" });
//       }

//       const agentCards = JSON.parse(results[0].data);

//       // Find the card by cardnumber and update it
//       let cardIndex = agentCards.cards.findIndex(
//         (card) => card.cardnumber === cardnumber
//       );

//       if (cardIndex === -1) {
//         return res.status(404).json({ message: "Card not found" });
//       }

//       // Update the card numbers, no renesting should happen
//       agentCards.cards[cardIndex].numbers = formattedNumbers;

//       const updatedCardData = JSON.stringify(agentCards);

//       db.get(
//         "UPDATE agent_cards SET data = ? WHERE agentID = ?",
//         [updatedCardData, agentId],
//         (err, updateResults) => {
//           if (err) {
//             return res
//               .status(500)
//               .json({ message: "Error updating agent's card" });
//           }
//           res.status(200).json({ message: "Card updated successfully" });
//         }
//       );
//     }
//   );
// };
