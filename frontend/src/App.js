import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useMsal } from "@azure/msal-react";

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
      await instance.logoutRedirect({ postLogoutRedirectUri: "/" });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Router>
      <div className="app-container">
        {isAuthenticated ? <Menu /> : null}

        <div className="main-content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1>API Security Testing</h1>

            {isAuthenticated ? (
              <div>
                <span style={{ marginRight: 12 }}>
                  Signed in as: {accounts[0]?.username}
                </span>
                <button onClick={logout}>Logout</button>
              </div>
            ) : null}
          </div>

          {isAuthenticated ? (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/list-users-rest" element={<ListUsersRESTPage />} />
              <Route path="/list-users-graphql" element={<ListUsersGraphQLPage />} />
              <Route path="/fetch-user-clothing-rest" element={<FetchUserClothesRESTPage />} />
              <Route path="/fetch-user-clothing-graphql" element={<FetchUserClothesGraphQLPage />} />
              <Route path="/secure-user-details-rest/:userid" element={<SecureUserDetailsRESTPage />} />
              <Route path="/secure-user-details-graphql/:userid" element={<SecureUserDetailsGraphQLPage />} />
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
