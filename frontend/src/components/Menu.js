import React, { useState } from "react";
import { Link } from "react-router-dom";

const Menu = () => {
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (menu) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  return (
    <nav className="bg-gray-900 text-white p-4 shadow-lg">
      <ul className="flex justify-start items-center space-x-2"> {/* Reduced horizontal space */}
        <li>
          <Link to="/" className="hover:text-blue-400 transition">Home</Link>
        </li>

        {/* Users Dropdown */}
        <li className="relative group">
          <button
            onClick={() => toggleDropdown("users")}
            className="hover:text-blue-400 transition flex items-center"
          >
            Users ▼
          </button>
          {openDropdown === "users" && (
            <ul className="absolute left-0 mt-1 w-52 bg-white text-black rounded-lg shadow-lg py-1 border border-gray-300"> {/* Reduced padding and margin */}
              <li className="p-1 hover:bg-gray-100 transition">
                <Link to="/list-users-rest">List Users (REST)</Link>
              </li>
              <li className="p-1 hover:bg-gray-100 transition">
                <Link to="/list-users-graphql">List Users (GraphQL)</Link>
              </li>
            </ul>
          )}
        </li>

        {/* Clothes Dropdown */}
        <li className="relative group">
          <button
            onClick={() => toggleDropdown("clothes")}
            className="hover:text-blue-400 transition flex items-center"
          >
            Clothes ▼
          </button>
          {openDropdown === "clothes" && (
            <ul className="absolute left-0 mt-1 w-52 bg-white text-black rounded-lg shadow-lg py-1 border border-gray-300"> {/* Reduced padding and margin */}
              <li className="p-1 hover:bg-gray-100 transition">
                <Link to="/fetch-user-clothing-rest">Fetch Clothes (REST)</Link>
              </li>
              <li className="p-1 hover:bg-gray-100 transition">
                <Link to="/fetch-user-clothing-graphql">Fetch Clothes (GraphQL)</Link>
              </li>
            </ul>
          )}
        </li>
      </ul>
    </nav>
  );
};

export default Menu;
