import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { gql, useQuery } from '@apollo/client';

const REST_API_URL = 'http://localhost:5001/api/insecure-users/2/clothes'; // Insecure REST API URL (for user 2)

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

const InsecureClothesPage = () => {
  const [clothes, setClothes] = useState([]);
  const { data: graphQLData, loading: graphQLLoading, error: graphQLError } = useQuery(GET_INSECURE_CLOTHES_BY_USER);

  useEffect(() => {
    // Fetch clothes using REST API
    axios.get(REST_API_URL)
      .then((response) => {
        setClothes(response.data.clothes);
      })
      .catch((error) => console.error('Error fetching clothes from REST API:', error));
  }, []);

  if (graphQLLoading) return <p>Loading...</p>;
  if (graphQLError) return <p>Error: {graphQLError.message}</p>;

  return (
    <div>
      <h1>Insecure Clothes</h1>
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
    </div>
  );
};

export default InsecureClothesPage;
