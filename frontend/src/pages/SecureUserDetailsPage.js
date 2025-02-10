import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { gql, useQuery } from '@apollo/client';
import { useParams } from 'react-router-dom';

const SecureUserDetailsPage = () => {
  const [clothes, setClothes] = useState([]);
  const [newClothId, setNewClothId] = useState('');
  const [removeClothId, setRemoveClothId] = useState('');

  const { userid } = useParams(); // Get dynamic user ID from the URL
  const parsedUserId = parseInt(userid, 10);

  // REST API URLs
  const REST_API_URL_CLOTHES = `http://localhost:5001/api/safe-users/${userid}/clothes`;
  const REST_API_REMOVE_CLOTH = 'http://localhost:5001/api/safe-users/remove-cloth';
  const REST_API_UPDATE_CLOTH = `http://localhost:5001/api/safe-users/${userid}/clothes`;

  // GraphQL Query
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

  console.log('GraphQL Query:\n', GET_SAFE_CLOTHES_BY_USER.loc.source.body);
  console.log('GraphQL Variables:', { userid: parsedUserId });

  const { data: graphQLData, loading: graphQLLoading, error: graphQLError } = useQuery(GET_SAFE_CLOTHES_BY_USER, {
    variables: { userid: parsedUserId },
  });

  useEffect(() => {
    console.log('Fetching clothes for user ID:', userid);
    console.log('REST API URL for clothes:', REST_API_URL_CLOTHES);

    if (userid) {
      axios.get(REST_API_URL_CLOTHES)
        .then((response) => {
          console.log('REST API response data:', response.data);
          setClothes(response.data.clothes);
        })
        .catch((error) => {
          console.error('Error fetching clothes from REST API:', error);
        });
    }
  }, [userid, REST_API_URL_CLOTHES]);

  useEffect(() => {
    if (graphQLData) console.log('GraphQL Data:', graphQLData);
    if (graphQLLoading) console.log('GraphQL Loading...');
    if (graphQLError) console.log('GraphQL Error:', graphQLError);
  }, [graphQLData, graphQLLoading, graphQLError]);

  // Handle update cloth
  const handleUpdateCloth = () => {
    console.log('Updating cloth with ID:', newClothId);
    axios.post(REST_API_UPDATE_CLOTH, { clothid: newClothId })
      .then((response) => {
        alert(`Cloth updated: ${response.data.clothid}`);
        setNewClothId('');
      })
      .catch((error) => console.error('Error updating cloth:', error));
  };

  // Handle remove cloth
  const handleRemoveCloth = () => {
    console.log('Removing cloth with ID:', removeClothId);
    axios.post(REST_API_REMOVE_CLOTH, { userid: parsedUserId, clothid: removeClothId })
      .then((response) => {
        alert(response.data.message);
        setRemoveClothId('');
      })
      .catch((error) => console.error('Error removing cloth:', error));
  };

  if (graphQLLoading) return <p>Loading...</p>;
  if (graphQLError) return <p>Error: {graphQLError.message}</p>;

  return (
    <div>
      <h1>Secure User Details</h1>

      <h2>Clothes from REST API</h2>
      <ul>
        {clothes.map((cloth) => (
          <li key={cloth.clothid}>
            {cloth.description} - {cloth.color}
          </li>
        ))}
      </ul>

      <h2>Clothes from GraphQL API</h2>
      <ul>
        {graphQLData?.getSafeClothesByUser?.map((cloth) => (
          <li key={cloth.clothid}>
            {cloth.description} - {cloth.color}
          </li>
        ))}
      </ul>

      <div>
        <h2>Update Clothes</h2>
        <input
          type="text"
          value={newClothId}
          onChange={(e) => setNewClothId(e.target.value)}
          placeholder="Enter cloth ID to update"
        />
        <button onClick={handleUpdateCloth}>Update Cloth</button>
      </div>

      <div>
        <h2>Remove Clothes</h2>
        <input
          type="text"
          value={removeClothId}
          onChange={(e) => setRemoveClothId(e.target.value)}
          placeholder="Enter cloth ID to remove"
        />
        <button onClick={handleRemoveCloth}>Remove Cloth</button>
      </div>
    </div>
  );
};

export default SecureUserDetailsPage;
