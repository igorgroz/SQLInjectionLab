import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import axios from "axios";

import Menu from "./components/Menu";
import InsecureUsersRESTPage from "./pages/InsecureUsersRESTPage";
import ListUsersRESTPage from "./pages/ListUsersRESTPage";
import InSecureUserDetailsRESTPage from "./pages/InSecureUserDetailsRESTPage";
import SecureUserDetailsRESTPage from "./pages/SecureUserDetailsRESTPage";

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
  const [bearerSource, setBearerSource] = useState("");

  const login = async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const logout = async () => {
    try {
      delete axios.defaults.headers.common.Authorization;
      setBearerPreview("");
      setBearerSource("");

      await instance.logoutRedirect({ postLogoutRedirectUri: "/" });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    const wireBearerToAxios = async () => {
      if (!isAuthenticated) return;

      try {
        const tokenResponse = await instance.acquireTokenSilent({
          account: accounts[0],
          scopes: loginRequest.scopes,
        });

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
        {isAuthenticated ? (
          <Menu logout={logout} username={accounts[0]?.username} />
        ) : null}

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

              <Route path="/users-rest" element={<InsecureUsersRESTPage />} />
              <Route
                path="/users-rest/:userid"
                element={<InSecureUserDetailsRESTPage />}
              />

              <Route path="/safe-users-rest" element={<ListUsersRESTPage />} />
              <Route
                path="/safe-users-rest/:userid"
                element={<SecureUserDetailsRESTPage />}
              />

              <Route path="*" element={<Navigate to="/" replace />} />
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