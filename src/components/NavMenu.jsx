// src/components/NavMenu.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const NavMenu = ({ user, setUser }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("data_uploaded");
    setUser(null);
    navigate("/");
  };

  return (
    <nav style={{ padding: '1rem', background: '#f8f8f8' }}>
      {!user && (
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate("/")}>Home</button>
          <button onClick={() => navigate("/signup")}>Signup</button>
          <button onClick={() => navigate("/login")}>Login</button>
        </div>
      )}
      {user && (
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate("/upload")}>1. Upload Data</button>
          <button onClick={() => navigate("/visualize")}>2. Visualize Data</button>
          <button onClick={() => navigate("/annotate")}>3. Annotate Data</button>
          <button onClick={() => navigate("/annotated-visualize")}>4. Visualize Annotated Data</button> 
          <button onClick={() => navigate("/summary")}>5. Summary</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  );
};

export default NavMenu;
