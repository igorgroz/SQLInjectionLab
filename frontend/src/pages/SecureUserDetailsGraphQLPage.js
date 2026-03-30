import config from '../config';
import React, { useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import { useParams } from 'react-router-dom';
import { getAccessToken, getAccount } from '../auth/authHeaders';
import authApolloClient from '../authApolloClient';

const SECURE_GRAPHQL_ENDPOINT = config.GRAPHQL_ENDPOINT;

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

const SecureUserDetailsGraphQLPage = () => {
  const { userid } = useParams();
  const parsedUserId = String(userid);

  const [newClothId, setNewClothId] = useState('');
  const [removeClothId, setRemoveClothId] = useState('');
  const [serverResponse, setServerResponse] = useState(null);
  const [graphqlEndpoint, setGraphqlEndpoint] = useState(SECURE_GRAPHQL_ENDPOINT);
  const [mutationQuery, setMutationQuery] = useState('');
  const [requestDetails, setRequestDetails] = useState({
    url: SECURE_GRAPHQL_ENDPOINT,
    method: 'POST',
    body: JSON.stringify(
      {
        query: GET_SAFE_CLOTHES_BY_USER.loc.source.body,
        variables: { userid: parsedUserId },
      },
      null,
      2
    ),
    response: null,
  });

  const { data, loading, error, refetch } = useQuery(GET_SAFE_CLOTHES_BY_USER, {
    variables: { userid: parsedUserId },
    client: authApolloClient,
  });

  useEffect(() => {
    setRequestDetails((prev) => ({
      ...prev,
      body: JSON.stringify(
        {
          query: GET_SAFE_CLOTHES_BY_USER.loc.source.body,
          variables: { userid: parsedUserId },
        },
        null,
        2
      ),
    }));
  }, [parsedUserId]);

  useEffect(() => {
    if (data) {
      setRequestDetails((prev) => ({
        ...prev,
        response: JSON.stringify(data, null, 2),
      }));
    }
  }, [data]);

  const handleMutation = async (mutation, action) => {
    try {
      setGraphqlEndpoint(SECURE_GRAPHQL_ENDPOINT);
      setMutationQuery(mutation);

      const accessToken = await getAccessToken();

      const response = await fetch(SECURE_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query: mutation }),
      });

      const result = await response.json();

      setServerResponse(JSON.stringify(result, null, 2));

      if (action === 'add') setNewClothId('');
      if (action === 'remove') setRemoveClothId('');

      refetch();
    } catch (err) {
      console.error(`Error during ${action} mutation:`, err);
      setServerResponse(`Error: ${err.message}`);
    }
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

  const rows = data?.getSafeClothesByUser || [];

  return (
    <div>
      <hr />
      <h1>Authenticated GraphQL – User Clothes</h1>

      <p>
        <strong>Signed in user:</strong> {getAccount()?.username || "Not signed in"}
      </p>

      {rows.length > 0 ? (
        <>
          <p>
            <b>UserID:</b> {rows[0].userid} <b>Name:</b> {rows[0].name} <b>Surname:</b> {rows[0].surname}
          </p>

          <ul>
            {rows.map((cloth) => (
              <li key={cloth.clothid}>
                <b>ClothID:</b> {cloth.clothid} <b>Description:</b> {cloth.description} <b>Color:</b> {cloth.color}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>No clothes found for this user.</p>
      )}

      <hr />

      <details open>
        <summary>Add Cloth Item (Authenticated / Secure GraphQL)</summary>
        <div>
          <input
            type="text"
            value={newClothId}
            onChange={(e) => setNewClothId(e.target.value)}
            placeholder="Enter cloth ID to add"
          />
          <button
            onClick={handleAddCloth}
            style={{
              backgroundColor: '#4caf50',
              color: 'white',
              padding: '10px',
              border: 'none',
              borderRadius: '5px',
              marginLeft: '10px',
            }}
          >
            Add Cloth
          </button>
        </div>
      </details>

      <hr />

      <details open>
        <summary>Remove Cloth Item (Authenticated / Secure GraphQL)</summary>
        <div>
          <input
            type="text"
            value={removeClothId}
            onChange={(e) => setRemoveClothId(e.target.value)}
            placeholder="Enter cloth ID to remove"
          />
          <button
            onClick={handleRemoveCloth}
            style={{
              backgroundColor: '#4caf50',
              color: 'white',
              padding: '10px',
              border: 'none',
              borderRadius: '5px',
              marginLeft: '10px',
            }}
          >
            Remove Cloth
          </button>
        </div>
      </details>
      
      <hr></hr>
      <p style={{ color: "#2e7d32", fontWeight: "600", marginTop: "10px" }}>
        This page demonstrates authenticated access and safer input handling.
      </p>
      <hr></hr>

      <details open>
        <summary>Last API Call Details</summary>
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

          <p><strong>Initial Query:</strong></p>
          <pre style={{ backgroundColor: '#eee', padding: '10px' }}>{requestDetails.body}</pre>

          {mutationQuery && (
            <>
              <p><strong>Last Mutation:</strong></p>
              <pre style={{ backgroundColor: '#eee', padding: '10px' }}>{mutationQuery}</pre>
            </>
          )}

          <p><strong>Query Response:</strong></p>
          <pre style={{ backgroundColor: '#eee', padding: '10px' }}>{requestDetails.response}</pre>

          {serverResponse && (
            <>
              <h3>Mutation Response:</h3>
              <pre style={{ backgroundColor: '#eee', padding: '10px' }}>{serverResponse}</pre>
            </>
          )}
        </div>
      </details>
    </div>
  );
};

export default SecureUserDetailsGraphQLPage;