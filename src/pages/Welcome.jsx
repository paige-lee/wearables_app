// src/pages/Welcome.jsx
import React from 'react';

const Welcome = () => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
         <span style={{ color: '#3b82f6' }}>Transform Your Garmin Data Into Personalized Stress Insights</span>
      </h1>
      <p style={{ fontSize: '1.25rem', color: '#555' }}>
        Visualize, annotate, and explore your physiological data to discover what helps you manage stress best.
      </p>

      <div style={{ margin: '2rem 0' }}>
        <img src="garmin.png" alt="Garmin devices" style={{ height: '240px' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <h3 style={cardTitle}>Visualize Your Stress</h3>
          <p>Explore your stress levels, heart rate zones, and respirations patterns throughout your day.</p>
        </div>
        <div style={cardStyle}>
          <h3 style={cardTitle}>Tag Life Events and Interventions</h3>
          <p>Mark key stress-inducing events like parties and stress-reducing interventions like meditation.</p>
        </div>
        <div style={cardStyle}>
          <h3 style={cardTitle}>Track What Actually Works</h3>
          <p>Use annotations to discover stress patterns to build your own personalized stress management toolkit.</p>
        </div>
      </div>

    </div>
  );
};

const cardStyle = {
  backgroundColor: '#f9f9f9',
  borderRadius: '12px',
  padding: '1.5rem',
  width: '300px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  borderLeft: '5px solid #3b82f6',
};

const cardTitle = {
  color: '#1f2937',
  marginBottom: '0.5rem'
};

export default Welcome;

