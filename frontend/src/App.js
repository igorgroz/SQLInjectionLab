import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import SecureUsersRESTPage from './pages/SecureUsersRESTPage'; // Import the SecureUsersRESTPage
import SecureUsersGraphQLPage from './pages/SecureUsersGraphQLPage'; // Import the SecureUsersGraphQLPage
import SecureUserDetailsPage from './pages/SecureUserDetailsPage'; // Import the SecureUserDetailsPage
import SecureUserClothingPage from './pages/SecureUserClothingPage'; // Import the new page
import SecureUserClothingRESTPage from './pages/SecureUserClothingRESTPage'; // Import the new page
import SecureUserClothingGraphQLPage from './pages/SecureUserClothingGraphQLPage'; // Import the new page

// Define basic pages with static content
const About = () => (
  <div>
    <h1>About Us</h1>
    <p>Here is some information about our website.</p>
  </div>
);

const Contact = () => (
  <div>
    <h1>Contact Us</h1>
    <p>You can reach us at contact@example.com.</p>
  </div>
);

const Home = () => (
  <div>
    <p>This is the main page with some static content.</p>
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
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
            <li>
              <Link to="/secure-users-rest">List Users (Secure REST)</Link> {/* Link to REST Page */}
            </li>
            <li>
              <Link to="/secure-users-graphql">List Users (Secure GraphQL)</Link> {/* Link to GraphQL Page */}
            </li>
            <li>
              <Link to="/secure-user-clothing">Fetch User Clothes</Link> {/* Link to Secure User Clothing Page */}
            </li>
            <li>
              <Link to="/secure-user-clothing-rest">Fetch User Clothes (Secure REST)</Link> {/* Link to Secure User Clothing Page */}
            </li>
            <li>
              <Link to="/secure-user-clothing-graphql">Fetch User Clothes(Secure GraphQL)</Link> {/* Link to Secure User Clothing Page */}
            </li>            
          </ul>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/secure-users-rest" element={<SecureUsersRESTPage />} /> {/* Add route for REST Page */}
          <Route path="/secure-users-graphql" element={<SecureUsersGraphQLPage />} /> {/* Add route for GraphQL Page */}
          <Route path="/secure-user-details/:userid" element={<SecureUserDetailsPage />} /> {/* Add route for SecureUserDetailsPage */}
          <Route path="/secure-user-clothing" element={<SecureUserClothingPage />} /> {/* Add route for SecureUserClothingPage */}
          <Route path="/secure-user-clothing-rest" element={<SecureUserClothingRESTPage />} /> {/* Add route for SecureUserClothingPage */}
          <Route path="/secure-user-clothing-graphql" element={<SecureUserClothingGraphQLPage />} /> {/* Add route for SecureUserClothingPage */}              
        </Routes>
      </div>
    </Router>
  );
};

export default App;