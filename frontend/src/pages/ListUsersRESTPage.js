import React, { useState, useEffect } from 'react';
import axios from 'axios';

const REST_API_URL = 'http://localhost:5001/api/safe-users'; // Secure REST API URL

const ListUsersRESTPage = () => {
  const [users, setUsers] = useState([]);
  const [requestDetails, setRequestDetails] = useState(null);
  const [serverResponse, setServerResponse] = useState(null); // Store API response

  useEffect(() => {
    // Fetch users using REST API
    const fetchData = async () => {
      try {
        const response = await axios.get(REST_API_URL);
        setUsers(response.data.users);

        // Set request details to display
        setRequestDetails({
          url: REST_API_URL,
          method: 'GET',
          body: null, // No body for GET request
        });

        // Store server response
        setServerResponse(JSON.stringify(response.data, null, 2)); // Pretty-print response
      } catch (error) {
        console.error('Error fetching users from REST API:', error);
        setServerResponse(`Error: ${error.message}`);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>Secure Users</h1>
      <h2>Users from REST API</h2>
      <ul>
        {users.map((user) => (
          <li key={user.userid}>
            {user.name} {user.surname}
          </li>
        ))}
      </ul>

      {/* Print out request details */}
      <details>
        <summary style={{ fontWeight: 'bold', fontSize: '18px' }}>REST API Call Details</summary>
        {(requestDetails || serverResponse) && (
          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              border: '1px solid #000',
              backgroundColor: '#f9f9f9',
            }}
          >
            {/* API Request Details */}
            {requestDetails && (
              <>
                <p>
                  <strong>API URL:</strong> {requestDetails.url}
                </p>
                <p>
                  <strong>HTTP Method:</strong> {requestDetails.method}
                </p>
                <p>
                  <strong>Request Body:</strong> {requestDetails.body || 'No body for GET request'}
                </p>
              </>
            )}

            {/* Server Response */}
            {serverResponse && (
              <>
                <p>
                  <strong> Server Response:</strong>
                </p>
                <pre style={{ backgroundColor: '#eee', padding: '10px' }}>{serverResponse}</pre>
              </>
            )}
          </div>
        )}
      </details>
    </div>
  );
};

export default ListUsersRESTPage;
