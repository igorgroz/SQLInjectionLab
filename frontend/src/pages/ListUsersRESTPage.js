import React, { useState, useEffect } from "react";
import axios from "axios";

const REST_API_URL = "http://localhost:5001/api/safe-users";

const redact = (token) => {
  if (!token) return "";
  const parts = token.split(" ");
  const raw = parts.length === 2 ? parts[1] : token;
  if (raw.length <= 40) return token;
  const preview = `${raw.slice(0, 18)}…${raw.slice(-18)}`;
  return parts.length === 2 ? `${parts[0]} ${preview}` : preview;
};

const ListUsersRESTPage = () => {
  const [users, setUsers] = useState([]);
  const [requestDetails, setRequestDetails] = useState(null);
  const [serverResponse, setServerResponse] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(REST_API_URL);
        setUsers(response.data.users);

        const authHeader =
          response?.config?.headers?.Authorization ||
          response?.config?.headers?.authorization ||
          axios.defaults?.headers?.common?.Authorization ||
          axios.defaults?.headers?.common?.authorization ||
          "";

        setRequestDetails({
          url: REST_API_URL,
          method: "GET",
          body: null,
          authorization: authHeader ? redact(authHeader) : "(none)",
        });

        setServerResponse(JSON.stringify(response.data, null, 2));
      } catch (error) {
        console.error("Error fetching users from REST API:", error);
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

      <details>
        <summary style={{ fontWeight: "bold", fontSize: "18px" }}>
          REST API Call Details
        </summary>

        {(requestDetails || serverResponse) && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              border: "1px solid #000",
              backgroundColor: "#f9f9f9",
            }}
          >
            {requestDetails && (
              <>
                <p>
                  <strong>API URL:</strong> {requestDetails.url}
                </p>
                <p>
                  <strong>HTTP Method:</strong> {requestDetails.method}
                </p>
                <p>
                  <strong>Authorization:</strong> {requestDetails.authorization}
                </p>
                <p>
                  <strong>Request Body:</strong>{" "}
                  {requestDetails.body || "No body for GET request"}
                </p>
              </>
            )}

            {serverResponse && (
              <>
                <p>
                  <strong>Server Response:</strong>
                </p>
                <pre style={{ backgroundColor: "#eee", padding: "10px" }}>
                  {serverResponse}
                </pre>
              </>
            )}
          </div>
        )}
      </details>
    </div>
  );
};

export default ListUsersRESTPage;
