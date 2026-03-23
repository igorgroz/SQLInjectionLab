import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import config from '../config';
import { getAuthHeaders, loginIfNeeded, getAccount } from '../auth/authHeaders';

const SecureUserDetailsRESTPage = () => {
  const [clothes, setClothes] = useState([]);
  const [userDetails, setUserDetails] = useState({});
  const [newClothId, setNewClothId] = useState('');
  const [removeClothId, setRemoveClothId] = useState('');
  const [requestDetails, setRequestDetails] = useState(null);
  const [error, setError] = useState("");

  const { userid } = useParams();
  const parsedUserId = parseInt(userid, 10);

  const REST_API_URL_CLOTHES = `${config.REST_API_BASE_URL}/${parsedUserId}/clothes`;
  const REST_API_USER_DETAILS = `${config.REST_API_BASE_URL}/${parsedUserId}`;
  const REST_API_REMOVE_CLOTH = config.REMOVE_CLOTH_URL;
  const REST_API_UPDATE_CLOTH = `${config.REST_API_BASE_URL}/clothes`;
  const REST_API_UPDATE_CLOTH_INS = `${config.REST_API_BASE_URL_INS}/clothes`;

  const fetchData = async () => {
    try {
      await loginIfNeeded();
      const headers = await getAuthHeaders();

      const userResponse = await axios.get(REST_API_USER_DETAILS, headers);
      setUserDetails(userResponse.data || {});

      const clothesResponse = await axios.get(REST_API_URL_CLOTHES, headers);
      setClothes(clothesResponse.data || []);

      setError("");
    } catch (err) {
      console.error('Error fetching secure REST data:', err);
      setError(err.response?.data ? JSON.stringify(err.response.data) : err.message);
    }
  };

  useEffect(() => {
    if (userid) {
      fetchData();
    }
  }, [userid]);

  const handleUpdateCloth = async () => {
    const payload = { userid: parsedUserId, clothid: parseInt(newClothId, 10) };

    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(REST_API_UPDATE_CLOTH, payload, headers);

      setRequestDetails({
        method: 'POST',
        url: REST_API_UPDATE_CLOTH,
        body: JSON.stringify(payload, null, 2),
        serverResponse: JSON.stringify(response.data, null, 2),
      });

      setNewClothId('');
      fetchData();
      setError("");
    } catch (err) {
      console.error('Error updating cloth:', err);
      setError(err.response?.data ? JSON.stringify(err.response.data) : err.message);
      setRequestDetails({
        method: 'POST',
        url: REST_API_UPDATE_CLOTH,
        body: JSON.stringify(payload, null, 2),
        serverResponse: `Error: ${err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message}`,
      });
    }
  };

  const handleUpdateClothIns = async () => {
    const payload = { userid: parsedUserId, clothid: parseInt(newClothId, 10) };

    try {
      const response = await axios.post(REST_API_UPDATE_CLOTH_INS, payload);

      setRequestDetails({
        method: 'POST',
        url: REST_API_UPDATE_CLOTH_INS,
        body: JSON.stringify(payload, null, 2),
        serverResponse: JSON.stringify(response.data, null, 2),
      });

      setNewClothId('');
      fetchData();
    } catch (err) {
      console.error('Error updating cloth insecurely:', err);
      setRequestDetails({
        method: 'POST',
        url: REST_API_UPDATE_CLOTH_INS,
        body: JSON.stringify(payload, null, 2),
        serverResponse: `Error: ${err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message}`,
      });
    }
  };

  const handleRemoveCloth = async () => {
    const payload = { userid: parsedUserId, clothid: parseInt(removeClothId, 10) };

    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(REST_API_REMOVE_CLOTH, payload, headers);

      setRequestDetails({
        method: 'POST',
        url: REST_API_REMOVE_CLOTH,
        body: JSON.stringify(payload, null, 2),
        serverResponse: JSON.stringify(response.data, null, 2),
      });

      setRemoveClothId('');
      fetchData();
      setError("");
    } catch (err) {
      console.error('Error removing cloth:', err);
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
      <h1>User Clothes Information from Secure REST API</h1>

      <p>
        <strong>Signed in user:</strong> {getAccount()?.username || "Not signed in"}
      </p>

      {error && (
        <div style={{ color: "red", marginBottom: "15px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <p>
        <b>UserID:</b> {userDetails.userid} <b>Name:</b> {userDetails.name} <b>Surname:</b> {userDetails.surname}
      </p>

      <ul>
        {clothes.map((cloth) => (
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
            <button onClick={handleUpdateCloth}>Add Cloth (Secure REST)</button>
            <button
              onClick={handleUpdateClothIns}
              style={{ backgroundColor: 'red', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', marginLeft: '10px' }}
            >
              Add Cloth (Insecure REST)
            </button>
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
            <button onClick={handleRemoveCloth}>Remove Cloth (Secure REST)</button>
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

export default SecureUserDetailsRESTPage;