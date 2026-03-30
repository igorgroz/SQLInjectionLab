import config from '../config';
import React, { useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';

const GET_INSECURE_USERS = gql`
  query {
    getInsecureUsers {
      userid
      name
      surname
    }
  }
`;

const ListUsersGraphQLPage = () => {
  const { data, loading, error } = useQuery(GET_INSECURE_USERS);

  const [requestDetails, setRequestDetails] = useState({
    url: config.GRAPHQL_ENDPOINT_INS,
    method: 'POST',
    body: JSON.stringify({ query: GET_INSECURE_USERS.loc.source.body }, null, 2),
    response: null,
  });

  useEffect(() => {
    if (data) {
      setRequestDetails((prev) => ({
        ...prev,
        response: JSON.stringify(data, null, 2),
      }));
    }
  }, [data]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h1>Users from Anonymous GraphQL API</h1>

      <p style={{ marginBottom: "16px", color: "#444" }}>
        No authentication required. Click a user to view details.
      </p>

      <ul style={{ paddingLeft: "20px" }}>
        {data?.getInsecureUsers?.map((user) => (
          <li key={user.userid} style={{ marginBottom: "10px" }}>
            <Link
              to={`/users-graphql/${user.userid}`}
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

      <details>
        <summary style={{ fontWeight: 'bold', fontSize: '18px' }}>
          GQL API Call Details
        </summary>
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #000', backgroundColor: '#f9f9f9' }}>
          <h3>API Request Details:</h3>
          <p><strong>API URL:</strong> {requestDetails.url}</p>
          <p><strong>HTTP Method:</strong> {requestDetails.method}</p>
          <p><strong>Request Body:</strong></p>
          <pre style={{ backgroundColor: '#eee', padding: '10px' }}>{requestDetails.body}</pre>
          <p><strong>Server Response:</strong></p>
          <pre style={{ backgroundColor: '#eee', padding: '10px' }}>{requestDetails.response}</pre>
        </div>
      </details>
    </div>
  );
};

export default ListUsersGraphQLPage;