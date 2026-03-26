import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const InsecureUsersRESTPage = () => {
  const [users, setUsers] = useState([]);
  const [requestDetails, setRequestDetails] = useState(null);
  const [error, setError] = useState("");

  const REST_API_URL = "http://localhost:5001/api/insecure-users";

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(REST_API_URL);

        setUsers(Array.isArray(response.data) ? response.data : []);
        setRequestDetails({
          method: 'GET',
          url: REST_API_URL,
          serverResponse: JSON.stringify(response.data, null, 2),
        });

        setError("");
      } catch (err) {
        console.error('Error fetching users from anonymous REST API:', err);
        setError(err.response?.data ? JSON.stringify(err.response.data) : err.message);
        setUsers([]);
        setRequestDetails({
          method: 'GET',
          url: REST_API_URL,
          serverResponse: `Error: ${err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message}`,
        });
      }
    };

    fetchUsers();
  }, []);

  return (
    <div>
      <h1>Users from Anonymous REST API</h1>

      <p style={{ marginBottom: "16px", color: "#444" }}>
        No authentication required. Click a user to view details.
      </p>

      {error && (
        <div style={{ color: "red", marginBottom: "15px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <ul style={{ paddingLeft: "20px" }}>
        {users.map((user) => (
          <li key={user.userid} style={{ marginBottom: "10px" }}>
            <Link
              to={`/users-rest/${user.userid}`}
              style={{
                textDecoration: 'none',
                color: '#0b57d0',
                fontWeight: '600',
              }}
            >
              UserID: {user.userid} Name: {user.name} Surname: {user.surname}
            </Link>
          </li>
        ))}
      </ul>

      <details open>
        <summary>REST API Call Details</summary>
        {requestDetails && (
          <div
            style={{
              marginTop: '20px',
              padding: '10px',
              border: '1px solid blue',
              backgroundColor: '#f0f8ff',
            }}
          >
            <p><strong>REST API Endpoint:</strong> {requestDetails.url}</p>
            <p><strong>Method:</strong> {requestDetails.method}</p>
            <h3>Server Response:</h3>
            <pre style={{ backgroundColor: '#eee', padding: '10px' }}>
              {requestDetails.serverResponse}
            </pre>
          </div>
        )}
      </details>
    </div>
  );
};

export default InsecureUsersRESTPage;