import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const InSecureUserDetailsRESTPage = () => {
  const [clothes, setClothes] = useState([]);
  const [userDetails, setUserDetails] = useState({});
  const [newClothId, setNewClothId] = useState('');
  const [removeClothId, setRemoveClothId] = useState('');
  const [requestDetails, setRequestDetails] = useState(null);
  const [error, setError] = useState('');

  const { userid } = useParams();

  const REST_API_USER_DETAILS = `http://localhost:5001/api/insecure-users/${userid}`;
  const REST_API_URL_CLOTHES = `http://localhost:5001/api/insecure-users/${userid}/clothes`;
  const REST_API_UPDATE_CLOTH = `http://localhost:5001/api/insecure-users/clothes`;
  const REST_API_REMOVE_CLOTH = `http://localhost:5001/api/insecure-users/remove-cloth`;

  const fetchData = async () => {
    try {
      const userResponse = await axios.get(REST_API_USER_DETAILS);
      setUserDetails(userResponse.data || {});

      const clothesResponse = await axios.get(REST_API_URL_CLOTHES);
      setClothes(Array.isArray(clothesResponse.data) ? clothesResponse.data : []);

      setError('');
    } catch (err) {
      console.error('Error fetching insecure REST data:', err);
      setError(err.response?.data ? JSON.stringify(err.response.data) : err.message);
      setUserDetails({});
      setClothes([]);
    }
  };

  useEffect(() => {
    if (userid) {
      fetchData();
    }
  }, [userid]);

  // INTENTIONALLY sends raw string input to backend for SQLi lab behavior
  const handleUpdateCloth = async () => {
    const payload = { userid, clothid: newClothId };

    try {
      const response = await axios.post(REST_API_UPDATE_CLOTH, payload);

      setRequestDetails({
        method: 'POST',
        url: REST_API_UPDATE_CLOTH,
        body: JSON.stringify(payload, null, 2),
        serverResponse: JSON.stringify(response.data, null, 2),
      });

      setNewClothId('');
      fetchData();
      setError('');
    } catch (err) {
      console.error('Error updating cloth insecurely:', err);
      setError(err.response?.data ? JSON.stringify(err.response.data) : err.message);
      setRequestDetails({
        method: 'POST',
        url: REST_API_UPDATE_CLOTH,
        body: JSON.stringify(payload, null, 2),
        serverResponse: `Error: ${err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message}`,
      });
    }
  };

  // INTENTIONALLY sends raw string input to backend for SQLi lab behavior
  const handleRemoveCloth = async () => {
    const payload = { userid, clothid: removeClothId };

    try {
      const response = await axios.post(REST_API_REMOVE_CLOTH, payload);

      setRequestDetails({
        method: 'POST',
        url: REST_API_REMOVE_CLOTH,
        body: JSON.stringify(payload, null, 2),
        serverResponse: JSON.stringify(response.data, null, 2),
      });

      setRemoveClothId('');
      fetchData();
      setError('');
    } catch (err) {
      console.error('Error removing cloth insecurely:', err);
      setError(err.response?.data ? JSON.stringify(err.response.data) : err.message);
      setRequestDetails({
        method: 'POST',
        url: REST_API_REMOVE_CLOTH,
        body: JSON.stringify(payload, null, 2),
        serverResponse: `Error: ${err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message}`,
      });
    }
  };

  return (
    <div>
      <hr />
      <h1>User Clothes Information from Insecure REST API</h1>

      {error && (
        <div style={{ color: 'red', marginBottom: '15px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <p>
        <b>UserID:</b> {userDetails.userid} <b>Name:</b> {userDetails.name} <b>Surname:</b> {userDetails.surname}
      </p>

      <ul>
        {(clothes || []).map((cloth) => (
          <li key={cloth.clothid}>
            <b>clothid:</b> {cloth.clothid} <b>Description:</b> {cloth.description} <b>Color:</b> {cloth.color}
          </li>
        ))}
      </ul>

      <hr />

      <div className="flex-container">
        <details open>
          <summary>Add Cloth Item</summary>
          <div>
            <input
              type="text"
              value={newClothId}
              onChange={(e) => setNewClothId(e.target.value)}
              placeholder="Enter clothID to add"
            />
            <button onClick={handleUpdateCloth}>Add Cloth (Insecure REST)</button>
          </div>
        </details>

        <details open>
          <summary>Remove Cloth Item</summary>
          <div>
            <input
              type="text"
              value={removeClothId}
              onChange={(e) => setRemoveClothId(e.target.value)}
              placeholder="Enter clothID to remove"
            />
            <button onClick={handleRemoveCloth}>Remove Cloth (Insecure REST)</button>
          </div>
        </details>
      </div>

      <details open>
        <summary>Last API Call Details</summary>
        {requestDetails && (
          <div style={{ marginTop: '20px', padding: '10px', border: '1px solid blue', backgroundColor: '#f0f8ff' }}>
            <p><strong>REST API Endpoint:</strong> {requestDetails.url}</p>
            <p><strong>Method:</strong> {requestDetails.method}</p>
            <p><strong>Request Body:</strong></p>
            <pre style={{ backgroundColor: '#eee', padding: '10px' }}>{requestDetails.body}</pre>
            <h3>Server Response:</h3>
            <pre style={{ backgroundColor: '#eee', padding: '10px' }}>{requestDetails.serverResponse}</pre>
          </div>
        )}
      </details>
    </div>
  );
};

export default InSecureUserDetailsRESTPage;