import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import axios from "axios";

import Menu from "./components/Menu";
import InsecureUsersRESTPage from "./pages/InsecureUsersRESTPage";
import ListUsersRESTPage from "./pages/ListUsersRESTPage";
import InSecureUserDetailsRESTPage from "./pages/InSecureUserDetailsRESTPage";
import SecureUserDetailsRESTPage from "./pages/SecureUserDetailsRESTPage";

import ListUsersGraphQLPage from "./pages/ListUsersGraphQLPage";
import FetchUserClothesGraphQLPage from "./pages/FetchUserClothesGraphQLPage";
import SecureUsersGraphQLPage from "./pages/SecureUsersGraphQLPage";
import SecureUserDetailsGraphQLPage from "./pages/SecureUserDetailsGraphQLPage";

import { loginRequest } from "./auth/authConfig";
import "./App.css";

const Home = () => (
  <div className="container">
    <h2>Home</h2>
    <p>Choose one of the links to test API functions.</p>
  </div>
);

const App = () => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = accounts && accounts.length > 0;

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
      await instance.logoutRedirect({ postLogoutRedirectUri: "/" });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Router>
      <div className="app-container">
        {isAuthenticated ? (
          <Menu logout={logout} username={accounts[0]?.username} />
        ) : null}

        <div className="main-content">
          <h1>API Security Testing</h1>

          {isAuthenticated ? (
            <Routes>
              <Route path="/" element={<Home />} />

              <Route path="/users-rest" element={<InsecureUsersRESTPage />} />
              <Route path="/users-rest/:userid" element={<InSecureUserDetailsRESTPage />} />

              <Route path="/safe-users-rest" element={<ListUsersRESTPage />} />
              <Route path="/safe-users-rest/:userid" element={<SecureUserDetailsRESTPage />} />

              <Route path="/users-graphql" element={<ListUsersGraphQLPage />} />
              <Route path="/users-graphql/:userid" element={<FetchUserClothesGraphQLPage />} />

              <Route path="/safe-users-graphql" element={<SecureUsersGraphQLPage />} />
              <Route path="/safe-users-graphql/:userid" element={<SecureUserDetailsGraphQLPage />} />

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