import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const FetchUserClothesRESTPage = () => {
  const [userId, setUserId] = useState(''); // State for storing the user ID input

  return (
    <div>
      <h2>Retrieve User Details (REST)</h2>
      <input
        type="number"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        placeholder="Enter User ID"
      />
      {/* Link that passes userId as a parameter */}
      <Link to={`/secure-user-details-rest/${userId}`}>
        <button>Go to User Details (REST)</button>
      </Link>
    </div>
  );
};

export default FetchUserClothesRESTPage;