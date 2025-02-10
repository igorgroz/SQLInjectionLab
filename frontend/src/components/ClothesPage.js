import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

function ClothesPage() {
  const { userId } = useParams();
  const [clothes, setClothes] = useState([]);

  useEffect(() => {
    // Fetch clothes for the user (example API call)
    fetch(`/api/user/${userId}/clothes`)
      .then(response => response.json())
      .then(data => setClothes(data))
      .catch(err => console.error('Error fetching clothes:', err));
  }, [userId]);

  return (
    <div>
      <h1>Clothes for User {userId}</h1>
      <ul>
        {clothes.map(cloth => (
          <li key={cloth.clothid}>
            {cloth.description} - {cloth.color}
          </li>
        ))}
      </ul>
      <Link to={`/user/${userId}/details`}>Add or Update Clothes</Link>
    </div>
  );
}

export default ClothesPage;
