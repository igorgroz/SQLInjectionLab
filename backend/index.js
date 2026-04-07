const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");

const insecureRoutes = require("./insecureRoutes");
const secureRoutes = require("./secureRoutes");
const { requireJwt } = require("./authJwt");

const { insecureGraphQLMiddleware } = require("./insecureGraphQL");
const { secureGraphQLMiddleware } = require("./secureGraphQL");
const { createApolloMiddleware } = require("./graphql-server");

const app = express();
const PORT = process.env.PORT || 5001;

// ─── Security headers ────────────────────────────────────────────────────────
// helmet sets: X-Frame-Options, X-Content-Type-Options, X-DNS-Prefetch-Control,
// HSTS (skipped in HTTP), Referrer-Policy, Content-Security-Policy, COEP, CORP.
// Removes X-Powered-By. Fixes ZAP rules: 10020, 10021, 10037, 10038, 10049,
// 10055, 90004.
app.use(helmet({
  // Relax CSP for the API — responses are JSON/text, not HTML,
  // but a default-src 'self' is still good practice.
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'"],
      imgSrc:      ["'self'", "data:"],
      connectSrc:  ["'self'"],
      fontSrc:     ["'self'"],
      objectSrc:   ["'none'"],
      frameSrc:    ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  // HSTS not useful over HTTP in the DAST stack; helmet disables it when
  // the request is not HTTPS, but be explicit for clarity.
  hsts: false,
}));
// Permissions-Policy — disable all browser features (pure API, no UI served)
// Fixes ZAP rule 10063.
app.use((_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=()"
  );
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === "http://localhost:3000" || origin === "https://sqlinj.local" || origin.endsWith(".app.github.dev")) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed: " + origin));
    }
  },
  allowedHeaders: ["Authorization", "Content-Type"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
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

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────────────────────────────────────
// OpenAPI spec — used by OWASP ZAP api-scan in the CI/CD security pipeline.
// Defines the full API surface so ZAP can perform targeted active scanning
// rather than relying on the spider alone.
//
// The insecure routes are intentionally included — they are the SQL injection
// targets and the whole point of running the DAST scan against them.
// ─────────────────────────────────────────────────────────────────────────────
const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "SQLInjectionLab API",
    version: "1.0.0",
    description:
      "Training API with intentionally vulnerable (insecure) and secure routes. " +
      "Insecure routes contain SQL injection vulnerabilities for scanner validation.",
  },
  servers: [{ url: `http://localhost:${process.env.PORT || 5001}` }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Entra ID JWT (production) or DAST test JWT signed with DAST_JWT_SECRET (CI). " +
          "Token must include scp claim with required scopes (user.read / user.write).",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          userid:   { type: "integer" },
          username: { type: "string" },
          email:    { type: "string" },
        },
      },
      Clothing: {
        type: "object",
        properties: {
          clothid:     { type: "integer" },
          name:        { type: "string" },
          description: { type: "string" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error:  { type: "string" },
          detail: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "Health check (public)",
        operationId: "healthCheck",
        responses: {
          200: { description: "Service is healthy" },
        },
      },
    },

    // ── Insecure routes (SQL injection training targets) ──────────────────
    "/api/insecure-users": {
      get: {
        summary: "Get all users (VULNERABLE — SQL injection)",
        operationId: "insecureGetUsers",
        tags: ["Insecure"],
        responses: {
          200: { description: "List of users" },
          500: { description: "DB error (may leak query details)" },
        },
      },
    },
    "/api/insecure-users/{userid}": {
      get: {
        summary: "Get user by ID (VULNERABLE — SQL injection via path param)",
        operationId: "insecureGetUser",
        tags: ["Insecure"],
        parameters: [
          { name: "userid", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "User object" },
          500: { description: "DB error" },
        },
      },
    },
    "/api/insecure-users/{userid}/clothes": {
      get: {
        summary: "Get clothing for user (VULNERABLE — SQL injection via path param)",
        operationId: "insecureGetUserClothes",
        tags: ["Insecure"],
        parameters: [
          { name: "userid", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "List of clothing" },
          500: { description: "DB error" },
        },
      },
    },
    "/api/insecure-users/clothes": {
      post: {
        summary: "Add clothing to user (VULNERABLE — SQL injection via body)",
        operationId: "insecureAddCloth",
        tags: ["Insecure"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  // type: "string" (not "integer") so ZAP fuzzes these fields
                  // with SQL injection payloads. The backend does no type coercion
                  // — the raw value is interpolated directly into the SQL query.
                  userid:  { type: "string" },
                  clothid: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Clothing added" },
          500: { description: "DB error" },
        },
      },
    },
    "/api/insecure-users/remove-cloth": {
      post: {
        summary: "Remove clothing from user (VULNERABLE — SQL injection via body)",
        operationId: "insecureRemoveCloth",
        tags: ["Insecure"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  // type: "string" (not "integer") so ZAP fuzzes these fields
                  // with SQL injection payloads. The backend does no type coercion
                  // — the raw value is interpolated directly into the SQL query.
                  userid:  { type: "string" },
                  clothid: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Clothing removed" },
          500: { description: "DB error" },
        },
      },
    },

    // ── Secure routes (parameterised queries, JWT-protected) ──────────────
    "/api/safe-users": {
      get: {
        summary: "Get all users (secure — requires user.read scope)",
        operationId: "safeGetUsers",
        tags: ["Secure"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "List of users", content: { "application/json": { schema: { type: "array", items: { "$ref": "#/components/schemas/User" } } } } },
          401: { description: "Missing or invalid token", content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } } },
          403: { description: "Insufficient scope" },
        },
      },
    },
    "/api/safe-users/{userid}": {
      get: {
        summary: "Get user by ID (secure)",
        operationId: "safeGetUser",
        tags: ["Secure"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "userid", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "User object" },
          401: { description: "Missing or invalid token" },
          403: { description: "Insufficient scope" },
        },
      },
    },
    "/api/safe-users/{userid}/clothes": {
      get: {
        summary: "Get clothing for user (secure)",
        operationId: "safeGetUserClothes",
        tags: ["Secure"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "userid", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "List of clothing" },
          401: { description: "Missing or invalid token" },
          403: { description: "Insufficient scope" },
        },
      },
    },
    "/api/safe-users/clothes": {
      post: {
        summary: "Add clothing to user (secure)",
        operationId: "safeAddCloth",
        tags: ["Secure"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userid", "clothid"],
                properties: {
                  userid:  { type: "integer" },
                  clothid: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Clothing added" },
          401: { description: "Missing or invalid token" },
          403: { description: "Insufficient scope" },
        },
      },
    },
    "/api/safe-users/remove-cloth": {
      post: {
        summary: "Remove clothing from user (secure)",
        operationId: "safeRemoveCloth",
        tags: ["Secure"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userid", "clothid"],
                properties: {
                  userid:  { type: "integer" },
                  clothid: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Clothing removed" },
          401: { description: "Missing or invalid token" },
          403: { description: "Insufficient scope" },
        },
      },
    },
  },
};

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
// Raw spec endpoint for ZAP api-scan (targets JSON, not the UI page)
app.get("/api-docs.json", (_req, res) => res.json(openApiSpec));

// ─────────────────────────────────────────────────────────────────────────────
// Async startup — required because Apollo Server v4's expressMiddleware() can
// only be called after server.start() resolves. All other routes are registered
// synchronously above; only the Apollo mount and app.listen() are deferred here.
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  try {
    // Apollo v4: must await server.start() before mounting
    const apolloMiddleware = await createApolloMiddleware();

    // Mount Apollo at /graphql — uses parameterised queries (secure).
    // The intentionally vulnerable SQL injection targets remain at
    // /graphql-insecure (express-graphql) for training purposes.
    app.use("/graphql", apolloMiddleware);

    // ── Catch-all 404 handler ─────────────────────────────────────────────────
    // Must be registered AFTER all routes (including Apollo) so it only fires
    // when nothing else matched. Explicit Cache-Control and CSP on 404 responses
    // suppress ZAP findings 10049 (Storable/Cacheable) and 10055 (CSP no fallback)
    // on /robots.txt, /sitemap.xml, etc. that Express would otherwise 404 without
    // the headers helmet set on the response.
    app.use((_req, res) => {
      res.set("Cache-Control", "no-store");
      res.status(404).json({ error: "Not found" });
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`  REST (insecure):    http://localhost:${PORT}/api/insecure-users`);
      console.log(`  REST (secure):      http://localhost:${PORT}/api/safe-users`);
      console.log(`  GraphQL (Apollo v4):http://localhost:${PORT}/graphql`);
      console.log(`  GraphQL (insecure): http://localhost:${PORT}/graphql-insecure`);
      console.log(`  GraphQL (secure):   http://localhost:${PORT}/graphql-secure`);
      console.log(`  API docs:           http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();