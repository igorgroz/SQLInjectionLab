const express = require("express");
const cors = require("cors");
const pool = require("./db");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors()); // Allow frontend to call backend

// API to test server status
app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

// Secure GET endpoint to retrieve all users from the 'users' table
// This endpoint prevents SQL injection by using a simple SELECT query.
app.get("/safe-users", async (req, res) => {
  const sql = `SELECT * FROM users;`; // Secure query to retrieve all users

  try {
    // Query the database to get all users
    const result = await pool.query(sql);

    // Send back the result as JSON
    res.json({
      message: "Users retrieved successfully",
      users: result.rows,  // The list of users from the query
    });
  } catch (err) {
    // Log any errors and send a 500 status with error message
    res.status(500).json({ error: err.message });
  }
});


// Secure DELETE method to remove a user
app.delete("/safe-users/:userid", async (req, res) => {
  const { userid } = req.params; // Get userid from URL path
  
  // Parameterized query to securely delete a user
  const sql = `DELETE FROM users WHERE userid = $1`; // Secure query with parameterized input
  
  try {
    // Execute the delete query with the provided userid
    const result = await pool.query(sql, [userid]);

    // Check if the user exists and was deleted
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: `User with ID ${userid} deleted successfully` });
  } catch (err) {
    console.log(err.message);  // Log error messages
    res.status(500).json({ error: err.message });
  }
});


// Vulnerable GET endpoint to get all clothes for a user
app.get("/users/:userid/clothes", async (req, res) => {
  const { userid } = req.params;
  const sql = `SELECT * FROM user_clothes WHERE userid = ${userid};`; // Vulnerable query

  try {
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Secure GET endpoint to get all clothes for a user (SQL Injection Safe)
app.get("/users/:userid/safe-clothes", async (req, res) => {
  const { userid } = req.params;
  const sql = `SELECT uc.userid, uc.clothid, u.name, u.surname 
               FROM user_clothes uc
               JOIN users u ON uc.userid = u.userid
               WHERE uc.userid = $1`; // Secure query

  try {
    const result = await pool.query(sql, [userid]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Vulnerable POST to add clothes (with SQL Injection risk)
app.post("/users/:userid/clothes", async (req, res) => {
  const { userid } = req.params;
  const { clothid } = req.body;
  
  // Log right here to verify the request hits the endpoint
  //console.log(`Received POST request: userid = ${userid}, clothid = ${clothid}`);

  const sql = `INSERT INTO user_clothes (userid, clothid) VALUES (${userid}, '${clothid}');`;

  //console.log(`Executing SQL query: ${sql}`); // Log the full query

  try {
    const result = await pool.query(sql);
    res.json({
      message: "Cloth added successfully",
      query: sql,
      result: result,  // Return the result of the query (if any)
    });
  } catch (err) {
    console.log(err.message);  // Log any error messages
    res.status(500).json({ error: err.message });
  }
});

app.post("/users/:userid/safe-clothes", async (req, res) => {
  const { userid } = req.params;  // Extracting user ID from the URL parameters
  const { clothid } = req.body;   // Extracting cloth ID from the request body


  // Log the received request
  //console.log(`Received POST request: userid = ${userid}, clothid = ${clothid}`);

  // Secure version using parameterized query
  const sql = `INSERT INTO user_clothes (userid, clothid) VALUES ($1, $2);`; // Use placeholders ($1, $2)

  //console.log(`Executing SQL query: ${sql} with values: ${userid}, ${clothid}`); // Log the query and its parameters

  try {
    // Use parameterized query to safely insert data
    const result = await pool.query(sql, [userid, clothid]);

    // Send success response
    res.json({
      message: "Cloth added successfully",
      result: result,  // Return the result of the query (if any)
    });
  } catch (err) {
    // Log any errors and send a 500 status with error message
    console.log(err.message);
    res.status(500).json({ error: err.message });
  }
});


// Vulnerable PUT endpoint to update a user's cloth
app.put("/users/:userid/clothes/:clothid", async (req, res) => {
  const { userid, clothid } = req.params;
  const { newClothid } = req.body;

  const sql = `UPDATE user_clothes SET clothid = ${newClothid} WHERE userid = ${userid} AND clothid = ${clothid};`; // Vulnerable query

  try {
    await pool.query(sql);
    res.json({ message: "Cloth updated successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Secure PUT endpoint to update a user's cloth (SQL Injection Safe)
app.put("/users/:userid/safe-clothes/:clothid", async (req, res) => {
  const { userid, clothid } = req.params;
  const { newClothid } = req.body;

  const sql = `UPDATE user_clothes SET clothid = $1 WHERE userid = $2 AND clothid = $3;`; // Secure query

  try {
    await pool.query(sql, [newClothid, userid, clothid]);
    res.json({ message: "Cloth updated successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vulnerable DELETE endpoint to remove a user's cloth
app.delete("/users/:userid/clothes/:clothid", async (req, res) => {
  const { userid, clothid } = req.params;

  const sql = `DELETE FROM user_clothes WHERE userid = ${userid} AND clothid = ${clothid};`; // Vulnerable query

  try {
    await pool.query(sql);
    res.json({ message: "Cloth deleted successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Secure DELETE endpoint to remove a user's cloth (SQL Injection Safe)
app.delete("/users/:userid/safe-clothes/:clothid", async (req, res) => {
  const { userid, clothid } = req.params;

  const sql = `DELETE FROM user_clothes WHERE userid = $1 AND clothid = $2;`; // Secure query

  try {
    await pool.query(sql, [userid, clothid]);
    res.json({ message: "Cloth deleted successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server
const PORT = 5001;
app.listen(PORT, () => {
  const timestamp = new Date().toISOString();  // Get current timestamp
  console.log(`[${timestamp}] Server is running on http://localhost:${PORT}`);
});
