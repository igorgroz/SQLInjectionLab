// src/pages/ClothesPage.js
import React from 'react';
import { useParams } from 'react-router-dom';

function ClothesPage() {
  const { userId } = useParams();

  return (
    <div>
      <h2>User {userId} Clothes</h2>
      <p>List of clothes for user {userId} goes right here.</p>
    </div>
  );
}

export default ClothesPage;
