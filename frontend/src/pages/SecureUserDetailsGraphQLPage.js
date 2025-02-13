import React, { useState } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useParams } from 'react-router-dom';
import config from '../config'; // Import the config file

const SecureUserDetailsGraphQLPage = () => {
  const [newClothId, setNewClothId] = useState('');
  const [removeClothId, setRemoveClothId] = useState('');
  const [serverResponse, setServerResponse] = useState(''); // State to hold the server response
  const [graphqlEndpoint, setGraphqlEndpoint] = useState(''); // State to hold the GraphQL endpoint
  const [mutationQuery, setMutationQuery] = useState(''); // State to hold the mutation query

  const { userid } = useParams(); // Get dynamic user ID from the URL
  const parsedUserId = parseInt(userid, 10);

  // GraphQL Query to fetch safe clothes for the user
  const GET_SAFE_CLOTHES_BY_USER = gql`
    query GetSafeClothesByUser($userid: ID!) {
      getSafeClothesByUser(userid: $userid) {
        userid
        name
        surname
        clothid
        description
        color
      }
    }
  `;

  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery(GET_SAFE_CLOTHES_BY_USER, {
    variables: { userid: String(parsedUserId) },
  });

  // Use mutation names that match the Postman query (addSafeCloth & removeSafeCloth)
  const ADD_SAFE_CLOTH = gql`
    mutation AddSafeCloth($userid: ID!, $clothid: String!) {
      addSafeCloth(userid: $userid, clothid: $clothid)
    }
  `;

  const REMOVE_SAFE_CLOTH = gql`
    mutation RemoveSafeCloth($userid: ID!, $clothid: String!) {
      removeSafeCloth(userid: $userid, clothid: $clothid)
    }
  `;

  const [addSafeCloth] = useMutation(ADD_SAFE_CLOTH);
  const [removeSafeCloth] = useMutation(REMOVE_SAFE_CLOTH);

  // Handle Add Cloth (formerly "Update Cloth")
  const handleUpdateCloth = () => {
    const mutation = `
      mutation {
        addSafeCloth(userid: ${parsedUserId}, clothid: ${newClothId})
      }
    `;
    setGraphqlEndpoint(config.GRAPHQL_ENDPOINT); // Set the GraphQL endpoint
    setMutationQuery(mutation); // Set the mutation query

    // Make the request using fetch
    fetch(config.GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: mutation }),
    })
      .then(response => response.json())
      .then(data => {
        console.log('Server Response:', data);
        setServerResponse(`Cloth added: ${data.data.addSafeCloth}`);
        setNewClothId('');
        refetch(); // Refresh query data
      })
      .catch(error => {
        console.error('Error adding cloth:', error);
        setServerResponse('Error adding cloth. Check console for details.');
      });
  };

  // Handle Remove Cloth
  const handleRemoveCloth = () => {
    const mutation = `
      mutation {
        removeSafeCloth(userid: ${parsedUserId}, clothid: ${removeClothId})
      }
    `;
    setGraphqlEndpoint(config.GRAPHQL_ENDPOINT); // Set the GraphQL endpoint
    setMutationQuery(mutation); // Set the mutation query

    // Make the request using fetch
    fetch(config.GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: mutation }),
    })
      .then(response => response.json())
      .then(data => {
        console.log('Server Response:', data);
        setServerResponse(`Cloth removed: ${data.data.removeSafeCloth}`);
        setRemoveClothId('');
        refetch(); // Refresh query data
      })
      .catch(error => {
        console.error('Error removing cloth:', error);
        setServerResponse('Error removing cloth. Check console for details.');
      });
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <hr />
      <h1>User Clothes Information from GraphQL API</h1>

      <h3>Results:</h3>
      {data && data.getSafeClothesByUser && data.getSafeClothesByUser.length > 0 ? (
        <>
          <p>
            <b>UserID:</b> {data.getSafeClothesByUser[0].userid}, <b>Name:</b> {data.getSafeClothesByUser[0].name}, <b>Surname:</b> {data.getSafeClothesByUser[0].surname}
          </p>
          <ul>
            {data.getSafeClothesByUser.map(cloth => (
              <li key={cloth.clothid}>
                <b>ClothID:</b> {cloth.clothid}, <b>Description:</b> {cloth.description}, <b>Color:</b> {cloth.color}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>No data available.</p>
      )}
      <hr />

      {/* Collapsible section for Adding a Cloth */}
      <details open>
        <summary>
          <h2>Add Cloth Item</h2>
        </summary>
        <div>
          <input
            type="text"
            value={newClothId}
            onChange={e => setNewClothId(e.target.value)}
            placeholder="Enter cloth ID to add"
          />
          <button onClick={handleUpdateCloth}>Add Cloth (gql)</button>
        </div>
      </details>
      <hr />

      {/* Collapsible section for Removing a Cloth */}
      <details open>
        <summary>
          <h2>Remove Cloth Item</h2>
        </summary>
        <div>
          <input
            type="text"
            value={removeClothId}
            onChange={e => setRemoveClothId(e.target.value)}
            placeholder="Enter cloth ID to remove"
          />
          <button onClick={handleRemoveCloth}>Remove Cloth (gql)</button>
        </div>
      </details>

      {/* Display the server response and mutation query at the bottom */}
      {serverResponse && (
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid blue' }}>
          <p>Server Response: {serverResponse}</p> {/* Display the latest server response */}        
          <p>GraphQL Endpoint: {graphqlEndpoint}</p> {/* Display the GraphQL endpoint */}
          <p>GraphQl Mutation: {mutationQuery} {/* Display the mutation query */}</p>
        </div>
      )}
    </div>
  );
};

export default SecureUserDetailsGraphQLPage;
