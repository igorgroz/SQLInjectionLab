import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: 'http://localhost:5001/graphql-insecure',
  }),
  cache: new InMemoryCache(),
});

export default apolloClient;