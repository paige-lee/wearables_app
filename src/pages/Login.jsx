// src/pages/Login.jsx
import React, { useState } from 'react';
import { login } from '../api/api';
import { useNavigate } from 'react-router-dom';

const Login = ({ setUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login({ username, password });
      localStorage.setItem("user", username);
      setUser(username); // ✅ trigger state update
      navigate('/upload');
    } catch (err) {
      if (err.response?.status === 401) {
        setMsg("Invalid username or password. Please make sure to sign up first.");
      } else {
        setMsg("Invalid username or password. Please make sure to sign up first.");
      }
    }
  };

  return (
    <div>
      <h2>Log In</h2>
      <p style={{ marginBottom: '0.5rem', color: '#555' }}>
        If you're an existing/returning user, please log in by entering your username and password.
      </p>
      <form onSubmit={handleSubmit}>
        <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
        <button type="submit">Log In</button>
      </form>
      <p>{msg}</p>
    </div>
  );
};

export default Login;
