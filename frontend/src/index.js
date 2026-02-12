import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";
import config from "./config";

import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./auth/authConfig";

const client = new ApolloClient({
  uri: config.GRAPHQL_ENDPOINT,
  cache: new InMemoryCache(),
});

const root = ReactDOM.createRoot(document.getElementById("root"));

(async () => {
  // Required for newer MSAL versions before login/redirect flows
  await msalInstance.initialize();

  // Processes the redirect response after loginRedirect()
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
