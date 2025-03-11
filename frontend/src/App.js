import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
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
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Assume user is authenticated for now
  const [user, setUser] = useState(null); // You can mock user info or leave as null

  // Disable the login check for now
  useEffect(() => {
    // Just assume a mock user or leave it null
    setUser({ name: "Mock User", id: "1234" });
    setIsAuthenticated(true); // Assume user is logged in
  }, []);

  // Remove login logic temporarily
  const login = () => {
    console.log("Login is disabled for now.");
  };

  const logout = () => {
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
              {/* Remove the login button */}
              {/* <button onClick={login}>Login with MS Entra ID</button> */}
            </div>
          )}
        </div>
      </div>
    </Router>
  );
};

export default App;
