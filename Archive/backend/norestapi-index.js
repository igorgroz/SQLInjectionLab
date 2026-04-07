//This is a non-REST API 

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

// Get all clothes (SQL Injection Vulnerable)
app.get("/clothes", async (req, res) => {
  const { userid } = req.query;
  const sql = `SELECT * FROM user_clothes WHERE userid = ${userid};`; // Vulnerable query

  try {
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Secure version using parameterized queries (Fix for SQL Injection)
app.get("/safe-clothes", async (req, res) => {
  const { userid } = req.query;
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

app.get("/clothes-with-names", async (req, res) => {
  const { userid } = req.query;
  const sql = `
    SELECT u.userid, u.name, u.surname, uc.clothid, c.description AS cloth_name
    FROM user_clothes uc
    JOIN users u ON uc.userid = u.userid
    JOIN clothes c ON uc.clothid = c.clothid
    WHERE u.userid = $1;
  `; // Secure query with join

  try {
    const result = await pool.query(sql, [userid]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server
const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
