import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const SecureUserClothingPage = () => {
  const [userId, setUserId] = useState(''); // State for storing the user ID input

  return (
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
  );
};

export default SecureUserClothingPage;
