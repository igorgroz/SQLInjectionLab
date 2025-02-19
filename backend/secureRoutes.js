const express = require("express");
const pool = require("./db");
const router = express.Router();

// Secure GET endpoint to retrieve all users
router.get("/safe-users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users;");
    res.json({ message: "Users retrieved", users: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Secure GET endpoint to retrieve a specific user by ID
router.get("/safe-users/:userid", async (req, res) => {
  const { userid } = req.params;

  try {
    const result = await pool.query("SELECT * FROM users WHERE userid = $1", [userid]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `User with ID ${userid} not found` });
    }

    res.json({ message: "User retrieved successfully", user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Secure GET method to obtain user clothes
router.get("/safe-users/:userid/clothes", async (req, res) => {
    const { userid } = req.params;
  
    try {
      const result = await pool.query(
        `SELECT u.userid, u.name, u.surname, c.clothid, c.description, c.color
         FROM user_clothes uc 
         JOIN clothes c ON uc.clothid = c.clothid
         JOIN users u ON uc.userid = u.userid
         WHERE uc.userid = $1`, 
        [userid]
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: `No clothes found for user with ID ${userid}` });
      }
  
      res.json({ message: "Clothes retrieved successfully", clothes: result.rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  

/* Secure POST method to add a new cloth for a user - old method where userid was coming from a paramter
router.post("/safe-users/:userid/clothes", async (req, res) => {
  const { userid } = req.params;
  const { clothid } = req.body;

  // Check if the clothid is provided in the request body
  if (!clothid) {
    return res.status(400).json({ message: "Cloth ID is required" });
  }

  try {
    // Check if the user exists
    const userResult = await pool.query("SELECT * FROM users WHERE userid = $1", [userid]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Insert a new entry in the user_clothes table
    const insertResult = await pool.query(
      "INSERT INTO user_clothes (userid, clothid) VALUES ($1, $2) RETURNING *",
      [userid, clothid]
    );

    res.json({ message: `Cloth ${clothid} added to user ${userid}'s wardrobe` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
*/

// Secure POST method to add a new cloth for a user
router.post("/safe-users/clothes", async (req, res) => {
  const { userid, clothid } = req.body;

  // Validate that both userid and clothid are provided
  if (!userid || !clothid) {
    return res.status(400).json({ message: "User ID and Cloth ID are required" });
  }

  try {
    // Check if the user exists
    const userResult = await pool.query("SELECT * FROM users WHERE userid = $1", [userid]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Insert a new entry in the user_clothes table
    const insertResult = await pool.query(
      "INSERT INTO user_clothes (userid, clothid) VALUES ($1, $2) RETURNING *",
      [userid, clothid]
    );

    res.json({ message: `Cloth ${clothid} added to user ${userid}'s wardrobe`, data: insertResult.rows[0] });
  } catch (err) {
    console.error("Error adding cloth:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Secure POST method to remove a cloth from a user's wardrobe
router.post("/safe-users/remove-cloth", async (req, res) => {
  const { userid, clothid } = req.body;

  // Ensure both userid and clothid are provided in the body
  if (!userid || !clothid) {
    return res.status(400).json({ message: "Both userid and clothid are required" });
  }

  try {
    // Check if the user exists
    const userResult = await pool.query("SELECT * FROM users WHERE userid = $1", [userid]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the cloth exists in the user's wardrobe
    const clothResult = await pool.query(
      "SELECT * FROM user_clothes WHERE userid = $1 AND clothid = $2",
      [userid, clothid]
    );
    if (clothResult.rowCount === 0) {
      return res.status(404).json({ message: `Cloth ${clothid} not found in user ${userid}'s wardrobe` });
    }

    // Delete the cloth from the user's wardrobe
    await pool.query("DELETE FROM user_clothes WHERE userid = $1 AND clothid = $2", [userid, clothid]);

    res.json({ message: `Cloth ${clothid} removed from user ${userid}'s wardrobe` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Secure POST method to remove a user
router.post("/safe-users/remove-user", async (req, res) => {
  const { userid } = req.body;

  // Ensure userid is provided in the body
  if (!userid) {
    return res.status(400).json({ message: "Userid is required" });
  }

  try {
    // Check if the user exists
    const userResult = await pool.query("SELECT * FROM users WHERE userid = $1", [userid]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user's clothes first to maintain referential integrity
    await pool.query("DELETE FROM user_clothes WHERE userid = $1", [userid]);

    // Delete the user from the users table
    await pool.query("DELETE FROM users WHERE userid = $1", [userid]);

    res.json({ message: `User with userID ${userid} removed securely!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
