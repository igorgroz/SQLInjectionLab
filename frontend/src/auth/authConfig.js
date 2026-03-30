export const msalConfig = {
  auth: {
    clientId: "a6960366-f171-44e0-9fa1-d0792977a23d",
    authority: "https://login.microsoftonline.com/487f7bd9-65ec-4967-83e5-94f06e11b6d1",
    redirectUri: window.location.origin,
  },
};

export const loginRequest = {
  scopes: [
    "openid",
    "profile",
    "api://af63b7cb-1958-4029-b50c-3f2c17655120/user.read",
    "api://af63b7cb-1958-4029-b50c-3f2c17655120/user.write",
  ],
};
