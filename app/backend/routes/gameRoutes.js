const express = require("express");
const router = express.Router();
const {
  startGame,
  drawNumber,
  endGame,
  getCards,
  checkCard,
  getCardById,
  getAllPlayedGames,
  getGamesByAgent,
  getGamesBySuperAgent,
} = require("../controllers/gameController");

// Start a new game
router.post("/start", startGame);

// Draw a number
router.post("/draw", drawNumber);

// End the game
router.post("/end", endGame);

// Get all cards
router.get("/cards", getCards);

router.post("/cards/:id", getCardById);

// Check a player's card
router.post("/check", checkCard);

router.get("/played", getAllPlayedGames);
router.get("/agent/:agentId", getGamesByAgent);
router.get("/super-agent/:superAgentId", getGamesBySuperAgent);

module.exports = router;
