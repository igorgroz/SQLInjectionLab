// src/App.js
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import UsersPage from './pages/UsersPage';
import ClothesPage from './pages/ClothesPage';
import UserDetailsPage from './pages/UserDetailsPage';

function App() {
  return (
    <div className="App">
      <h1>SQL Injection Lab</h1>
      <Routes>
        <Route path="/" element={<UsersPage />} />
        <Route path="/user/:userId/clothes" element={<ClothesPage />} />
        <Route path="/user/:userId/details" element={<UserDetailsPage />} />
      </Routes>
    </div>
  );
}

export default App;
