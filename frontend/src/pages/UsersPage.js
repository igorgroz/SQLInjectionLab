// src/pages/UsersPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';

function UsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Simulating data fetch
    setUsers([
      { id: 1, name: 'John Doe' },
      { id: 2, name: 'Jane Smith' },
      { id: 3, name: 'Alice Johnson' }
    ]);
  }, []);

  return (
    <div>
      <h2>Users</h2>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.name} - 
            <Link to={`/user/${user.id}/clothes`}>View Clothes</Link> | 
            <Link to={`/user/${user.id}/details`}>View Details</Link>
          </li>
        ))}
      </ul>
      <Button label="Add User" onClick={() => alert('User Added!')} />
    </div>
  );
}

export default UsersPage;
