import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { msalInstance } from "./auth/authConfig";
import Menu from "./components/Menu";
import ListUsersRESTPage from "./pages/ListUsersRESTPage";
import ListUsersGraphQLPage from "./pages/ListUsersGraphQLPage";
import FetchUserClothesRESTPage from "./pages/FetchUserClothesRESTPage";
import FetchUserClothesGraphQLPage from "./pages/FetchUserClothesGraphQLPage";
import SecureUserDetailsRESTPage from "./pages/SecureUserDetailsRESTPage";
import SecureUserDetailsGraphQLPage from "./pages/SecureUserDetailsGraphQLPage";

import "./App.css";

const Home = () => (
  <div className="container">
    <h2>Home</h2>
    <p>Choose one of the links to test API functions.</p>
  </div>
);

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAccount = async () => {
      await msalInstance.initialize(); // Ensure MSAL is initialized before usage
      const currentAccounts = msalInstance.getAllAccounts();
      if (currentAccounts.length > 0) {
        setUser(currentAccounts[0]);
        setIsAuthenticated(true);
      }
    };
    checkAccount();
  }, []);

  const login = async () => {
    try {
      await msalInstance.initialize(); // Ensure MSAL is initialized before usage
      const loginResponse = await msalInstance.loginPopup({
        scopes: ["user.read"],
      });
      setUser(loginResponse.account);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = () => {
    msalInstance.logoutPopup();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <Router>
      <div className="app-container">
        {isAuthenticated ? <Menu /> : null}
        <div className="main-content">
          <h1>API Security Testing</h1>
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
              <button onClick={login}>Login with MS Entra ID</button>
            </div>
          )}
        </div>
      </div>
    </Router>
  );
};

export default App;
