const express = require("express");
const pool = require("./db");
const router = express.Router();

// Insecure GET endpoint to retrieve all users
router.get("/insecure-users", async (req, res) => {
  try {
    // Vulnerable to SQL Injection
    const result = await pool.query("SELECT * FROM users;");
    res.json({ message: "Users retrieved", users: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Insecure POST method to add a new cloth for a user (vulnerable)
router.post("/insecure-users/clothes", async (req, res) => {
    const { userid, clothid } = req.body;
  
    // Insecure code: Directly injecting user inputs into the SQL query
    const sql = `INSERT INTO user_clothes (userid, clothid) VALUES (${userid}, '${clothid}');`;
  
//    console.log(`Executing SQL query: ${sql}`); // Log the vulnerable SQL query
  
    try {
      const result = await pool.query(sql);  // Execute the query with injection risk
      res.json({ message: "Cloth added successfully!", query: sql, result: result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


// Insecure POST method to remove a cloth from a user's wardrobe (vulnerable)
router.post("/insecure-users/remove-cloth", async (req, res) => {
  const { userid, clothid } = req.body;

  // Insecure query, vulnerable to SQL injection
  try {
    const result = await pool.query(
      `DELETE FROM user_clothes WHERE userid = ${userid} AND clothid = ${clothid}` // Vulnerable to SQL injection
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: `Cloth ${clothid} not found in user ${userid}'s wardrobe` });
    }

    res.json({ message: `Cloth ${clothid} removed from user ${userid}'s wardrobe` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
