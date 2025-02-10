import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { gql, useQuery } from '@apollo/client';

const REST_API_URL_CLOTHES = 'http://localhost:5001/api/insecure-users/2/clothes'; // Insecure REST API URL for user 2
const REST_API_REMOVE_CLOTH = 'http://localhost:5001/api/insecure-users/remove-cloth'; // Insecure REST API URL for removing cloth
const REST_API_UPDATE_CLOTH = 'http://localhost:5001/api/insecure-users/2/clothes'; // Insecure REST API URL for updating clothes

// GraphQL Query for clothes by user
const GET_INSECURE_CLOTHES_BY_USER = gql`
  query {
    getInsecureClothesByUser(userid: 2) {
      userid
      name
      surname
      clothid
      description
      color
    }
  }
`;

const InsecureUserDetailsPage = () => {
  const [clothes, setClothes] = useState([]);
  const { data: graphQLData, loading: graphQLLoading, error: graphQLError } = useQuery(GET_INSECURE_CLOTHES_BY_USER);
  const [newClothId, setNewClothId] = useState('');
  const [removeClothId, setRemoveClothId] = useState('');

  useEffect(() => {
    // Fetch clothes using REST API
    axios.get(REST_API_URL_CLOTHES)
      .then((response) => {
        setClothes(response.data.clothes);
      })
      .catch((error) => console.error('Error fetching clothes from REST API:', error));
  }, []);

  if (graphQLLoading) return <p>Loading...</p>;
  if (graphQLError) return <p>Error: {graphQLError.message}</p>;

  // Handle update cloth
  const handleUpdateCloth = () => {
    axios.post(REST_API_UPDATE_CLOTH, { clothid: newClothId })
      .then((response) => {
        alert(`Cloth updated: ${response.data.clothid}`);
        setNewClothId('');
      })
      .catch((error) => console.error('Error updating cloth:', error));
  };

  // Handle remove cloth
  const handleRemoveCloth = () => {
    axios.post(REST_API_REMOVE_CLOTH, { userid: 2, clothid: removeClothId })
      .then((response) => {
        alert(response.data.message);
        setRemoveClothId('');
      })
      .catch((error) => console.error('Error removing cloth:', error));
  };

  return (
    <div>
      <h1>Insecure User Details</h1>
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
        {graphQLData?.getInsecureClothesByUser?.map((cloth) => (
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

export default InsecureUserDetailsPage;
