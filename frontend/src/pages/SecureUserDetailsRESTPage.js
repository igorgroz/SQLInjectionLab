import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import config from '../config'; // Import the config file

const SecureUserDetailsRESTPage = () => {
  const [clothes, setClothes] = useState([]);
  const [userDetails, setUserDetails] = useState({});
  const [newClothId, setNewClothId] = useState('');
  const [removeClothId, setRemoveClothId] = useState('');
  const [message, setMessage] = useState(''); // State for messages

  const { userid } = useParams(); // Get dynamic user ID from the URL
  const parsedUserId = parseInt(userid, 10);

  // REST API URLs
  const REST_API_URL_CLOTHES = `${config.REST_API_BASE_URL}/${userid}/clothes`;
  const REST_API_USER_DETAILS = `${config.REST_API_BASE_URL}/${userid}`;
  const REST_API_REMOVE_CLOTH = config.REMOVE_CLOTH_URL;
  const REST_API_UPDATE_CLOTH = `${config.REST_API_BASE_URL}/${userid}/clothes`;

  const fetchData = () => {
    let userMessage = '';
    let clothesMessage = '';

    axios.get(REST_API_USER_DETAILS)
    .then((response) => {
      setUserDetails(response.data.user);
      console.log('Fetching from ' + REST_API_USER_DETAILS);
    })
    .catch((error) => {
      console.error('Error fetching user details from REST API: ' + REST_API_USER_DETAILS, error);
    });

    axios.get(REST_API_URL_CLOTHES)
    .then((response) => {
      setClothes(response.data.clothes);
      console.log('Fetching from ' + REST_API_URL_CLOTHES);
    })
    .catch((error) => {
      console.error('Error fetching clothes from REST API: ' + REST_API_URL_CLOTHES, error);
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
        setMessage(`
          Server Response: ${response.data.message}\n
          REST API Endpoint called: ${REST_API_UPDATE_CLOTH}\n
          Message body: { addSafeCloth(userid: ${parsedUserId}, clothid: ${newClothId}) }
        `);
        setNewClothId('');
        fetchData(); // Refresh data
      })
      .catch((error) => {
        setMessage(`Error updating cloth: ${error.message}`);
        console.error('Error updating cloth:', error);
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
        setMessage(`
          Server Response: ${response.data.message}\n
          REST API Endpoint called: ${REST_API_REMOVE_CLOTH}\n
          Message body: { removeSafeCloth(userid: ${parsedUserId}, clothid: ${removeClothId}) }
        `);
        setRemoveClothId('');
        fetchData(); // Refresh data
      })
      .catch((error) => {
        setMessage(`Error removing cloth: ${error.message}`);
        console.error('Error removing cloth:', error);
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
        <details>
          <summary>
            <h3>Add Cloth Item</h3>
          </summary>
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

        <details>
          <summary>
            <h3>Remove Cloth Item</h3>
          </summary>
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
      <hr />

      {/* Display the last server response message */}
      {message && (
        <div style={{ marginTop: '20px', border: '1px solid #000', padding: '10px', backgroundColor: '#f9f9f9' }}>
          <pre>{message}</pre>
        </div>
      )}
    </div>
  );
};

export default SecureUserDetailsRESTPage;