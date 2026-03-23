const express = require("express");
const router = express.Router();
const pool = require("./db");

// ============================================================================
// INTENTIONALLY VULNERABLE ROUTES
// For SQL injection training / CI-CD scanner validation only.
// DO NOT use in real applications.
// ============================================================================

// GET all users
router.get("/insecure-users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY userid");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching insecure users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET one user by ID (vulnerable)
router.get("/insecure-users/:userid", async (req, res) => {
  try {
    const { userid } = req.params;

    const query = `SELECT * FROM users WHERE userid = ${userid}`;
    const result = await pool.query(query);

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error fetching insecure user:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET clothes (vulnerable)
router.get("/insecure-users/:userid/clothes", async (req, res) => {
  try {
    const { userid } = req.params;

    const query = `
      SELECT c.*
      FROM clothes c
      INNER JOIN user_clothes uc ON c.clothid = uc.clothid
      WHERE uc.userid = ${userid}
      ORDER BY c.clothid
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching insecure user clothes:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add clothing (vulnerable)
router.post("/insecure-users/clothes", async (req, res) => {
  try {
    const { userid, clothid } = req.body;

    const query = `
      INSERT INTO user_clothes (userid, clothid)
      VALUES (${userid}, ${clothid})
    `;

    await pool.query(query);

    res.status(201).json({
      message: "Cloth added insecurely",
      submitted: { userid, clothid }
    });
  } catch (err) {
    console.error("SQLi route error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Remove clothing (vulnerable)
router.post("/insecure-users/remove-cloth", async (req, res) => {
  try {
    const { userid, clothid } = req.body;

    const query = `
      DELETE FROM user_clothes
      WHERE userid = ${userid} AND clothid = ${clothid}
    `;

    await pool.query(query);

    res.json({
      message: "Cloth removed insecurely",
      submitted: { userid, clothid }
    });
  } catch (err) {
    console.error("Error removing clothing insecurely:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;