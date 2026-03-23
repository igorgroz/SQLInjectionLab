import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "../auth/authConfig";

const Menu = () => {
  const location = useLocation();
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const account = accounts && accounts.length > 0 ? accounts[0] : null;

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await instance.logoutPopup({
        mainWindowRedirectUri: "/",
      });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const navLinkStyle = (path) => ({
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "16px 18px",
    marginBottom: "14px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "18px",
    color: "#ffffff",
    backgroundColor: location.pathname === path ? "#4caf50" : "#2b80df",
  });

  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "320px",
        height: "100vh",
        backgroundColor: "#1976e6",
        color: "#ffffff",
        padding: "28px 22px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflowY: "auto",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "22px",
            fontWeight: 800,
            marginBottom: "28px",
          }}
        >
          Home
        </div>

        <nav>
          <Link to="/users-rest" style={navLinkStyle("/users-rest")}>
            Insecure Users REST
          </Link>

          <Link to="/safe-users-rest" style={navLinkStyle("/safe-users-rest")}>
            Secure Users REST
          </Link>
        </nav>
      </div>

      <div>
        {isAuthenticated && account ? (
          <>
            <div
              style={{
                marginBottom: "18px",
                fontSize: "15px",
                lineHeight: 1.4,
                wordBreak: "break-word",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "6px" }}>Signed in as:</div>
              <div>{account.username}</div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "none",
                borderRadius: "8px",
                backgroundColor: "#4caf50",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={handleLogin}
            style={{
              width: "100%",
              padding: "14px 16px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: "#4caf50",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Login
          </button>
        )}
      </div>
    </aside>
  );
};

export default Menu;