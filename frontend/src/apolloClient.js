import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import config from './config';

const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: config.GRAPHQL_ENDPOINT_INS,
  }),
  cache: new InMemoryCache(),
});

export default apolloClient;
