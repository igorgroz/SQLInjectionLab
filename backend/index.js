const express = require("express");
const cors = require("cors");
require("dotenv").config();
const secureRoutes = require("./secureRoutes");
const insecureRoutes = require("./insecureRoutes");
const { secureGraphQLMiddleware } = require("./secureGraphQL");
const { insecureGraphQLMiddleware } = require("./insecureGraphQL");

const app = express();
app.use(express.json());
/* app.use(cors()); */ // Allow frontend to call backend

app.use(cors({
  origin: '*', // Allow all origins for testing
}));

// API to test server status
app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

// Use separate route files
app.use("/api", secureRoutes);
app.use("/api", insecureRoutes);

// Attach GraphQL endpoints
app.use("/graphql-secure", secureGraphQLMiddleware);
app.use("/graphql-insecure", insecureGraphQLMiddleware);

/*
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
*/

// Use the PORT from the .env file
const PORT = process.env.PORT || 5001;
//const PORT =5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
