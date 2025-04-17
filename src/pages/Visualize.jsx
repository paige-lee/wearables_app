import React, { useEffect, useMemo, useState, useRef } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';


const API_BASE_URL = 'http://localhost:8000';

const downsample = (arr, step = 10) => arr.filter((_, i) => i % step === 0);

const formatTimestamp = (raw) => {
  const d = new Date(raw);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};


const getHrZone = (age, bpm) => {
  const max = 220 - age;
  if (bpm >= 0.5 * max && bpm <= 0.59 * max) return 1;
  if (bpm >= 0.6 * max && bpm <= 0.69 * max) return 2;
  if (bpm >= 0.7 * max && bpm <= 0.79 * max) return 3;
  if (bpm >= 0.8 * max && bpm <= 0.89 * max) return 4;
  if (bpm >= 0.9 * max && bpm <= max + 15) return 5;
  return 0;
};

const zoneColors = {
  0: 'gray',
  1: 'gray',
  2: 'dodgerblue',
  3: 'green',
  4: 'orange',
  5: 'red',
};

const Visualize = () => {
  const user = localStorage.getItem('user');
  const [data, setData] = useState({});
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [error, setError] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState('stressColor');
  const [nextPlot, setNextPlot] = useState(null);
  const [isLoadingPlot, setIsLoadingPlot] = useState(false);
  const [statusMessages, setStatusMessages] = useState(["Fetching your data..."]);
  const progressTimersScheduled = useRef(false);
  const [isDataUploaded, setIsDataUploaded] = useState(false);


  const plotLabels = {
    stressColor: 'Color-coded Stress Levels',
    hrZones: 'Heart Rate Zones',
    respCompare: 'Respiration Comparison',
  };

  useEffect(() => {
    const uploaded = localStorage.getItem("data_uploaded");
    setIsDataUploaded(uploaded === "true");
  }, []);
  

  useEffect(() => {
    const plots = document.querySelectorAll('.js-plotly-plot .draglayer');
    plots.forEach(plot => {
      plot.style.cursor = 'default';
    });
  }, [selectedPlot, isFetchingData]);
  

  useEffect(() => {
    const fetchAll = async () => {
      setIsFetchingData(true);
      setStatusMessages(["Fetching your data..."]);
  
      // 👇 Only run once
      if (!progressTimersScheduled.current) {
        progressTimersScheduled.current = true;
  
        setTimeout(() => {
          setStatusMessages(prev => [...prev, "Loading heart rate data..."]);
        }, 650);
  
        setTimeout(() => {
          setStatusMessages(prev => [...prev, "Loading stress data..."]);
        }, 1800);

        setTimeout(() => {
          setStatusMessages(prev => [...prev, "Loading respiration data..."]);
        }, 2600);

        setTimeout(() => {
          setStatusMessages(prev => [...prev, "Loading sleep respiration data..."]);
        }, 3500);
  
        setTimeout(() => {
          setStatusMessages(prev => [...prev, "Organizing your dashboard..."]);
        }, 4000);
      }
  
      try {
        const res = await axios.get(`${API_BASE_URL}/all-data/${user}`);
        setData(res.data);
        setError(false);
      } catch (err) {
        console.error("❌ Error fetching /all-data:", err);
        setError(true);
      } finally {
        setIsFetchingData(false); // ✅ Show plots immediately
        setTimeout(() => {
          setStatusMessages(prev => [...prev, "✅ All data loaded."]);
        }, 5);
      }
    };
  
    fetchAll();
  }, [user]);
  

  // ✅ All hooks before conditional returns
  const hasData = useMemo(() =>
    Object.values(data).some(arr => Array.isArray(arr) && arr.length > 0), [data]);

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

  const stressColorTrace = useMemo(() => ({
    x: stressPoints.map(d => d.timestamp_cleaned),
    y: stressPoints.map(d => d.stressLevel),
    type: 'bar',
    name: 'Stress Level',
    showlegend: false,
    marker: {
      color: stressPoints.map(s => {
        const val = s.stressLevel;
        if (val <= 25) return 'dodgerblue';
        if (val <= 50) return 'gold';
        if (val <= 75) return 'darkorange';
        return 'red';
      }),
    },
    text: stressPoints.map(d =>
      `Timestamp: ${formatTimestamp(d.timestamp_cleaned)}<br>Value: ${d.stressLevel}`
    ),    
    hoverinfo: 'text',
  }), [stressPoints]);

  const stressLegendTraces = useMemo(() => [
    { x: [null], y: [null], type: 'bar', name: 'Resting state (0–25)', marker: { color: 'dodgerblue' } },
    { x: [null], y: [null], type: 'bar', name: 'Low stress (26–50)', marker: { color: 'gold' } },
    { x: [null], y: [null], type: 'bar', name: 'Medium stress (51–75)', marker: { color: 'darkorange' } },
    { x: [null], y: [null], type: 'bar', name: 'High stress (76–100)', marker: { color: 'red' } },
  ], []);

  const hrData = useMemo(() => {
    return (data.daily_heart_rate || [])
      .filter(d => d.beatsPerMinute != null && d.timestamp_cleaned != null)
      .sort((a, b) => new Date(a.timestamp_cleaned) - new Date(b.timestamp_cleaned))
      .filter((_, i) => i % 10 === 0)
      .map(d => ({
        time: d.timestamp_cleaned,
        bpm: d.beatsPerMinute,
        zone: getHrZone(23, d.beatsPerMinute),
      }));
  }, [data.daily_heart_rate]);

  const fullHrTrace = useMemo(() => ({
    x: hrData.map(p => p.time),
    y: hrData.map(p => p.bpm),
    type: 'scatter',
    mode: 'lines',
    name: 'Base HR',
    line: { color: 'gray', width: 1.5 },
    showlegend: false,
    text: hrData.map(p =>
      `Timestamp: ${formatTimestamp(p.time)}<br>Value: ${p.bpm}`
    ),    
    hoverinfo: 'text',
  }), [hrData]);

  const zoneSegments = useMemo(() =>
    hrData.slice(0, -1).map((point, i) => {
      const next = hrData[i + 1];
      if (point.zone <= 1) return null;
  
      return {
        x: [point.time, next.time],
        y: [point.bpm, next.bpm],
        type: 'scatter',
        mode: 'lines',
        line: { color: zoneColors[point.zone], width: 2 },
        showlegend: false,
        text: [
          `Timestamp: ${formatTimestamp(point.time)}<br>Value: ${point.bpm}`,
          `Timestamp: ${formatTimestamp(next.time)}<br>Value: ${next.bpm}`
        ],
        hoverinfo: 'text',
      };
    }).filter(Boolean),
  [hrData]);
  

  const zoneLegend = useMemo(() =>
    Object.entries(zoneColors).map(([zone, color]) => ({
      x: [null],
      y: [null],
      type: 'scatter',
      mode: 'lines',
      name: `Zone ${zone}`,
      line: { color: color, width: 2 },
      showlegend: true,
    })),
    []
  );

  const respirationData = useMemo(() => {
    const merged = [
      ...(downsample(data.respiration || [], 5)).map(d => ({
        x: d.timestamp_cleaned,
        y: d.breathsPerMinute,
        source: 'respiration',
      })),
      ...(downsample(data.sleep_respiration || [], 5)).map(d => ({
        x: d.timestamp_cleaned,
        y: d.breathsPerMinute,
        source: 'sleep_respiration',
      })),
    ];

    const sortByTime = arr => [...arr].filter(d => d.x && d.y != null).sort((a, b) => new Date(a.x) - new Date(b.x));

    return {
      respirationCleaned: sortByTime(merged.filter(d => d.source === 'respiration')).filter((_, i) => i % 10 === 0),
      sleepCleaned: sortByTime(merged.filter(d => d.source === 'sleep_respiration')).filter((_, i) => i % 10 === 0),
    };
  }, [data.respiration, data.sleep_respiration]);

  const respirationTrace = {
    x: respirationData.respirationCleaned.map(d => d.x),
    y: respirationData.respirationCleaned.map(d => d.y),
    mode: 'lines',
    name: 'Awake respiration rate',
    line: { color: 'dodgerblue' },
    text: respirationData.respirationCleaned.map(d =>
      `Timestamp: ${formatTimestamp(d.x)}<br>Value: ${d.y}`
    ),    
    hoverinfo: 'text',
  };

  const sleepTrace = {
    x: respirationData.sleepCleaned.map(d => d.x),
    y: respirationData.sleepCleaned.map(d => d.y),
    mode: 'lines',
    name: 'Sleep respiration rate',
    line: { color: 'thistle' },
    text: respirationData.respirationCleaned.map(d =>
      `Timestamp: ${d.x}<br>Value: ${d.y}`
    ),
    hoverinfo: 'text',
  };

  if (!isDataUploaded) {
    return <p>Please upload data before viewing visualizations.</p>;
  }
  
  if (isFetchingData) {
    return (
      <div style={{ fontStyle: 'italic', color: 'gray' }}>
        {statusMessages.map((msg, idx) => (
          <p key={idx} style={{ margin: 0 }}>{msg}</p>
        ))}
      </div>
    );
  }
  
  
  
  if (error || !hasData) return <p style={{ color: 'red' }}>⚠️ No data found. Please upload data and refresh this page.</p>;

  return (
    <div>
      <h2>Visualize Your Data</h2>
      <p style={{ marginTop: '-0.5rem', marginBottom: '1rem', color: '#555' }}>
        Select any of the following stress-related visualizations of your data, and hover to see more information.
      </p>

      <label>Select a visualization:</label>
      <select
        value={selectedPlot}
        onChange={(e) => {
          const selected = e.target.value;
          setIsLoadingPlot(true);
          setNextPlot(selected);
          setTimeout(() => {
            setSelectedPlot(selected);
            setIsLoadingPlot(false);
          }, 1);
        }}
        style={{ marginLeft: '0.75rem' }}  // adds spacing from the label
      >
        <option value="stressColor">Stress Levels</option>
        <option value="hrZones">Heart Rate Zones</option>
        <option value="respCompare">Respiration Rate</option>
      </select>

      <div style={{ height: '1.5rem', marginTop: '1rem' }}>
        {isLoadingPlot && (
          <p style={{ fontStyle: 'italic', color: 'gray', margin: 0 }}>
            Loading {nextPlot && plotLabels[nextPlot]}...
          </p>
        )}
      </div>

      <br /><br />

      {selectedPlot === 'stressColor' && (
        <Plot
          data={[...stressLegendTraces, stressColorTrace]}
          layout={{
            title: {
              text: 'Stress Levels (colored by Garmin stress category)',
              font: {
                family: 'Open Sans, verdana, arial, sans-serif',
                size: 20
              },
              x: 0.5,
              xanchor: 'center'
            },
            xaxis: { title: { text: 'Timestamp' }, type: 'date' },
            yaxis: { title: { text: 'Stress Level'}, range: [0, 100] },
            legend: { orientation: 'v', x: 1.05, y: 1 },
            margin: { t: 50, r: 150 },
            hovermode: 'x',
            bargap: 0.1,
            dragmode: false
          }}
          config={{
            scrollZoom: false, // disables scroll wheel zoom
            displayModeBar: false, // remove toolbar
            displaylogo: false, // optional: removes Plotly logo
            modeBarButtonsToRemove: ['zoom2d', 'pan2d', 'select2d', 'lasso2d'] // remove toolbar zoom tools
          }}
          style={{ cursor: 'default' }}
          onInitialized={() => {
            const plotRoot = document.querySelector('.js-plotly-plot .draglayer');
            if (plotRoot) {
              plotRoot.style.cursor = 'default';
            }
          }}
        />
      )}

      {selectedPlot === 'hrZones' && (
        <Plot
          data={[fullHrTrace, ...zoneLegend, ...zoneSegments]}
          layout={{
            title: {
              text: 'Heart Rate (colored by zone)',
              font: {
                family: 'Open Sans, verdana, arial, sans-serif',
                size: 20
              },
              x: 0.5,
              xanchor: 'center'
            },
            xaxis: { title: { text: 'Timestamp' }, tickangle: 45 },
            yaxis: { title: { text: 'Heart Rate (bpm)' }, range: [40, 200] },
            dragmode: false,
            margin: { t: 50, r: 150 },
          }}
          config={{
            scrollZoom: false, // disables scroll wheel zoom
            displayModeBar: false, // remove toolbar
            displaylogo: false, // optional: removes Plotly logo
            modeBarButtonsToRemove: ['zoom2d', 'pan2d', 'select2d', 'lasso2d'] // remove toolbar zoom tools
          }}
          style={{ cursor: 'default' }}
          onInitialized={() => {
            const plotRoot = document.querySelector('.js-plotly-plot .draglayer');
            if (plotRoot) {
              plotRoot.style.cursor = 'default';
            }
          }}
        />
      )}

      {selectedPlot === 'respCompare' && (
        <Plot
          data={[respirationTrace, sleepTrace]}
          layout={{
            title: {
              text: 'Respiration rate (awake vs. asleep)',
              font: {
                family: 'Open Sans, verdana, arial, sans-serif',
                size: 20
              },
              x: 0.5,
              xanchor: 'center'
            },
            xaxis: { title: { text: 'Timestamp' } },
            yaxis: { title: { text: 'Breaths per Minute' } },
            dragmode: false,
            margin: { t: 50, r: 150 },
          }}
          config={{
            scrollZoom: false, // disables scroll wheel zoom
            displayModeBar: false, // remove toolbar
            displaylogo: false, // optional: removes Plotly logo
            modeBarButtonsToRemove: ['zoom2d', 'pan2d', 'select2d', 'lasso2d'] // remove toolbar zoom tools
          }}
          style={{ cursor: 'default' }}
          onInitialized={() => {
            const plotRoot = document.querySelector('.js-plotly-plot .draglayer');
            if (plotRoot) {
              plotRoot.style.cursor = 'default';
            }
          }}
        />
      )}
    </div>
  );
};

export default Visualize;
