import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function UsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Fetch users from backend (example API call)
    fetch('/api/users')
      .then(response => response.json())
      .then(data => setUsers(data))
      .catch(err => console.error('Error fetching users:', err));
  }, []);

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map(user => (
          <li key={user.userid}>
            <Link to={`/user/${user.userid}/clothes`}>{user.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UsersPage;
