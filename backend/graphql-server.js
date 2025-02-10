const { ApolloServer, gql } = require('apollo-server');
const pool = require('./db');  // Import your PostgreSQL connection pool

// Define your GraphQL schema
const typeDefs = gql`
  type User {
    userid: ID!
    name: String!
    surname: String!
  }

  type Query {
    users: [User]!
  }
`;

// Define your resolvers
const resolvers = {
  Query: {
    users: async () => {
      const result = await pool.query("SELECT * FROM users");
      return result.rows;
    },
  },
};

// Create an instance of ApolloServer
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Start the server
server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`Server is running at ${url}`);
});