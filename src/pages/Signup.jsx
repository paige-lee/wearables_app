import React, { useState } from 'react';
import { signup } from '../api/api';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signup({ username, password });
      setMsg("Signup successful! Go log in.");
    } catch {
      setMsg("Signup failed.");
    }
  };

  return (
    <div>
      <h2>Sign Up</h2>
      <p style={{ marginBottom: '0.5rem', color: '#555' }}>
        If you're a new user, please sign up by entering a new username and password.
      </p>
      <form onSubmit={handleSubmit}>
        <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
        <button type="submit">Sign Up</button>
      </form>
      <p>{msg}</p>
    </div>
  );
};

export default Signup;
