const { db } = require("../db/config");

// Start a new game
const startGame = (req, res) => {
  const { betAmount, agentId, profit, enrolledCardIds } = req.body;

  // Insert the new game
  const query =
    "INSERT INTO bingo_games (bet_amount, agent_id, status, drawn_numbers, profit, enrolled_card_ids) VALUES (?, ?, 'active', NULL, ?, ?)";
  db.run(
    query,
    [betAmount, agentId, profit, JSON.stringify(enrolledCardIds)],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to start game" });
      }

      // Return the last inserted row ID for the new game
      res.status(200).json({
        message: "Game started successfully",
        gameId: this.lastID, // SQLite provides lastID for the most recent insert
      });
    }
  );
};

// Draw a number
const drawNumber = (req, res) => {
  const { gameId, number } = req.body;

  // Fetch current drawn numbers for the game
  db.get(
    "SELECT drawn_numbers FROM bingo_games WHERE id = ?",
    [gameId],
    (error, row) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to fetch game" });
      }

      if (!row) {
        return res.status(404).json({ error: "Game not found" });
      }

      // Parse the current drawn numbers or initialize as an empty array
      const drawnNumbers = row.drawn_numbers
        ? JSON.parse(row.drawn_numbers)
        : [];

      // Add the new number to the drawn numbers list
      drawnNumbers.push(number);

      // Update the drawn numbers in the database
      db.run(
        "UPDATE bingo_games SET drawn_numbers = ? WHERE id = ?",
        [JSON.stringify(drawnNumbers), gameId],
        (updateError) => {
          if (updateError) {
            console.error(updateError);
            return res
              .status(500)
              .json({ error: "Failed to update drawn numbers" });
          }
          res.status(200).json({ message: "Number drawn", number });
        }
      );
    }
  );
};

// End the game
const endGame = (req, res) => {
  const { gameId, agentId, profit, agentType } = req.body;
  console.log(agentType);

  // Determine the amount change based on agent type
  let amountChange = agentType === "prepaid" ? profit : profit * -1;
  console.log(amountChange);

  // Fetch drawn_numbers for the specific game
  db.get(
    "SELECT drawn_numbers FROM bingo_games WHERE id = ? AND agent_id = ?",
    [gameId, agentId],
    (fetchError, row) => {
      if (fetchError) {
        console.error(fetchError);
        return res.status(500).json({ error: "Failed to fetch drawn numbers" });
      }

      if (!row) {
        return res.status(404).json({ error: "Game or agent not found" });
      }

      const drawnNumbers = row.drawn_numbers;

      // Function to end the game
      const endGameQuery = () => {
        db.run(
          'UPDATE bingo_games SET status = "ended" WHERE id = ?',
          [gameId],
          function (endGameError) {
            if (endGameError) {
              console.error(endGameError);
              return res.status(500).json({ error: "Failed to end game" });
            }

            // If drawn_numbers is null, delete the bingo game and update the agent's balance
            if (drawnNumbers.length === -1) {
              console.log("Game ended without drawn numbers");
              db.run(
                "DELETE FROM bingo_games WHERE id = ?",
                [gameId],
                (deleteError) => {
                  if (deleteError) {
                    console.error(deleteError);
                    return res
                      .status(500)
                      .json({ error: "Failed to delete game" });
                  }

                  // Determine the column to update based on agent type
                  const balanceColumn =
                    agentType === "prepaid" ? "balance" : "currentBalance";

                  // Update the agent's balance
                  db.run(
                    `UPDATE agents SET ${balanceColumn} = COALESCE(${balanceColumn}, 0) + ? WHERE agentId = ?`,
                    [amountChange, agentId],
                    (updateError) => {
                      if (updateError) {
                        console.error(updateError);
                        return res
                          .status(500)
                          .json({ error: "Failed to update agent balance" });
                      }
                      res.status(200).json({
                        message:
                          "Game deleted and agent balance updated successfully",
                      });
                    }
                  );
                }
              );
            } else {
              res.status(200).json({
                message: "Game ended without deletion or agent balance update",
              });
            }
          }
        );
      };

      // Call the function to end the game
      endGameQuery();
    }
  );
};

// Get all cards
const getCards = (req, res) => {
  db.all("SELECT * FROM bingo_cards", (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to fetch cards" });
    }
    res.status(200).json(results); // SQLite returns an array of rows
  });
};

// Get card by ID (for a specific agent and card number)
const getCardById = (req, res) => {
  const { agentId, cardnumber } = req.body; // Get data from request body

  // Query to get the agent's cards data
  db.get(
    "SELECT data FROM agent_cards WHERE agentID = ?",
    [agentId],
    (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to fetch agent's cards" });
      }

      if (!result) {
        return res.status(404).json({ error: "No cards found for this agent" });
      }

      // Parse the agent card data
      const agentCards = JSON.parse(result.data);
      const card = agentCards.cards.find(
        (card) => parseInt(card.cardnumber) === parseInt(cardnumber)
      );

      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

      res.status(200).json(card); // Return the specific card data
    }
  );
};

// Check the card for winning numbers
const checkCard = (req, res) => {
  const {
    agentId,
    cardnumber,
    drawnNumbers,
    patternType = "any",
    pattern,
  } = req.body; // Get data from request body

  if (!drawnNumbers || !cardnumber) {
    return res
      .status(400)
      .json({ error: "Cardnumber and drawn numbers are required." });
  }

  db.get(
    "SELECT data FROM agent_cards WHERE agentID = ?",
    [agentId],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to fetch agent's cards" });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: "No cards found for this agent" });
      }

      const agentCards = JSON.parse(results.data); // Parse the agent's cards
      const card = agentCards.cards.find(
        (c) => parseInt(c.cardnumber) === parseInt(cardnumber)
      ); // Find the card by cardnumber

      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

      // Define the 5x5 card grid (assuming the structure of card.numbers is 5x5)
      const cardGrid = [
        card.numbers[0],
        card.numbers[1],
        card.numbers[2],
        card.numbers[3],
        card.numbers[4],
      ];

      const freeSpaceRow = 2; // Middle row
      const freeSpaceCol = 2; // Middle column

      // Store winning numbers for horizontal, vertical, diagonal, and corners
      const horizontalWinningNumbers = [];
      const verticalWinningNumbers = [];
      const diagonalWinningNumbers = [];
      const fourCornersWinningNumbers = [];
      const centerCornersWinningNumbers = [];
      const tShapeWinningNumbers = [];
      const lShapeWinningNumbers = [];
      const xShapeWinningNumbers = [];

      // Check horizontal wins
      const checkHorizontalWins = () => {
        return cardGrid.reduce((count, row, rowIndex) => {
          if (
            row.every(
              (num, colIndex) =>
                // Treat center as drawn
                (rowIndex === freeSpaceRow && colIndex === freeSpaceCol) ||
                drawnNumbers.includes(num)
            )
          ) {
            // Store winning numbers for horizontal line
            row.forEach((num, colIndex) => {
              if (
                !(rowIndex === freeSpaceRow && colIndex === freeSpaceCol) &&
                drawnNumbers.includes(num)
              ) {
                horizontalWinningNumbers.push(num);
              }
            });
            count++;
          }
          return count;
        }, 0);
      };

      // Check vertical wins
      const checkVerticalWins = () => {
        return cardGrid[0].reduce((count, _, colIndex) => {
          if (
            cardGrid.every(
              (row, rowIndex) =>
                // Treat center as drawn
                (rowIndex === freeSpaceRow && colIndex === freeSpaceCol) ||
                drawnNumbers.includes(row[colIndex])
            )
          ) {
            // Store winning numbers for vertical line
            cardGrid.forEach((row, rowIndex) => {
              const num = row[colIndex];
              if (
                !(rowIndex === freeSpaceRow && colIndex === freeSpaceCol) &&
                drawnNumbers.includes(num)
              ) {
                verticalWinningNumbers.push(num);
              }
            });
            count++;
          }
          return count;
        }, 0);
      };

      // Check diagonal wins
      const checkDiagonalWins = () => {
        let diagonalWinCount = 0;

        // Left-top to bottom-right diagonal
        const isDiagonalWin1 = cardGrid.every((row, rowIndex) => {
          if (rowIndex === freeSpaceRow && freeSpaceCol === rowIndex)
            return true; // Treat center as drawn
          return drawnNumbers.includes(row[rowIndex]);
        });

        if (isDiagonalWin1) {
          // Store winning numbers for diagonal 1
          cardGrid.forEach((row, rowIndex) => {
            const num = row[rowIndex];
            if (
              !(rowIndex === freeSpaceRow && rowIndex === freeSpaceCol) &&
              drawnNumbers.includes(num)
            ) {
              diagonalWinningNumbers.push(num);
            }
          });
          diagonalWinCount++;
        }

        // Right-top to bottom-left diagonal
        const isDiagonalWin2 = cardGrid.every((row, rowIndex) => {
          const reverseIndex = cardGrid.length - rowIndex - 1;
          if (rowIndex === freeSpaceRow && reverseIndex === freeSpaceCol)
            return true; // Treat center as drawn
          return drawnNumbers.includes(row[reverseIndex]);
        });

        if (isDiagonalWin2) {
          // Store winning numbers for diagonal 2
          cardGrid.forEach((row, rowIndex) => {
            const num = row[cardGrid.length - rowIndex - 1];
            if (
              !(
                rowIndex === freeSpaceRow &&
                cardGrid.length - rowIndex - 1 === freeSpaceCol
              ) &&
              drawnNumbers.includes(num)
            ) {
              diagonalWinningNumbers.push(num);
            }
          });
          diagonalWinCount++;
        }

        return diagonalWinCount;
      };

      // Check 4 Corners win (outer corners)
      const checkOuterFourCornersWin = () => {
        const isOuterFourCornersWin =
          drawnNumbers.includes(cardGrid[0][0]) && // Top-left corner
          drawnNumbers.includes(cardGrid[0][4]) && // Top-right corner
          drawnNumbers.includes(cardGrid[4][0]) && // Bottom-left corner
          drawnNumbers.includes(cardGrid[4][4]); // Bottom-right corner

        if (isOuterFourCornersWin) {
          // Store winning numbers for corners
          fourCornersWinningNumbers.push(cardGrid[0][0]);
          fourCornersWinningNumbers.push(cardGrid[0][4]);
          fourCornersWinningNumbers.push(cardGrid[4][0]);
          fourCornersWinningNumbers.push(cardGrid[4][4]);
          return 1;
        }
        return 0;
      };

      // Check Center 4 Corners win
      const checkCenterFourCornersWin = () => {
        const isCenterFourCornersWin =
          drawnNumbers.includes(cardGrid[1][1]) && // Inner Top-left
          drawnNumbers.includes(cardGrid[1][3]) && // Inner Top-right
          drawnNumbers.includes(cardGrid[3][1]) && // Inner Bottom-left
          drawnNumbers.includes(cardGrid[3][3]); // Inner Bottom-right

        if (isCenterFourCornersWin) {
          // Store winning numbers for center corners
          centerCornersWinningNumbers.push(cardGrid[1][1]);
          centerCornersWinningNumbers.push(cardGrid[1][3]);
          centerCornersWinningNumbers.push(cardGrid[3][1]);
          centerCornersWinningNumbers.push(cardGrid[3][3]);
          return 1;
        }
        return 0;
      };

      // Check T Pattern win
      const checkTPatternWin = () => {
        // Top row and middle column make a T
        const isTopRowFilled = cardGrid[0].every((num) =>
          drawnNumbers.includes(num)
        );
        const isMiddleColumnFilled = cardGrid.every(
          (row, rowIndex) =>
            rowIndex === 0 || // Skip checking first row again
            drawnNumbers.includes(row[2]) || // Middle column
            (rowIndex === 2 && 2 === 2) // Middle cell is free
        );

        if (isTopRowFilled && isMiddleColumnFilled) {
          // Store winning numbers for T pattern
          cardGrid[0].forEach((num) => {
            if (drawnNumbers.includes(num)) tShapeWinningNumbers.push(num);
          });

          for (let rowIndex = 1; rowIndex < 5; rowIndex++) {
            const num = cardGrid[rowIndex][2];
            if (!(rowIndex === 2 && 2 === 2) && drawnNumbers.includes(num)) {
              tShapeWinningNumbers.push(num);
            }
          }

          return 1;
        }
        return 0;
      };

      // Check L Pattern win
      const checkLPatternWin = () => {
        // First column and bottom row make an L
        const isFirstColumnFilled = cardGrid.every((row, rowIndex) =>
          drawnNumbers.includes(row[0])
        );
        const isBottomRowFilled = cardGrid[4].every(
          (num, colIndex) => colIndex === 0 || drawnNumbers.includes(num)
        );

        if (isFirstColumnFilled && isBottomRowFilled) {
          // Store winning numbers for L pattern
          for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
            const num = cardGrid[rowIndex][0];
            if (drawnNumbers.includes(num)) lShapeWinningNumbers.push(num);
          }

          for (let colIndex = 1; colIndex < 5; colIndex++) {
            const num = cardGrid[4][colIndex];
            if (drawnNumbers.includes(num)) lShapeWinningNumbers.push(num);
          }

          return 1;
        }
        return 0;
      };

      // Check X Pattern win (both diagonals)
      const checkXPatternWin = () => {
        // Both diagonals make an X
        const isDiag1Filled = cardGrid.every((row, rowIndex) => {
          if (rowIndex === 2 && 2 === 2) return true; // Center is free
          return drawnNumbers.includes(row[rowIndex]);
        });

        const isDiag2Filled = cardGrid.every((row, rowIndex) => {
          const colIndex = 4 - rowIndex;
          if (rowIndex === 2 && colIndex === 2) return true; // Center is free
          return drawnNumbers.includes(row[colIndex]);
        });

        if (isDiag1Filled && isDiag2Filled) {
          // Store winning numbers for X pattern
          for (let i = 0; i < 5; i++) {
            if (!(i === 2 && 2 === 2)) {
              // Diagonal 1
              const num1 = cardGrid[i][i];
              if (drawnNumbers.includes(num1)) xShapeWinningNumbers.push(num1);

              // Diagonal 2
              const num2 = cardGrid[i][4 - i];
              if (!(i === 2 && 4 - i === 2) && drawnNumbers.includes(num2)) {
                xShapeWinningNumbers.push(num2);
              }
            }
          }

          return 1;
        }
        return 0;
      };

      // Calculate the total number of line wins for each type
      let horizontalWins = 0;
      let verticalWins = 0;
      let diagonalWins = 0;
      let outerFourCornersWins = 0;
      let centerFourCornersWins = 0;
      let tPatternWins = 0;
      let lPatternWins = 0;
      let xPatternWins = 0;

      // Check appropriate patterns based on patternType
      if (patternType === "any" || patternType === "1") {
        // For "any 1 line" check all patterns including corners
        horizontalWins = checkHorizontalWins();
        verticalWins = checkVerticalWins();
        diagonalWins = checkDiagonalWins();
        outerFourCornersWins = checkOuterFourCornersWin();
        centerFourCornersWins = checkCenterFourCornersWin();
      } else if (patternType === "2" || patternType === "3") {
        // For "any 2 line" or "any 3 line" ONLY check actual lines, not corners
        horizontalWins = checkHorizontalWins();
        verticalWins = checkVerticalWins();
        diagonalWins = checkDiagonalWins();
        outerFourCornersWins = checkOuterFourCornersWin();
        centerFourCornersWins = checkCenterFourCornersWin();
        // Exclude corner patterns for 2-line and 3-line games
      } else if (patternType === "T") {
        // For T pattern, ONLY check T pattern
        tPatternWins = checkTPatternWin();
      } else if (patternType === "L") {
        // For L pattern, ONLY check L pattern
        lPatternWins = checkLPatternWin();
      } else if (patternType === "X") {
        // For X pattern, ONLY check X pattern
        xPatternWins = checkXPatternWin();
      } else if (patternType === "outer-four-corners") {
        // For outer four corners, ONLY check outer four corners
        outerFourCornersWins = checkOuterFourCornersWin();
      } else if (patternType === "center-four-corners") {
        // For center four corners, ONLY check center four corners
        centerFourCornersWins = checkCenterFourCornersWin();
      }

      let winMessages = [];
      if (horizontalWins > 0)
        winMessages.push(`${horizontalWins} Horizontal Win(s)`);
      if (verticalWins > 0) winMessages.push(`${verticalWins} Vertical Win(s)`);
      if (diagonalWins > 0) winMessages.push(`${diagonalWins} Diagonal Win(s)`);
      if (outerFourCornersWins > 0)
        winMessages.push(`${outerFourCornersWins} Outer Four Corners Win`);
      if (centerFourCornersWins > 0)
        winMessages.push(`${centerFourCornersWins} Center Four Corners Win`);
      if (tPatternWins > 0) winMessages.push(`${tPatternWins} T Pattern Win`);
      if (lPatternWins > 0) winMessages.push(`${lPatternWins} L Pattern Win`);
      if (xPatternWins > 0) winMessages.push(`${xPatternWins} X Pattern Win`);

      // Full card win check
      const isFullCardWin = cardGrid
        .flat()
        .every((num) => num === "free" || drawnNumbers.includes(num));

      if (isFullCardWin) {
        winMessages.push("1 Full Card Win");
      }

      // Calculate line wins based on pattern type
      let totalLineWins = 0;
      let isWin = false;
      let debugInfo = {
        patternType,
        pattern,
        horizontalWins,
        verticalWins,
        diagonalWins,
        outerFourCornersWins,
        centerFourCornersWins,
        tPatternWins,
        lPatternWins,
        xPatternWins,
      };

      // CRITICAL FIX: The issue is that patternType can be "any" for ANY of the numeric patterns
      // Check the numeric pattern value first to determine the game type
      if (
        pattern === 1 ||
        (pattern === undefined &&
          (patternType === "any" || patternType === "1"))
      ) {
        // For "any 1 line" include all pattern types including corners
        totalLineWins =
          horizontalWins +
          verticalWins +
          diagonalWins +
          outerFourCornersWins +
          centerFourCornersWins;
        isWin = totalLineWins >= 1;
      } else if (pattern === 2) {
        // For "any 2 lines" only count horizontal, vertical and diagonal lines
        // IMPORTANT: Exclude corner patterns for 2-line games
        totalLineWins =
          horizontalWins +
          verticalWins +
          diagonalWins +
          outerFourCornersWins +
          centerFourCornersWins;
        // Must have AT LEAST 2 lines to win
        isWin = totalLineWins >= 2;
      } else if (pattern === 3) {
        // For "any 3 lines" only count horizontal, vertical and diagonal lines
        // IMPORTANT: Exclude corner patterns for 3-line games
        totalLineWins =
          horizontalWins +
          verticalWins +
          diagonalWins +
          outerFourCornersWins +
          centerFourCornersWins;
        // Must have AT LEAST 3 lines to win
        isWin = totalLineWins >= 3;
      } else if (patternType === "T") {
        // For T pattern, ONLY consider T pattern wins
        isWin = tPatternWins > 0;
      } else if (patternType === "L") {
        // For L pattern, ONLY consider L pattern wins
        isWin = lPatternWins > 0;
      } else if (patternType === "X") {
        // For X pattern, ONLY consider X pattern wins
        isWin = xPatternWins > 0;
      } else if (patternType === "outer-four-corners") {
        // For outer four corners, ONLY consider outer four corners wins
        isWin = outerFourCornersWins > 0;
      } else if (patternType === "center-four-corners") {
        // For center four corners, ONLY consider center four corners wins
        isWin = centerFourCornersWins > 0;
      }

      // Calculate total win count for display purposes only
      const totalWins =
        horizontalWins +
        verticalWins +
        diagonalWins +
        outerFourCornersWins +
        centerFourCornersWins +
        tPatternWins +
        lPatternWins +
        xPatternWins;

      // Return Bingo results if wins are detected
      if (winMessages.length > 0) {
        return res.status(200).json({
          message: "Bingo!",
          winTypes: winMessages,
          totalWins: totalWins,
          totalLineWins: totalLineWins, // Add this for clarity
          isWin: isWin, // This now correctly follows the pattern type rules
          debugInfo: debugInfo, // Add debugging info
          winningNumbers: {
            horizontal: horizontalWinningNumbers,
            vertical: verticalWinningNumbers,
            diagonal: diagonalWinningNumbers,
            outerCorners: fourCornersWinningNumbers,
            centerCorners: centerCornersWinningNumbers,
            tPattern: tShapeWinningNumbers,
            lPattern: lShapeWinningNumbers,
            xPattern: xShapeWinningNumbers,
          },
        });
      } else {
        return res.status(200).json({
          message: "No win yet.",
          isWin: false,
          debugInfo: debugInfo, // Add debugging info
        });
      }
    }
  );
};

// Get all played games
const getAllPlayedGames = (req, res) => {
  db.all("SELECT * FROM bingo_games", (error, results) => {
    if (error) {
      return res.status(500).json({ error: "Failed to fetch played games" });
    }
    res.status(200).json({ games: results }); // Send back the result as an array
  });
};

// Get games by agent
const getGamesByAgent = (req, res) => {
  const { agentId } = req.params; // Agent ID is expected in the request parameters
  const { status, startDate, endDate } = req.query; // Extract status and date range from query parameters

  console.log("Agent ID:", agentId);

  let sql = "SELECT * FROM bingo_games WHERE agent_id = ?";
  const queryParams = [agentId]; // Initial query parameters array

  // Add status filter if provided
  if (status) {
    sql += " AND status = ?";
    queryParams.push(status);
  }

  // Add date range filter if both startDate and endDate are provided
  if (startDate && endDate) {
    sql += " AND created_at BETWEEN ? AND ?";
    queryParams.push(startDate, endDate);
  }

  db.all(sql, queryParams, (error, results) => {
    if (error) {
      return res.status(500).json({ error: "Failed to fetch games by agent" });
    }
    res.status(200).json({ games: results }); // Return results as array
  });
};

// Get games by super agent
const getGamesBySuperAgent = (req, res) => {
  const { superAgentId } = req.params; // Super Agent ID is expected in the request parameters
  const { status, startDate, endDate } = req.query; // Extract status and date range from query parameters

  // SQL query to join bingo_games with agents table
  let sql = `
    SELECT bg.* 
    FROM bingo_games bg
    JOIN agents a ON bg.agent_id = a.agentId
    WHERE a.superAgentId = ?
  `;
  const queryParams = [superAgentId]; // Initial query parameters array

  // Add status filter if provided
  if (status) {
    sql += " AND bg.status = ?";
    queryParams.push(status);
  }

  // Add date range filter if both startDate and endDate are provided
  if (startDate && endDate) {
    sql += " AND bg.created_at BETWEEN ? AND ?";
    queryParams.push(startDate, endDate);
  }

  db.all(sql, queryParams, (error, results) => {
    if (error) {
      return res
        .status(500)
        .json({ error: "Failed to fetch games by super agent" });
    }
    res.status(200).json({ games: results }); // Return results as array
  });
};

module.exports = {
  startGame,
  drawNumber,
  endGame,
  getCards,
  checkCard,
  getCardById,
  getAllPlayedGames,
  getGamesByAgent,
  getGamesBySuperAgent,
};
