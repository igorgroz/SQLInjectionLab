import React from "react";
import { Link, useLocation } from "react-router-dom";

const Menu = ({ logout, username }) => {
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const getLinkClass = (path, type) => {
    const active = isActive(path);

    if (!active) return "menu-link";

    return type === "anonymous"
      ? "menu-link menu-link-anonymous-active"
      : "menu-link menu-link-authenticated-active";
  };

  return (
    <aside className="sidebar">
      <div>
        <Link to="/" className="menu-link" style={{ marginBottom: "24px" }}>
          Home
        </Link>
        <hr className="menu-divider" />

        <nav>
          <Link
            to="/users-rest"
            className={getLinkClass("/users-rest", "anonymous")}
          >
            Anonymous REST
          </Link>

          <Link
            to="/users-graphql"
            className={getLinkClass("/users-graphql", "anonymous")}
          >
            Anonymous GraphQL
          </Link>

          <hr className="menu-divider" />

          <Link
            to="/safe-users-rest"
            className={getLinkClass("/safe-users-rest", "authenticated")}
          >
            Authenticated REST
          </Link>

          <Link
            to="/safe-users-graphql"
            className={getLinkClass("/safe-users-graphql", "authenticated")}
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
        <hr className="menu-divider" />
      </div>
    </aside>
  );
};

export default Menu;