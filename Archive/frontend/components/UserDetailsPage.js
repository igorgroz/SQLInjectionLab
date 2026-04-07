import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

function UserDetailsPage() {
  const { userId } = useParams();
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Send data to the backend to add/update clothes (example API call)
    fetch(`/api/user/${userId}/addClothes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, color }),
    })
      .then(response => response.json())
      .then(data => {
        console.log('Clothes added:', data);
      })
      .catch(err => console.error('Error adding clothes:', err));
  };

  return (
    <div>
      <h1>Add or Update Clothes</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Description:
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <br />
        <label>
          Color:
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        <br />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default UserDetailsPage;
