import React, { useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import config from '../config'; // Import config for GraphQL endpoint

// GraphQL Query for secure users
const GET_SAFE_USERS = gql`
  query {
    getSafeUsers {
      userid
      name
      surname
    }
  }
`;

const SecureUsersPage = () => {
  const { data: graphQLData, loading: graphQLLoading, error: graphQLError } = useQuery(GET_SAFE_USERS);

  // State to store request and response details
  const [requestDetails, setRequestDetails] = useState({
    url: config.GRAPHQL_ENDPOINT,
    method: 'POST',
    body: JSON.stringify({ query: GET_SAFE_USERS.loc.source.body }, null, 2), // Pretty-print the query
    response: null, // Store server response
  });

  // Update server response when data is received
  useEffect(() => {
    if (graphQLData) {
      setRequestDetails(prevDetails => ({
        ...prevDetails,
        response: JSON.stringify(graphQLData, null, 2), // Pretty-print response
      }));
    }
  }, [graphQLData]);

  if (graphQLLoading) return <p>Loading...</p>;
  if (graphQLError) return <p>Error: {graphQLError.message}</p>;


  return (

    <div>
      <h1>Secure Users</h1>

      <h2>Users from GraphQL API:</h2>
      <ul>
        {graphQLData?.getSafeUsers?.map((user) => (
          <li key={user.userid}>{user.name} {user.surname}</li>
        ))}
      </ul>

      {/* API Request Details Section */}
      <details>
      <summary style={{ fontWeight: 'bold', fontSize: '18px' }}>GQL API Call Details</summary>
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

export default SecureUsersPage;
