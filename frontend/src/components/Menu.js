import React from "react";
import { Link, useLocation } from "react-router-dom";

const Menu = ({ logout, username }) => {
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <aside className="sidebar">
      <div>
        <div className="menu-title">Home</div>

        <nav>
          <Link
            to="/users-rest"
            className={`menu-link ${isActive("/users-rest") ? "active" : ""}`}
          >
            Anonymous REST
          </Link>

          <Link
            to="/safe-users-rest"
            className={`menu-link ${isActive("/safe-users-rest") ? "active" : ""}`}
          >
            Authenticated REST
          </Link>

          <Link
            to="/users-graphql"
            className={`menu-link ${isActive("/users-graphql") ? "active" : ""}`}
          >
            Anonymous GraphQL
          </Link>

          <Link
            to="/safe-users-graphql"
            className={`menu-link ${isActive("/safe-users-graphql") ? "active" : ""}`}
          >
            Authenticated GraphQL
          </Link>
        </nav>
      </div>

      <div className="menu-bottom">
        <div className="menu-user">
          <div><strong>Signed in as:</strong></div>
          <div>{username}</div>
        </div>

        <button className="menu-button" onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Menu;