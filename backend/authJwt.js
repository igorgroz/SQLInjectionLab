const { webcrypto } = require("node:crypto");

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

const requiredIssuer = process.env.JWT_ISSUER;
const requiredAudience = process.env.JWT_AUDIENCE;
const tenantId = process.env.ENTRA_TENANT_ID;

const jwksUrl = new URL(
  `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
);

let joseModulePromise;

async function getJose() {
  if (!joseModulePromise) {
    joseModulePromise = import("jose");
  }
  return joseModulePromise;
}

async function verifyEntraToken(token) {
  const { createRemoteJWKSet, jwtVerify } = await getJose();
  const JWKS = createRemoteJWKSet(jwksUrl);

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: requiredIssuer,
    audience: requiredAudience,
  });

  return payload;
}

async function requireJwt(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "missing_bearer_token" });
    }

    const token = authHeader.slice("Bearer ".length);
    const claims = await verifyEntraToken(token);

    req.user = {
      sub: claims.sub,
      oid: claims.oid,
      tid: claims.tid,
      roles: claims.roles || [],
      scp: claims.scp ? claims.scp.split(" ") : [],
    };

    return next();
  } catch (err) {
    return res.status(401).json({
      error: "invalid_token",
      detail: err.message,
    });
  }
}

function requireScope(requiredScope) {
  return (req, res, next) => {
    const scopes = req.user?.scp || [];

    if (!scopes.includes(requiredScope)) {
      return res.status(403).json({
        error: "insufficient_scope",
        required: requiredScope,
      });
    }

    return next();
  };
}

module.exports = { requireJwt, requireScope };