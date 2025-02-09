// src/components/Header.js
import React from 'react';
import { Link } from 'react-router-dom';

function Header() {
  return (
    <header>
      <nav>
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/user/1/clothes">User 1 Clothes</Link></li>
          <li><Link to="/user/2/clothes">User 2 Clothes</Link></li>
          <li><Link to="/user/1/details">User 1 Details</Link></li>
          <li><Link to="/user/2/details">User 2 Details</Link></li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;
