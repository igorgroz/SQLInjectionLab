import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import config from '../config'; // Import the config file

const SecureUserDetailsRESTPage = () => {
  const [clothes, setClothes] = useState([]);
  const [userDetails, setUserDetails] = useState({});
  const [newClothId, setNewClothId] = useState('');
  const [removeClothId, setRemoveClothId] = useState('');
  const [requestDetails, setRequestDetails] = useState(null); // State for API details

  const { userid } = useParams(); // Get dynamic user ID from the URL
  const parsedUserId = parseInt(userid, 10);

  // REST API URLs
  const REST_API_URL_CLOTHES = `${config.REST_API_BASE_URL}/${userid}/clothes`;
  const REST_API_USER_DETAILS = `${config.REST_API_BASE_URL}/${userid}`;
  const REST_API_REMOVE_CLOTH = config.REMOVE_CLOTH_URL;
  const REST_API_UPDATE_CLOTH = `${config.REST_API_BASE_URL}/${userid}/clothes`;

  const fetchData = () => {
    axios.get(REST_API_USER_DETAILS)
      .then((response) => {
        setUserDetails(response.data.user);
        console.log('Fetching from', REST_API_USER_DETAILS);
      })
      .catch((error) => {
        console.error('Error fetching user details:', REST_API_USER_DETAILS, error);
      });

    axios.get(REST_API_URL_CLOTHES)
      .then((response) => {
        setClothes(response.data.clothes);
        console.log('Fetching from', REST_API_URL_CLOTHES);
//        setRequestDetails({
//          method: 'GET',
//          url: REST_API_URL_CLOTHES,
//          serverResponse: JSON.stringify(response.data.clothes, null, 2),         
//        });  
      })
      .catch((error) => {
        console.error('Error fetching clothes:', REST_API_URL_CLOTHES, error);
      });
    
  };

  useEffect(() => {
    if (userid) {
      fetchData();
    }
  }, [userid, REST_API_URL_CLOTHES, REST_API_USER_DETAILS]);

  // Handle update cloth
  const handleUpdateCloth = () => {
    const payload = { clothid: newClothId };

    console.log('API Endpoint:', REST_API_UPDATE_CLOTH);
    console.log('POST Payload:', payload);

    axios.post(REST_API_UPDATE_CLOTH, payload)
      .then((response) => {
        console.log('Server Response:', response);
        setRequestDetails({
          method: 'POST',
          url: REST_API_UPDATE_CLOTH,
          body: JSON.stringify(payload),
          serverResponse: JSON.stringify(response.data), // Save server response
        });
        setNewClothId('');
        fetchData(); // Refresh data
      })
      .catch((error) => {
        console.error('Error updating cloth:', error);
        setRequestDetails({
          method: 'POST',
          url: REST_API_UPDATE_CLOTH,
          body: JSON.stringify(payload),
          serverResponse: `Error: ${error.message}`, // Show error message in response
        });
      });
  };

  // Handle remove cloth
  const handleRemoveCloth = () => {
    const payload = { userid: parsedUserId, clothid: removeClothId };

    console.log('API Endpoint:', REST_API_REMOVE_CLOTH);
    console.log('POST Payload:', payload);

    axios.post(REST_API_REMOVE_CLOTH, payload)
      .then((response) => {
        console.log('Server Response:', response);
        setRequestDetails({
          method: 'POST',
          url: REST_API_REMOVE_CLOTH,
          body: JSON.stringify(payload),
          serverResponse: JSON.stringify(response.data), // Save server response
        });
        setRemoveClothId('');
        fetchData(); // Refresh data
      })
      .catch((error) => {
        console.error('Error removing cloth:', error);
        setRequestDetails({
          method: 'POST',
          url: REST_API_REMOVE_CLOTH,
          body: JSON.stringify(payload),
          serverResponse: `Error: ${error.message}`, // Show error message in response
        });
      });
  };

  return (
    <div>
      <hr />
      <h1>User Clothes Information from REST API</h1>
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

      {/* Flex Container for Adding and Removing Clothes */}
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
            <button onClick={handleUpdateCloth}>Add Cloth (REST)</button>
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
            <button onClick={handleRemoveCloth}>Remove Cloth (REST)</button>
          </div>
        </details>
      </div>
      
      {/* Display API Request Details */}
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
