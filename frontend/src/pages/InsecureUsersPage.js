import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { gql, useQuery } from '@apollo/client';

const REST_API_URL = 'http://localhost:5001/api/insecure-users'; // Insecure REST API URL

// GraphQL Query for insecure users
const GET_INSECURE_USERS = gql`
  query {
    getInsecureUsers {
      userid
      name
      surname
    }
  }
`;

const InsecureUsersPage = () => {
  const [users, setUsers] = useState([]);
  const { data: graphQLData, loading: graphQLLoading, error: graphQLError } = useQuery(GET_INSECURE_USERS);

  useEffect(() => {
    // Fetch users using REST API
    axios.get(REST_API_URL)
      .then((response) => {
        setUsers(response.data.users);
      })
      .catch((error) => console.error('Error fetching users from REST API:', error));
  }, []);

  if (graphQLLoading) return <p>Loading...</p>;
  if (graphQLError) return <p>Error: {graphQLError.message}</p>;

  return (
    <div>
      <h1>Insecure Users</h1>
      <h2>Users from REST API</h2>
      <ul>
        {users.map((user) => (
          <li key={user.userid}>{user.name} {user.surname}</li>
        ))}
      </ul>

      <h2>Users from GraphQL API</h2>
      <ul>
        {graphQLData?.getInsecureUsers?.map((user) => (
          <li key={user.userid}>{user.name} {user.surname}</li>
        ))}
      </ul>
    </div>
  );
};

export default InsecureUsersPage;
