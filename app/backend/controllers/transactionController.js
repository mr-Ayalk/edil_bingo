// controllers/transactionController.js

// Get all transactions
exports.getTransactions = async (req, res) => {
  try {
    const [transactions] = await pool.query("SELECT * FROM transactions");
    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
};
