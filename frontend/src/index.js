import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  createHttpLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

import config from "./config";

import { MsalProvider } from "@azure/msal-react";
import { msalInstance, loginRequest } from "./auth/authConfig";

const httpLink = createHttpLink({
  uri: config.GRAPHQL_ENDPOINT,
});

const authLink = setContext(async (_, { headers }) => {
  const accounts = msalInstance.getAllAccounts();
  if (!accounts || accounts.length === 0) {
    return { headers };
  }

  try {
    const tokenResponse = await msalInstance.acquireTokenSilent({
      account: accounts[0],
      scopes: loginRequest.scopes,
    });

    // For proper API protection later, you should request an API scope so accessToken is for YOUR backend.
    // For now (Phase 1 visibility), we attach accessToken if present, otherwise fall back to idToken.
    const bearer =
      tokenResponse.accessToken && tokenResponse.accessToken.length > 0
        ? tokenResponse.accessToken
        : tokenResponse.idToken;

    return {
      headers: {
        ...headers,
        Authorization: `Bearer ${bearer}`,
      },
    };
  } catch (e) {
    console.error("Apollo authLink token error:", e);
    return { headers };
  }
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

const root = ReactDOM.createRoot(document.getElementById("root"));

(async () => {
  await msalInstance.initialize();

  await msalInstance.handleRedirectPromise().catch((e) => {
    console.error("MSAL redirect handling error:", e);
  });

  root.render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <ApolloProvider client={client}>
          <App />
        </ApolloProvider>
      </MsalProvider>
    </React.StrictMode>
  );
})();
