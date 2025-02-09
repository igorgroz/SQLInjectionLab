// src/pages/UserDetailsPage.js
import React from 'react';
import { useParams } from 'react-router-dom';

function UserDetailsPage() {
  const { userId } = useParams();

  return (
    <div>
      <h2>User {userId} Details</h2>
      <p>Details for user {userId} go right here.</p>
    </div>
  );
}

export default UserDetailsPage;
