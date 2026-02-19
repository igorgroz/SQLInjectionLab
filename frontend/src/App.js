import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import axios from "axios";

import Menu from "./components/Menu";
import ListUsersRESTPage from "./pages/ListUsersRESTPage";
import ListUsersGraphQLPage from "./pages/ListUsersGraphQLPage";
import FetchUserClothesRESTPage from "./pages/FetchUserClothesRESTPage";
import FetchUserClothesGraphQLPage from "./pages/FetchUserClothesGraphQLPage";
import SecureUserDetailsRESTPage from "./pages/SecureUserDetailsRESTPage";
import SecureUserDetailsGraphQLPage from "./pages/SecureUserDetailsGraphQLPage";

import { loginRequest } from "./auth/authConfig";
import "./App.css";

const Home = () => (
  <div className="container">
    <h2>Home</h2>
    <p>Choose one of the links to test API functions.</p>
  </div>
);

const redact = (token) => {
  if (!token) return "";
  if (token.length <= 40) return token;
  return `${token.slice(0, 18)}…${token.slice(-18)}`;
};

const App = () => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = accounts && accounts.length > 0;

  const [bearerPreview, setBearerPreview] = useState("");
  const [bearerSource, setBearerSource] = useState(""); // "accessToken" or "idToken"

  const login = async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const logout = async () => {
    try {
      // Clear axios default header on logout
      delete axios.defaults.headers.common.Authorization;
      setBearerPreview("");
      setBearerSource("");

      await instance.logoutRedirect({ postLogoutRedirectUri: "/" });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Phase 1: acquire a token and attach it to ALL REST requests via axios default header
  useEffect(() => {
    const wireBearerToAxios = async () => {
      if (!isAuthenticated) return;

      try {
        const tokenResponse = await instance.acquireTokenSilent({
          account: accounts[0],
          scopes: loginRequest.scopes,
        });

        // IMPORTANT: for a real protected backend you want an access token issued for your API scope.
        // For Phase 1 confirmation, we are attaching accessToken if present, else fall back to idToken.
        const hasAccessToken =
          tokenResponse.accessToken && tokenResponse.accessToken.length > 0;

        const bearer = hasAccessToken
          ? tokenResponse.accessToken
          : tokenResponse.idToken;

        axios.defaults.headers.common.Authorization = `Bearer ${bearer}`;

        setBearerPreview(redact(bearer));
        setBearerSource(hasAccessToken ? "accessToken" : "idToken");
      } catch (e) {
        console.error("acquireTokenSilent failed:", e);
      }
    };

    wireBearerToAxios();
  }, [isAuthenticated, instance, accounts]);

  return (
    <Router>
      <div className="app-container">
        {isAuthenticated ? <Menu /> : null}

        <div className="main-content">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <h1>API Security Testing</h1>

            {isAuthenticated ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span>Signed in as: {accounts[0]?.username}</span>
                <button onClick={logout}>Logout</button>
              </div>
            ) : null}
          </div>

          {isAuthenticated ? (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                border: "1px solid #ddd",
                background: "#fafafa",
                borderRadius: 6,
                fontFamily: "monospace",
                fontSize: 12,
              }}
            >
              <div>
                <strong>Bearer attached to REST + GraphQL:</strong>{" "}
                {bearerPreview ? "YES" : "NO"}
              </div>
              {bearerPreview ? (
                <div>
                  <strong>Token source:</strong> {bearerSource}{" "}
                  <span style={{ marginLeft: 8 }}>
                    <strong>Preview:</strong> {bearerPreview}
                  </span>
                </div>
              ) : (
                <div>
                  If this stays NO, token acquisition is failing (check console).
                </div>
              )}
            </div>
          ) : null}

          {isAuthenticated ? (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/list-users-rest" element={<ListUsersRESTPage />} />
              <Route
                path="/list-users-graphql"
                element={<ListUsersGraphQLPage />}
              />
              <Route
                path="/fetch-user-clothing-rest"
                element={<FetchUserClothesRESTPage />}
              />
              <Route
                path="/fetch-user-clothing-graphql"
                element={<FetchUserClothesGraphQLPage />}
              />
              <Route
                path="/secure-user-details-rest/:userid"
                element={<SecureUserDetailsRESTPage />}
              />
              <Route
                path="/secure-user-details-graphql/:userid"
                element={<SecureUserDetailsGraphQLPage />}
              />
            </Routes>
          ) : (
            <div>
              <h2>Please log in to access the API testing.</h2>
              <button onClick={login}>Login with Microsoft Entra ID</button>
            </div>
          )}
        </div>
      </div>
    </Router>
  );
};

export default App;
