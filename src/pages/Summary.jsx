import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';

//const API_BASE_URL = 'http://localhost:8000';
const API_BASE_URL = "https://wearables-app-backend.onrender.com";

const Summary = () => {
  const user = localStorage.getItem('user');
  const [data, setData] = useState({});
  const [annotations, setAnnotations] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isDataUploaded, setIsDataUploaded] = useState(false);


  // ✅ Fetch data and annotations
  useEffect(() => {
    const uploaded = localStorage.getItem("data_uploaded");
    setIsDataUploaded(uploaded === "true");
  }, []);
  
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/all-data/${user}`);
        const [eventRes, interventionRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/annotations/${user}/event`),
          axios.get(`${API_BASE_URL}/annotations/${user}/intervention`)
        ]);
        setData(res.data);
        setAnnotations([...eventRes.data, ...interventionRes.data]);
      } catch (err) {
        console.error('Error loading summary data:', err);
      } finally {
        setIsFetching(false);
      }
    };

    fetchAll();
  }, [user]);

  // ===== useMemo hooks go before any returns =====
  const stressTrend = useMemo(() => {
    if (!data.stress) return [];
  
    const grouped = {};
    data.stress.forEach(d => {
      if (!d.stressLevel || !d.timestamp_cleaned) return;
      const date = new Date(d.timestamp_cleaned);
      const key = date.toISOString().slice(0, 10); // YYYY-MM-DD only
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(d.stressLevel);
    });
  
    return Object.entries(grouped)
      .map(([date, values]) => ({
        time: date,
        avg: values.reduce((a, b) => a + b, 0) / values.length
      }))
      .sort((a, b) => new Date(a.time) - new Date(b.time));
  }, [data.stress]);
  

  const annotationStats = useMemo(() => {
    const events = annotations.filter(a => a.type === 'event');
    const interventions = annotations.filter(a => a.type === 'intervention');

    const avgDuration = list => {
      const durations = list.map(a => new Date(a.end_time) - new Date(a.start_time));
      return durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60000)
        : 0;
    };

    return {
      eventCount: events.length,
      interventionCount: interventions.length,
      avgEventDuration: avgDuration(events),
      avgInterventionDuration: avgDuration(interventions)
    };
  }, [annotations]);

  const hrZonePercentages = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const maxHR = 220 - 23;
    if (!data.daily_heart_rate) return counts;
  
    let total = 0;
    data.daily_heart_rate.forEach(d => {
      const bpm = d.beatsPerMinute;
      if (!bpm) return;
      let zone = 0;
      if (bpm >= 0.5 * maxHR && bpm <= 0.59 * maxHR) zone = 1;
      else if (bpm >= 0.6 * maxHR && bpm <= 0.69 * maxHR) zone = 2;
      else if (bpm >= 0.7 * maxHR && bpm <= 0.79 * maxHR) zone = 3;
      else if (bpm >= 0.8 * maxHR && bpm <= 0.89 * maxHR) zone = 4;
      else if (bpm >= 0.9 * maxHR && bpm <= maxHR + 15) zone = 5;
  
      if (zone) {
        counts[zone]++;
        total++;
      }
    });
  
    // Convert to percentage
    Object.keys(counts).forEach(k => {
      counts[k] = total > 0 ? Math.round((counts[k] / total) * 100) : 0;
    });
  
    return counts;
  }, [data.daily_heart_rate]);
  

  const respirationStats = useMemo(() => {
    const awake = (data.respiration || []).map(d => d.breathsPerMinute).filter(Boolean);
    const sleep = (data.sleep_respiration || []).map(d => d.breathsPerMinute).filter(Boolean);
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const avgAwake = avg(awake);
    const avgSleep = avg(sleep);
    const percentLower = avgAwake && avgSleep
      ? Math.round(((avgAwake - avgSleep) / avgAwake) * 100)
      : 0;
    return { avgAwake, avgSleep, percentLower };
  }, [data.respiration, data.sleep_respiration]);

  if (!isDataUploaded) {
    return <p>Please upload data before viewing your summary.</p>;
  }
  
  if (isFetching) return <p>Loading...</p>;

  return (
    <div>
      <h2>Your Stress Summary</h2>
      <p style={{ marginTop: '-0.5rem', marginBottom: '1rem', color: '#555' }}>
        Here is a summary of your stress for this time period and your entered annotations. Hover to see more information.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        {/* Row 1 */}
        <div style={{ flex: '1 1 48%' }}>
          <h3>Stress Trend</h3>
          <Plot
            data={[{
              x: stressTrend.map(p => p.time),
              y: stressTrend.map(p => p.avg),
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Avg. Stress',
              line: { color: 'dodgerblue', width: 2 },
              marker: { color: 'dodgerblue', size: 6 },
              text: stressTrend.map(p =>
                `Timestamp: ${p.time}<br>Value: ${p.avg.toFixed(1)}`
              ),
              hoverinfo: 'text',
            }]}
            layout={{
              title: {
                text: 'Average Daily Stress Levels',
                font: { family: 'Open Sans, verdana, arial, sans-serif', size: 20 },
                x: 0.5,
                xanchor: 'center',
              },
              height: 300,
              margin: { t: 60, r: 50, b: 60, l: 70 },
              xaxis: {
                title: { text: 'Date' },
                type: 'category'
              },
              yaxis: {
                title: { text: 'Average Stress Level' },
                range: [0, 100]
              },
              hovermode: 'closest'
            }}
            config={{
              displayModeBar: false,       // Hides toolbar
              scrollZoom: false,           // Disables scroll wheel zoom
              doubleClick: false,          // Disables reset on double click
              displaylogo: false,          // Removes "Plotly" logo
              modeBarButtonsToRemove: [    //  Removes all plot actions
                'zoom2d', 'pan2d', 'select2d', 'lasso2d',
                'zoomIn2d', 'zoomOut2d', 'autoScale2d',
                'resetScale2d', 'hoverClosestCartesian',
                'hoverCompareCartesian', 'toggleSpikelines',
                'sendDataToCloud', 'toImage'
              ]
            }}
            
            useResizeHandler={true}
            style={{ width: '100%', height: '300px' }}
          />


        </div>

        <div style={{ flex: '1 1 48%' }}>
          <h3>Annotation Summary</h3>
          <p>🟦 <strong>Events:</strong> Count: {annotationStats.eventCount}; Average duration: {annotationStats.avgEventDuration} minutes</p>
          <p>🟩 <strong>Interventions:</strong> Count: {annotationStats.interventionCount}; Average duration: {annotationStats.avgInterventionDuration} minutes</p>
        </div>

        {/* Row 2 */}
        <div style={{ flex: '1 1 48%' }}>
          <h3>Heart Rate Zones Distribution</h3>
          <Plot
            data={[{
              x: Object.keys(hrZonePercentages),
              y: Object.values(hrZonePercentages),
              type: 'bar',
              marker: { color: ['gray', 'dodgerblue', 'green', 'orange', 'red'] },
              text: Object.values(hrZonePercentages).map(v => `${v}%`),
              textposition: 'none',
              hoverinfo: 'text',
              hovertext: Object.entries(hrZonePercentages).map(
                ([zone, percent]) => `Zone ${zone}: ${percent}%`
              )
            }]}
            layout={{
              title: {
                text: '% of Time Spent in Each Heart Rate Zone',
                font: {
                  family: 'Open Sans, verdana, arial, sans-serif',
                  size: 20
                },
                x: 0.5,
                xanchor: 'center'
              },
              height: 300,
              margin: { t: 60, r: 50, b: 60, l: 70 },
              xaxis: {
                title: { text: 'Heart Rate Zone' },
                type: 'category'
              },
              yaxis: {
                title: { text: '% of Timestamps in Each Zone' },
                range: [0, 100]
              }
            }}
            config={{
              displayModeBar: false,
              scrollZoom: false
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '300px' }}
          />

        </div>

        <div style={{ flex: '1 1 48%' }}>
          <h3>Respiration Rate Comparison</h3>
          <p>Your breathing rate was <strong>{respirationStats.percentLower}% lower</strong> during sleep.</p>
          <Plot
            data={[{
              x: ['Awake', 'Asleep'],
              y: [respirationStats.avgAwake, respirationStats.avgSleep],
              type: 'bar',
              marker: { color: ['dodgerblue', 'thistle'] },
              text: [
                `Awake: ${respirationStats.avgAwake.toFixed(1)} breaths per minute`,
                `Asleep: ${respirationStats.avgSleep.toFixed(1)} breaths per minute`
              ],
              textposition: 'none',
              hoverinfo: 'text'
            }]}
            layout={{
              title: {
                text: 'Average Respiration Rate: Awake vs. Asleep',
                font: {
                  family: 'Open Sans, verdana, arial, sans-serif',
                  size: 20
                },
                x: 0.5,
                xanchor: 'center'
              },
              height: 300,
              margin: { t: 60, r: 50, b: 60, l: 70 },
              xaxis: {
                title: { text: 'State' },
                type: 'category'
              },
              yaxis: {
                title: { text: 'Average Breaths Per Minute' }
              }
            }}
            
            config={{
              displayModeBar: false,       // Hides toolbar
              scrollZoom: false,           // Disables scroll wheel zoom
              doubleClick: false,          // Disables reset on double click
              displaylogo: false,          // Removes "Plotly" logo
              modeBarButtonsToRemove: [    //  Removes all plot actions
                'zoom2d', 'pan2d', 'select2d', 'lasso2d',
                'zoomIn2d', 'zoomOut2d', 'autoScale2d',
                'resetScale2d', 'hoverClosestCartesian',
                'hoverCompareCartesian', 'toggleSpikelines',
                'sendDataToCloud', 'toImage'
              ]
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Summary;
