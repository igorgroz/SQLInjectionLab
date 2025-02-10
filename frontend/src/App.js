import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import SecureUsersPage from './pages/SecureUsersPage'; // Import the SecureUsersPage
import SecureUserDetailsPage from './pages/SecureUserDetailsPage'; // Import the SecureUserDetailsPage

// Define basic pages with static content
const Home = () => (
  <div>
    <h1>Welcome to the Home Page</h1>
    <p>This is the main page with some static content.</p>
  </div>
);

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

const App = () => {
  const [userId, setUserId] = useState(''); // State for storing the user ID input

  return (
    <Router>
      <div>
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
              <Link to="/secure-users">Secure Users</Link> {/* Link to the new page */}
            </li>
          </ul>
        </nav>

        <div>
          <h2>Enter User ID for Secure User Details</h2>
          <input
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter User ID"
          />
          {/* Link that passes userId as a parameter */}
          <Link to={`/secure-user-details/${userId}`}>
            <button>Go to User Details</button>
          </Link>
        </div>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/secure-users" element={<SecureUsersPage />} /> {/* Add route for SecureUsersPage */}
          <Route path="/secure-user-details/:userid" element={<SecureUserDetailsPage />} /> {/* Add route for SecureUserDetailsPage */}
        </Routes>
      </div>
    </Router>
  );
};

export default App;
