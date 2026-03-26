const express = require("express");
const cors = require("cors");

const insecureRoutes = require("./insecureRoutes");
const secureRoutes = require("./secureRoutes");
const { requireJwt } = require("./authJwt");

const { insecureGraphQLMiddleware } = require("./insecureGraphQL");
const { secureGraphQLMiddleware } = require("./secureGraphQL");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// REST routes
app.use("/api", insecureRoutes);
app.use("/api", secureRoutes);

// GraphQL routes
app.use("/graphql-insecure", insecureGraphQLMiddleware);
app.use("/graphql-secure", requireJwt, secureGraphQLMiddleware);

app.get("/", (req, res) => {
  res.send("SQLInjectionLab backend is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});