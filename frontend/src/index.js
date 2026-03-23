import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance, initializeMsal } from './auth/authHeaders';

const root = ReactDOM.createRoot(document.getElementById('root'));

initializeMsal()
  .then(() => {
    root.render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </React.StrictMode>
    );
  })
  .catch((error) => {
    console.error('MSAL initialization failed:', error);

    root.render(
      <React.StrictMode>
        <div style={{ padding: '20px', color: 'red' }}>
          Failed to initialize authentication. Check browser console.
        </div>
      </React.StrictMode>
    );
  });

reportWebVitals();