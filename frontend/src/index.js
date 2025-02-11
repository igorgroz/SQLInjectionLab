import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import config from './config'; // Import the config file

// Set up Apollo Client with the secure endpoint from config.js
const client = new ApolloClient({
  uri: config.GRAPHQL_ENDPOINT, // Use the endpoint from the config file
  cache: new InMemoryCache()
});

// Render the app inside ApolloProvider
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>
);
