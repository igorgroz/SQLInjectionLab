import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Menu from "./components/Menu"; // Import the menu
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
  return (
    <Router>
      <div className="app-container">
        <Menu /> {/* Sidebar navigation */}

        <div className="main-content">
          <h1>API Security Testing</h1>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/list-users-rest" element={<ListUsersRESTPage />} />
            <Route path="/list-users-graphql" element={<ListUsersGraphQLPage />} />
            <Route path="/fetch-user-clothing-rest" element={<FetchUserClothesRESTPage />} />
            <Route path="/fetch-user-clothing-graphql" element={<FetchUserClothesGraphQLPage />} />
            <Route path="/secure-user-details-rest/:userid" element={<SecureUserDetailsRESTPage />} />
            <Route path="/secure-user-details-graphql/:userid" element={<SecureUserDetailsGraphQLPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
