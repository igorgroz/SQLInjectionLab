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
      getSafeUsers: [User]
      getSafeClothesByUser(userid: ID!): [UserWithClothes]
    }
  
    type Mutation {
      addSafeCloth(userid: ID!, clothid: ID!): String
      removeSafeCloth(userid: ID!, clothid: ID!): String
    }
  `);
  

// Define resolvers
const root = {
  getSafeUsers: async () => {
    try {
      const result = await pool.query("SELECT * FROM users;");
      return result.rows;
    } catch (err) {
      throw new Error(err.message);
    }
  },

  getSafeClothesByUser: async ({ userid }) => {
    try {
      const result = await pool.query(
        `SELECT u.userid, u.name, u.surname, c.clothid, c.description, c.color
        FROM user_clothes uc 
        JOIN clothes c ON uc.clothid = c.clothid
        JOIN users u ON uc.userid = u.userid
        WHERE uc.userid = $1`,
        [userid]
      );
      return result.rows;
    } catch (err) {
      throw new Error(err.message);
    }
  },

  addSafeCloth: async ({ userid, clothid }) => {
    try {
      await pool.query("INSERT INTO user_clothes (userid, clothid) VALUES ($1, $2);", [userid, clothid]);
      return "ClothID " + clothid + ", for userID " + userid + " added securely!";
    } catch (err) {
      throw new Error(err.message);
    }
  },

  removeSafeCloth: async ({ userid, clothid }) => {
    try {
      await pool.query("DELETE FROM user_clothes WHERE userid = $1 AND clothid = $2;", [userid, clothid]);
      return "ClothID " + clothid + ", for userid " + userid + " removed securely!";
    } catch (err) {
      throw new Error(err.message);
    }
  },
};

// Create middleware
const secureGraphQLMiddleware = graphqlHTTP({
  schema,
  rootValue: root,
  graphiql: true, // Enable GraphiQL for debugging
});

module.exports = { secureGraphQLMiddleware };
