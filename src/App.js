// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import NavMenu from './components/NavMenu';

import Welcome from './pages/Welcome';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Upload from './pages/Upload';
import Visualize from './pages/Visualize';
import Annotate from './pages/Annotate';
import AnnotatedVisualize from './pages/AnnotatedVisualize';
import Summary from './pages/Summary';

const App = () => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored && stored !== "null" ? stored : null;
  });
  
  const [dataUploaded, setDataUploaded] = useState(localStorage.getItem("data_uploaded") === "true");
  const location = useLocation();

  // Reset session on brand new tab (not reload)
  useEffect(() => {
    const navEntries = performance.getEntriesByType("navigation");
    const isReload = navEntries[0]?.type === "reload";

    if (!isReload) {
      localStorage.removeItem("user");
      localStorage.removeItem("data_uploaded");
      setUser(null);
      setDataUploaded(false);
    }
  }, []);

  // Sync user from localStorage on navigation
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser !== user) {
      setUser(storedUser);
    }
  }, [location, user]);

  // Watch for localStorage changes to data_uploaded
  useEffect(() => {
    const handleStorageChange = () => {
      setDataUploaded(localStorage.getItem("data_uploaded") === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <div>
      <NavMenu user={user} setUser={setUser} />
      <Routes>
        {/* Welcome page if logged out */}
        <Route
          path="/"
          exact
          element={!user ? <Welcome /> : <Navigate to="/upload" />}
        />


        {/* Auth routes */}
        <Route
          path="/login"
          element={!user ? <Login setUser={setUser} /> : <Navigate to="/upload" />}
        />
        <Route
          path="/signup"
          element={!user ? <Signup /> : <Navigate to="/upload" />}
        />

        {/* Upload page after login */}
        <Route
          path="/upload"
          element={user ? <Upload /> : <Navigate to="/" />}
        />

        {/* ✅ These pages are accessible after login — no redirect back to upload */}
        <Route
          path="/visualize"
          element={user ? <Visualize /> : <Navigate to="/" />}
        />
        <Route
          path="/annotate"
          element={user ? <Annotate /> : <Navigate to="/" />}
        />
        <Route
          path="/annotated-visualize"
          element={user ? <AnnotatedVisualize /> : <Navigate to="/" />}
        />
        <Route
          path="/summary"
          element={user ? <Summary /> : <Navigate to="/" />}
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to={user ? "/upload" : "/"} />} />

      </Routes>


    </div>
  );
};

export default App;
