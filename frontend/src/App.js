import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import ListUsersRESTPage from './pages/ListUsersRESTPage'; // Import the SecureUsersRESTPage
import ListUsersGraphQLPage from './pages/ListUsersGraphQLPage'; // Import the SecureUsersGraphQLPage
import FetchUserClothesRESTPage from './pages/FetchUserClothesRESTPage'; // Import the new page
import FetchUserClothesGraphQLPage from './pages/FetchUserClothesGraphQLPage'; // Import the new page
//import SecureUserDetailsPage from './pages/SecureUserDetailsPage'; // Import the SecureUserDetailsPage
import SecureUserDetailsRESTPage from './pages/SecureUserDetailsRESTPage'; // Import the SecureUserDetailsRESTPage
import SecureUserDetailsGraphQLPage from './pages/SecureUserDetailsGraphQLPage'; // Import the SecureUserDetailsGraphQLPage

import './App.css'; // Import the CSS file

// Define basic pages with static content
const About = () => (
  <div className="container">
    <h2>About Us</h2>
    <p>Here is some information about our website.</p>
  </div>
);

const Contact = () => (
  <div className="container">
    <h2>Contact Us</h2>
    <p>You can reach us at contact@example.com.</p>
  </div>
);

const Home = () => (
  <div className="container">
    <h2>Home</h2>
    <p>Choose one of the links to test API functions.</p>
  </div>
);

const App = () => {
  return (
    <Router>
      <div>
        <h1>API Security Testing</h1>
        <nav>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/list-users-rest">List Users (Sec REST)</Link> {/* Link to REST Page */}
            </li>
            <li>
              <Link to="/list-users-graphql">List Users (Sec GQL)</Link> {/* Link to GraphQL Page */}
            </li>
            <li>
              <Link to="/fetch-user-clothing-rest">Fetch User Clothes (Sec REST)</Link> {/* Link to Secure User Clothing Page */}
            </li>
            <li>
              <Link to="/fetch-user-clothing-graphql">Fetch User Clothes (Sec GQL)</Link> {/* Link to Secure User Clothing Page */}
            </li>
          </ul>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/list-users-rest" element={<ListUsersRESTPage />} /> {/* Add route for List Users via REST Page */}
          <Route path="/list-users-graphql" element={<ListUsersGraphQLPage />} /> {/* Add route for List Users via GraphQL Page */}
          <Route path="/fetch-user-clothing-rest" element={<FetchUserClothesRESTPage />} /> {/* Add route for FetchUserClothingPage via REST */}
          <Route path="/fetch-user-clothing-graphql" element={<FetchUserClothesGraphQLPage />} /> {/* Add route for FetchUserClothingPage via GraphQL */}
          <Route path="/secure-user-details-rest/:userid" element={<SecureUserDetailsRESTPage />} /> {/* Add route for SecureUserDetailsPage */}  
          <Route path="/secure-user-details-graphql/:userid" element={<SecureUserDetailsGraphQLPage />} /> {/* Add route for SecureUserDetailsPage */}        
        </Routes>
      </div>
    </Router>
  );
};

export default App;
