import { PublicClientApplication } from "@azure/msal-browser";

const msalConfig = {
  auth: {
    clientId: "8f4244a8-0dfb-4486-b28a-e0af636e7c7f",
    authority: "https://login.microsoftonline.com/487f7bd9-65ec-4967-83e5-94f06e11b6d1",
    redirectUri: "http://localhost:3000",
  },
  cache: {
    // For lab purposes this is fine; you can switch to sessionStorage later
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

// Minimal OIDC scopes. Add API scopes later when you protect backend endpoints.
export const loginRequest = {
  scopes: ["openid", "profile", "email"],
};
