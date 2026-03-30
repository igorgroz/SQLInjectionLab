import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getAccessToken } from './auth/authHeaders';
import config from './config';

const httpLink = new HttpLink({
  uri: config.GRAPHQL_ENDPOINT,
});

const authLink = setContext(async (_, { headers }) => {
  const accessToken = await getAccessToken();
  return {
    headers: {
      ...headers,
      Authorization: `Bearer ${accessToken}`,
    },
  };
});

const authApolloClient = new ApolloClient({
  link: ApolloLink.from([authLink, httpLink]),
  cache: new InMemoryCache(),
});

export default authApolloClient;
