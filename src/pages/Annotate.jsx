// src/pages/Annotate.jsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';

//const API_BASE_URL = 'http://localhost:8000';
const API_BASE_URL = "https://wearables-app-backend.onrender.com";

const Annotate = () => {
  const user = localStorage.getItem('user');
  const [data, setData] = useState({});
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [selectedRange, setSelectedRange] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [form, setForm] = useState({ type: 'event', label: '', description: '' });
  const [editingAnnotation, setEditingAnnotation] = useState(null); // for editing
  const plotRef = useRef(null); // for changing the cursor when you hover over the plot
  const [selectedAnnotationForHighlight, setSelectedAnnotationForHighlight] = useState(null);
  const tableRef = useRef(null);
  const [isDataUploaded, setIsDataUploaded] = useState(false);

  const fetchAnnotations = async () => {
    try {
      const [eventsRes, interventionsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/annotations/${user}/event`),
        axios.get(`${API_BASE_URL}/annotations/${user}/intervention`)
      ]);
      setAnnotations([...eventsRes.data, ...interventionsRes.data]);
    } catch (err) {
      console.error('❌ Error fetching annotations:', err);
    }
  };

  useEffect(() => {
    const uploaded = localStorage.getItem("data_uploaded");
    const shouldFetch = uploaded === "true";
    setIsDataUploaded(shouldFetch);
  
    if (!shouldFetch) {
      setIsFetchingData(false); // ✅ immediately stop loading if no data
      return;
    }
  
    const fetchAll = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/all-data/${user}`);
        const [eventsRes, interventionsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/annotations/${user}/event`),
          axios.get(`${API_BASE_URL}/annotations/${user}/intervention`)
        ]);
        setData(res.data);
        setAnnotations([...eventsRes.data, ...interventionsRes.data]);
      } catch (err) {
        console.error('❌ Error fetching data:', err);
      } finally {
        setIsFetchingData(false);
      }
    };
  
    fetchAll();
  }, [user]);
  
  

  useEffect(() => {
    const updateCursor = () => {
      const plot = document.querySelector('.js-plotly-plot');
      if (plot) {
        const layers = plot.querySelectorAll('.draglayer, .cursor-crosshair');
        layers.forEach(layer => {
          layer.style.cursor = 'crosshair';
        });
      }
    };
    
  
    const observer = new MutationObserver(updateCursor);
    const container = document.querySelector('.js-plotly-plot');
  
    if (container) {
      updateCursor();
      observer.observe(container, { childList: true, subtree: true });
    }
  
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tableRef.current && !tableRef.current.contains(event.target)) {
        setSelectedAnnotationForHighlight(null);
      }
    };
  
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);
  
  const stressPoints = useMemo(() => {
    return (data.stress || [])
      .filter(d => d.stressLevel != null && d.timestamp_cleaned != null)
      .map(d => ({
        ...d,
        timestamp_cleaned: new Date(d.timestamp_cleaned).toISOString()
      }))
      .sort((a, b) => new Date(a.timestamp_cleaned) - new Date(b.timestamp_cleaned))
      .filter((_, i) => i % 5 === 0);
  }, [data.stress]);

  const highlightShape = useMemo(() => {
    if (selectedRange) {
      return [{
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: selectedRange.start_time,
        x1: selectedRange.end_time,
        y0: 0,
        y1: 1,
        fillcolor: 'rgba(35, 36, 35, 0.15)', // ✅ this is the gray
        line: { width: 0 },
        layer: 'below'
      }];
    } else if (selectedAnnotationForHighlight) {
      return [{
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: selectedAnnotationForHighlight.start_time,
        x1: selectedAnnotationForHighlight.end_time,
        y0: 0,
        y1: 1,
        fillcolor:
          selectedAnnotationForHighlight.type === 'event'
            ? 'rgba(66, 135, 245, 0.25)'
            : 'rgba(40, 200, 120, 0.25)',
        line: { width: 0 },
        layer: 'below'
      }];
    }
    return [];
  }, [selectedRange, selectedAnnotationForHighlight]);
  

  const stressTrace = {
    x: stressPoints.map(d => d.timestamp_cleaned),
    y: stressPoints.map(d => d.stressLevel),
    type: 'bar',
    name: 'Stress Level',
    showlegend: false,
    hoverinfo: 'skip', // ❌ disable tooltip
    marker: {
      color: stressPoints.map(s => {
        const val = s.stressLevel;
        if (val <= 25) return 'dodgerblue';
        if (val <= 50) return 'gold';
        if (val <= 75) return 'darkorange';
        return 'red';
      })
    }
  };

  const handleSelect = (event) => {
    const xRange = event?.range?.x;
    if (xRange) {
      const [start_time, end_time] = xRange;
      setSelectedRange({ start_time, end_time });
      setSelectedAnnotationForHighlight(null); // ✅ Clear any selected annotation
    }
  };
  
  

  const submitAnnotation = async () => {
    try {
      await axios.post(`${API_BASE_URL}/add-annotation`, {
        username: user,
        start_time: selectedRange.start_time,
        end_time: selectedRange.end_time,
        label: form.label,
        type: form.type,
        description: form.description
      });

      setForm({ type: 'event', label: '', description: '' });
      setSelectedRange(null);
      fetchAnnotations(); // refresh table
    } catch (err) {
      console.error('❌ Failed to submit annotation:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/delete-annotation/${id}`);
      fetchAnnotations(); // ✅ Refresh table after deletion
    } catch (err) {
      console.error("❌ Failed to delete annotation:", err);
    }
  };
  
  const handleUpdateAnnotation = async () => {
    try {
      await axios.put(`${API_BASE_URL}/update-annotation`, editingAnnotation);
      setEditingAnnotation(null);
      fetchAnnotations();
    } catch (err) {
      console.error("❌ Failed to update annotation:", err);
    }
  };
  

  if (!isDataUploaded) {
    return <p>Please upload data before using the annotation tools.</p>;
  }
  
  if (isFetchingData) return <p>Loading...</p>;
  

  const stressLegendTraces = [
    { x: [null], y: [null], type: 'bar', name: 'Resting (0–25)', marker: { color: 'dodgerblue' } },
    { x: [null], y: [null], type: 'bar', name: 'Low (26–50)', marker: { color: 'gold' } },
    { x: [null], y: [null], type: 'bar', name: 'Medium (51–75)', marker: { color: 'darkorange' } },
    { x: [null], y: [null], type: 'bar', name: 'High (76–100)', marker: { color: 'red' } }
  ];

  return (
    <div>
      <h2>Annotate Your Data</h2>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px' }}>
        <p style={{ marginBottom: '0.5rem', color: '#555' }}>
          1. Drag your cursor across the stress visualization to select a time range.
        </p>

        <p style={{ marginBottom: '0.5rem', color: '#555' }}>
          2. Fill out the Add Annotation form:
        </p>
        <ul style={{ marginTop: '-0.25rem', marginBottom: '0.75rem', marginLeft: '1.5rem', color: '#555' }}>
          <li>
            Designate the selected time range as an event or intervention.
            <ul style={{ marginTop: '0.25rem', marginBottom: '0.5rem', marginLeft: '1.5rem' }}>
              <li>An event is a life event that occurred that may influence stress levels (ex. going to a party).</li>
              <li>An intervention is a deliberate action that you took in efforts to reduce stress levels (ex. meditate).</li>
            </ul>
          </li>
          <li>Write a concise name for the event or intervention under "Label."</li>
          <li>Write a brief description of the event or intervention.</li>
        </ul>

        <p style={{ marginBottom: '0.5rem', color: '#555' }}>
          3. Click <strong>Save</strong> to add your annotation, or <strong>Cancel</strong> to discard it.
        </p>

        <p style={{ marginBottom: '0.5rem', color: '#555' }}>
          4. Your saved annotations will appear in the table below.
        </p>
      </div>


      

      <Plot
        ref={plotRef}
        className="annotate-crosshair"
        data={[...stressLegendTraces, stressTrace]} // ✅ include legend traces
        layout={{
          title: {
            text: 'Stress levels over time',
            font: {
              family: 'Open Sans, verdana, arial, sans-serif',
              size: 20
            },
            x: 0.5,
            xanchor: 'center'
          },
          xaxis: {
            title: {text: 'Timestamp'},
            type: 'date',
            tickformat: '%Y-%m-%d %H:%M', // ✅ readable format
            tickangle: 0                // ✅ tilted for space
          },
          yaxis: { title: {text: 'Stress Level'}, range: [0, 100] },
          legend: { orientation: 'v', x: 1.05, y: 1 },
          dragmode: 'select',
          hovermode: false,
          margin: { t: 50, r: 150 },
          shapes: highlightShape
        }}
        style={{ width: '100%', height: '400px' }}
        useResizeHandler={true}
        config={{
          displayModeBar: false,
          scrollZoom: false,
        }}
        onInitialized={() => {
          setTimeout(() => {
            const dragLayer = document.querySelector('.js-plotly-plot .draglayer');
            if (dragLayer) {
              dragLayer.style.cursor = 'crosshair';
            }
          }, 500); // slight delay ensures DOM is ready
        }}
        
        onSelected={handleSelect}
      />


      {/* ✅ Annotation Modal */}
      {selectedRange && (
        <div style={{
          border: '1px solid #ccc',
          padding: '1rem',
          marginTop: '1rem',
          background: '#f9f9f9',
          borderRadius: '8px',
          maxWidth: '400px'
        }}>
          <h4>Add Annotation</h4>
          <p>
            <strong>Start:</strong> {new Date(selectedRange.start_time).toLocaleString()}<br />
            <strong>End:</strong> {new Date(selectedRange.end_time).toLocaleString()}
          </p>

          <label>Type:</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            style={{ marginBottom: '0.5rem' }}
          >
            <option value="event">Event</option>
            <option value="intervention">Intervention</option>
          </select>
          <br />

          <label>Label:</label>
          <input
            type="text"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          />

          <label>Description:</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={{ width: '100%', height: '4rem', marginBottom: '0.5rem' }}
          />

          <button onClick={submitAnnotation} style={{ marginRight: '0.5rem' }}>
            Save
          </button>
          <button
            onClick={() => {
              setSelectedRange(null);
              setSelectedAnnotationForHighlight(null); // Clear shaded shape
            }}
          >
            Cancel
          </button>

        </div>
      )}

      {editingAnnotation && (
        <div style={{
          border: '1px solid #ccc',
          padding: '1rem',
          marginTop: '1rem',
          background: '#fffaf0',
          borderRadius: '8px',
          maxWidth: '400px'
        }}>
          <h4>Edit Annotation</h4>

          <label>Type:</label>
          <select
            value={editingAnnotation.type}
            onChange={(e) => setEditingAnnotation({ ...editingAnnotation, type: e.target.value })}
          >
            <option value="event">Event</option>
            <option value="intervention">Intervention</option>
          </select>
          <br />

          <label>Label:</label>
          <input
            type="text"
            value={editingAnnotation.label}
            onChange={(e) => setEditingAnnotation({ ...editingAnnotation, label: e.target.value })}
            style={{ width: '100%' }}
          />

          <label>Description:</label>
          <textarea
            value={editingAnnotation.description}
            onChange={(e) => setEditingAnnotation({ ...editingAnnotation, description: e.target.value })}
            style={{ width: '100%', height: '4rem' }}
          />

          <br />
          <button onClick={handleUpdateAnnotation} style={{ marginRight: '0.5rem' }}>Save</button>
          <button onClick={() => setEditingAnnotation(null)}>Cancel</button>
        </div>
      )}

      {/* ✅ Annotation Table */}
      <div style={{ marginTop: '2rem' }}>
      <h2 style={{ marginTop: '2rem', fontSize: '1.5rem' }}>Saved Annotations</h2>
      <p style={{ marginTop: '-0.5rem', marginBottom: '1rem', color: '#555' }}>
        Click on any annotation row to view its time range highlighted in the stress levels visualization above. You may <strong>Edit</strong> or <strong>Delete</strong> any annotation.
      </p>

      <div ref={tableRef}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ccc' }}>Type</th>
              <th style={{ borderBottom: '1px solid #ccc' }}>Label</th>
              <th style={{ borderBottom: '1px solid #ccc' }}>Start Time</th>
              <th style={{ borderBottom: '1px solid #ccc' }}>End Time</th>
              <th style={{ borderBottom: '1px solid #ccc' }}>Description</th>
              <th style={{ borderBottom: '1px solid #ccc' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {annotations.map((a, i) => (
              <tr
                key={i}
                onClick={() => setSelectedAnnotationForHighlight(a)}
                style={{
                  cursor: 'pointer',
                  backgroundColor:
                    selectedAnnotationForHighlight?.id === a.id
                      ? selectedAnnotationForHighlight.type === 'event'
                        ? 'rgba(66, 135, 245, 0.15)'  // light blue
                        : 'rgba(40, 200, 120, 0.15)'  // light green
                      : 'transparent'
                }}
              >
                <td>{a.type}</td>
                <td>{a.label}</td>
                <td>{new Date(a.start_time).toLocaleString()}</td>
                <td>{new Date(a.end_time).toLocaleString()}</td>
                <td className="description">{a.description}</td>
                <td>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                  >
                    <button onClick={() => setEditingAnnotation(a)}>Edit</button>
                    <button onClick={() => handleDelete(a.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
};

export default Annotate;
