const { graphqlHTTP } = require("express-graphql");
const { buildSchema } = require("graphql");
const pool = require("./db");

// Define GraphQL schema
const schema = buildSchema(`
    type User {
      userid: ID!
      name: String!
      surname: String!
    }
  
    type Cloth {
      clothid: ID!
      description: String!
      color: String!
    }
  
    # New type that includes User's name and the cloth details
    type UserWithClothes {
      userid: ID!  
      name: String!
      surname: String!
      clothid: ID!
      description: String!
      color: String!
    }
  
    type Query {
      getInsecureUsers: [User]
      getInsecureClothesByUser(userid: ID!): [UserWithClothes]
    }
  
    type Mutation {
      addInsecureCloth(userid: ID!, clothid: ID!): String
      removeInsecureCloth(userid: ID!, clothid: ID!): String
    }
  `);

// Define resolvers
const root = {
  getInsecureUsers: async () => {
    try {
      const result = await pool.query("SELECT * FROM users;");
      return result.rows;
    } catch (err) {
      throw new Error(err.message);
    }
  },

  getInsecureClothesByUser: async ({ userid }) => {
    try {
      // Vulnerable to SQL injection: directly using `userid` in query string
      const result = await pool.query(
        `SELECT u.userid, u.name, u.surname, c.clothid, c.description, c.color
        FROM user_clothes uc 
        JOIN clothes c ON uc.clothid = c.clothid
        JOIN users u ON uc.userid = u.userid
        WHERE uc.userid = ${userid};`  // SQL injection risk here
      );
      return result.rows;
    } catch (err) {
      throw new Error(err.message);
    }
  },

  addInsecureCloth: async ({ userid, clothid }) => {
    try {
      // Vulnerable to SQL injection: directly using `userid` and `clothid` in query string
      await pool.query(
        `INSERT INTO user_clothes (userid, clothid) VALUES (${userid}, '${clothid}');` // SQL injection risk here
      );
      return "Cloth added (potentially insecure)!";
    } catch (err) {
      throw new Error(err.message);
    }
  },

  removeInsecureCloth: async ({ userid, clothid }) => {
    try {
      // Vulnerable to SQL injection: directly using `userid` and `clothid` in query string
      await pool.query(
        `DELETE FROM user_clothes WHERE userid = ${userid} AND clothid = ${clothid};`  // SQL injection risk here
      );
      return "Cloth removed (potentially insecure)!";
    } catch (err) {
      throw new Error(err.message);
    }
  },
};

// Create middleware
const insecureGraphQLMiddleware = graphqlHTTP({
  schema,
  rootValue: root,
  graphiql: true, // Enable GraphiQL for debugging
});

module.exports = { insecureGraphQLMiddleware };
