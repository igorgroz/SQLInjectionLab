import { PublicClientApplication, InteractionStatus } from "@azure/msal-browser";
import { msalConfig, loginRequest } from "./authConfig";

export const msalInstance = new PublicClientApplication(msalConfig);

export const initializeMsal = async () => {
  await msalInstance.initialize();

  const response = await msalInstance.handleRedirectPromise();
  if (response && response.account) {
    msalInstance.setActiveAccount(response.account);
  }

  const accounts = msalInstance.getAllAccounts();
  if (!msalInstance.getActiveAccount() && accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }
};

export const loginIfNeeded = async () => {
  const account = msalInstance.getActiveAccount();
  if (account) {
    return;
  }

  const interactionStatus = sessionStorage.getItem("msal.interaction.status");
  if (interactionStatus) {
    return;
  }

  await msalInstance.loginPopup(loginRequest);

  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }
};

export const logout = async () => {
  await msalInstance.logoutPopup();
};

export const getAccessToken = async () => {
  let account = msalInstance.getActiveAccount();

  if (!account) {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      account = accounts[0];
      msalInstance.setActiveAccount(account);
    }
  }

  if (!account) {
    throw new Error("No signed-in Entra account");
  }

  const response = await msalInstance.acquireTokenSilent({
    ...loginRequest,
    account,
  });

  return response.accessToken;
};

export const getAuthHeaders = async () => {
  const accessToken = await getAccessToken();

  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };
};

export const getAccount = () => msalInstance.getActiveAccount();