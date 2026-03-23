const express = require("express");
const router = express.Router();
const pool = require("./db");

// Intentionally vulnerable: SQL injection demo
router.get("/insecure-users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY userid");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching insecure users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Intentionally vulnerable
router.post("/insecure-users/clothes", async (req, res) => {
  try {
    const { userId, clothId } = req.body;

    const query = `
      INSERT INTO user_clothes (user_id, cloth_id)
      VALUES (${userId}, ${clothId})
      RETURNING *
    `;

    const result = await pool.query(query);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding clothing insecurely:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Intentionally vulnerable
router.post("/insecure-users/remove-cloth", async (req, res) => {
  try {
    const { userId, clothId } = req.body;

    const query = `
      DELETE FROM user_clothes
      WHERE user_id = ${userId} AND cloth_id = ${clothId}
      RETURNING *
    `;

    const result = await pool.query(query);
    res.json({
      message: "Cloth removed insecurely",
      removed: result.rows,
    });
  } catch (err) {
    console.error("Error removing clothing insecurely:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;