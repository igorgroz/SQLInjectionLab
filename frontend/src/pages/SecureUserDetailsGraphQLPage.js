import React, { useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { useParams } from 'react-router-dom';

const SECURE_GRAPHQL_ENDPOINT = 'http://localhost:5001/graphql-secure';

const SecureUserDetailsGraphQLPage = () => {
  const [newClothId, setNewClothId] = useState('');
  const [removeClothId, setRemoveClothId] = useState('');
  const [serverResponse, setServerResponse] = useState(null);
  const [graphqlEndpoint, setGraphqlEndpoint] = useState('');
  const [mutationQuery, setMutationQuery] = useState('');

  const { userid } = useParams();
  const parsedUserId = parseInt(userid, 10);

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

  const { data, loading, error, refetch } = useQuery(GET_SAFE_CLOTHES_BY_USER, {
    variables: { userid: String(parsedUserId) },
    context: {
      uri: SECURE_GRAPHQL_ENDPOINT,
    },
  });

  const handleMutation = (mutation, action) => {
    setGraphqlEndpoint(SECURE_GRAPHQL_ENDPOINT);
    setMutationQuery(mutation);

    fetch(SECURE_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: mutation }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Server Response:', data);
        setServerResponse(JSON.stringify(data, null, 2));
        if (action === 'add') setNewClothId('');
        if (action === 'remove') setRemoveClothId('');
        refetch();
      })
      .catch((error) => {
        console.error(`Error during ${action} mutation:`, error);
        setServerResponse(`Error: ${error.message}`);
      });
  };

  const handleAddCloth = () => {
    const mutation = `mutation { addSafeCloth(userid: ${parsedUserId}, clothid: ${newClothId}) }`;
    handleMutation(mutation, 'add');
  };

  const handleRemoveCloth = () => {
    const mutation = `mutation { removeSafeCloth(userid: ${parsedUserId}, clothid: ${removeClothId}) }`;
    handleMutation(mutation, 'remove');
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <hr />
      <h1>User Clothes Information from Authenticated GraphQL API</h1>

      {data?.getSafeClothesByUser?.length > 0 ? (
        <>
          <p>
            <b>UserID:</b> {data.getSafeClothesByUser[0].userid},{' '}
            <b>Name:</b> {data.getSafeClothesByUser[0].name},{' '}
            <b>Surname:</b> {data.getSafeClothesByUser[0].surname}
          </p>
          <ul>
            {data.getSafeClothesByUser.map((cloth) => (
              <li key={cloth.clothid}>
                <b>ClothID:</b> {cloth.clothid},{' '}
                <b>Description:</b> {cloth.description},{' '}
                <b>Color:</b> {cloth.color}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>No data available.</p>
      )}

      <hr />

      <details open>
        <summary>Add Cloth Item</summary>
        <input
          type="text"
          value={newClothId}
          onChange={(e) => setNewClothId(e.target.value)}
          placeholder="Enter cloth ID"
        />
        <button onClick={handleAddCloth}>Add Cloth</button>
      </details>

      <hr />

      <details open>
        <summary>Remove Cloth Item</summary>
        <input
          type="text"
          value={removeClothId}
          onChange={(e) => setRemoveClothId(e.target.value)}
          placeholder="Enter cloth ID"
        />
        <button onClick={handleRemoveCloth}>Remove Cloth</button>
      </details>

      <details open>
        <summary>Last API Call Details</summary>
        {serverResponse && (
          <div
            style={{
              marginTop: '20px',
              padding: '10px',
              border: '1px solid blue',
              backgroundColor: '#f0f8ff',
            }}
          >
            <p><strong>GraphQL Endpoint:</strong> {graphqlEndpoint}</p>
            <p><strong>Method:</strong> POST</p>
            <p><strong>GraphQL Mutation:</strong></p>
            <pre style={{ backgroundColor: '#eee', padding: '10px' }}>{mutationQuery}</pre>
            <h3>Server Response:</h3>
            <pre style={{ backgroundColor: '#eee', padding: '10px' }}>{serverResponse}</pre>
          </div>
        )}
      </details>
    </div>
  );
};

export default SecureUserDetailsGraphQLPage;