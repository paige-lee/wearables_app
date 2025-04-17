import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const wrapText = (text, maxLength = 40) => {
  const words = text.split(' ');
  let lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxLength) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += ' ' + word;
    }
  }

  lines.push(currentLine.trim());
  return lines.join('<br>');
};

const AnnotatedVisualize = () => {
  const user = localStorage.getItem('user');
  const [data, setData] = useState({});
  const [annotations, setAnnotations] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isDataUploaded, setIsDataUploaded] = useState(false);

  useEffect(() => {
    const uploaded = localStorage.getItem("data_uploaded");
    setIsDataUploaded(uploaded === "true");
  }, []);

  useEffect(() => {
    if (!isDataUploaded) return;
  
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
        console.error('❌ Error loading data or annotations:', err);
      } finally {
        setIsFetching(false);
      }
    };
  
    fetchAll();
  }, [user, isDataUploaded]);
  
  

  const stressPoints = useMemo(() => {
    return (data.stress || [])
      .filter(d => d.stressLevel != null && d.timestamp_cleaned != null)
      .map(d => ({
        ...d,
        timestamp_cleaned: new Date(d.timestamp_cleaned).toISOString(),
      }))
      .sort((a, b) => new Date(a.timestamp_cleaned) - new Date(b.timestamp_cleaned))
      .filter((_, i) => i % 5 === 0);
  }, [data.stress]);

  const stressTrace = {
    x: stressPoints.map(d => d.timestamp_cleaned),
    y: stressPoints.map(d => d.stressLevel),
    type: 'bar',
    name: 'Stress Level',
    marker: {
      color: stressPoints.map(s => {
        const val = s.stressLevel;
        if (val <= 25) return 'dodgerblue';
        if (val <= 50) return 'gold';
        if (val <= 75) return 'darkorange';
        return 'red';
      }),
    },
    hoverinfo: 'skip',
    legendgroup: 'stress',
    showlegend: false,
    visible: true // Prevent toggle off
  };

  const annotationShapes = useMemo(() => {
    return annotations.map((a) => ({
      type: 'rect',
      xref: 'x',
      yref: 'paper',
      x0: a.start_time,
      x1: a.end_time,
      y0: 0,
      y1: 1,
      fillcolor: a.type === 'event' ? 'rgba(66, 135, 245, 0.15)' : 'rgba(40, 200, 120, 0.15)',
      line: { width: 0 },
      layer: 'below'
    }));
  }, [annotations]);

  const annotationHoverTraces = useMemo(() => {
    return annotations.map((a) => {
      const hoverColor = a.type === 'event' ? 'rgba(66, 135, 245, 0.8)' : 'rgba(40, 200, 120, 0.8)';
      return {
        x: [a.start_time, a.end_time, a.end_time, a.start_time],
        y: [0, 0, 100, 100],
        type: 'scatter',
        fill: 'toself',
        fillcolor: 'rgba(0,0,0,0)',
        mode: 'none',
        hoverinfo: 'text',
        text: `<b>Label: ${wrapText(a.label)}</b><br>Description: ${wrapText(a.description)}`,
        hoverlabel: {
          bgcolor: hoverColor,
          font: {
            color: 'white',
            family: 'Open Sans, verdana, arial, sans-serif'
          }
        },
        showlegend: false
      };
    });
  }, [annotations]);

  // ✅ Add dummy legend items for Event and Intervention
  const legendTraces = [
    {
      x: [null],
      y: [null],
      type: 'scatter',
      mode: 'markers',
      marker: { color: 'rgba(66, 135, 245, 0.8)', symbol: "square", size: 18 },
      name: 'Event',
      showlegend: true,
      hoverinfo: 'skip',
      legendgroup: "event",
      visible: "legendonly"
    },
    {
      x: [null],
      y: [null],
      type: 'scatter',
      mode: 'markers',
      marker: { color: 'rgba(40, 200, 120, 0.8)', symbol: "square", size: 18 },
      name: 'Intervention',
      showlegend: true,
      hoverinfo: 'skip',
      legendgroup: "intervention",
      visible: "legendonly"
    }
  ];

  if (!isDataUploaded) {
    return <p>Please upload data before viewing annotated visualizations.</p>;
  }

  if (isFetching) return <p>Loading...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Annotated Stress Visualization</h2>

      <p style={{ marginTop: '-0.5rem', marginBottom: '1rem', color: '#555' }}>
        View all of your annotations overlaid on top of your stress data, and hover to see more information.
      </p>

      <Plot
        data={[stressTrace, ...legendTraces, ...annotationHoverTraces]}
        layout={{
          title: {
            text: 'Stress Levels with Annotated Time Ranges',
            font: { family: 'Open Sans, verdana, arial, sans-serif', size: 20 },
            x: 0.5,
            xanchor: 'center',
          },
          xaxis: { title: {text: "Timestamp"}, type: 'date' },
          yaxis: { title: {text: 'Stress Level'}, range: [0, 100] },
          margin: { t: 80, r: 30 },
          hovermode: 'closest',
          shapes: annotationShapes,
          legend: {
            itemclick: false,
            itemdoubleclick: false
          }
          
        }}
        config={{
          displayModeBar: false,
          scrollZoom: false,
          staticPlot: false, // disables interactivity toggling
        }}
        useResizeHandler={true}
        style={{ width: '100%', height: '500px' }}
      />
    </div>
  );
};

export default AnnotatedVisualize;
