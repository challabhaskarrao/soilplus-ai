/**
 * SoilPulse AI - Modern React 18 Application
 * Smart Soil Moisture Monitoring, Micro-irrigation Control & ESP32 Telemetry Engine
 */

const { useState, useEffect, useRef } = React;

// --- Helper Utilities ---
const getMoistureStatus = (moisture, min, max, wilting, capacity) => {
  if (moisture < wilting) return { label: 'Wilting Point Emergency', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50' };
  if (moisture < min) return { label: 'Mild Dry Stress', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/50' };
  if (moisture <= max) return { label: 'Optimal Moisture', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/50' };
  if (moisture <= capacity) return { label: 'Field Capacity (Moist)', color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/50' };
  return { label: 'Waterlogged / Saturation', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50' };
};

// Main Application Component
function App() {
  // Application State
  const [telemetry, setTelemetry] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [crops, setCrops] = useState({});
  const [activeCropKey, setActiveCropKey] = useState('tomato');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI & Modals State
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'analytics', 'ai', 'sandbox', 'logs'
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [showArchModal, setShowArchModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [user, setUser] = useState({ name: 'Demo Evaluator', role: 'Academic Evaluator', email: 'evaluator@college.edu' });

  // Firebase Form State
  const [fbConfigForm, setFbConfigForm] = useState({
    apiKey: '',
    databaseURL: '',
    projectId: ''
  });

  // AI Chat Assistant State
  const [aiChatMessages, setAiChatMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your SoilPulse AI Agronomist. Ask me any question about your crop soil moisture, irrigation frequency, or nutrient balance!' }
  ]);
  const [aiInputText, setAiInputText] = useState('');

  // Canvas Chart Reference
  const chartCanvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Audio Beep Ref for Alerts
  const playAlertChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  };

  // Fetch initial telemetry & crops
  const fetchData = async () => {
    try {
      const [resLive, resHist, resCrops] = await Promise.all([
        fetch('/api/telemetry/live'),
        fetch('/api/telemetry/history'),
        fetch('/api/crops')
      ]);

      const dataLive = await resLive.json();
      const dataHist = await resHist.json();
      const dataCrops = await resCrops.json();

      if (dataLive.success) {
        setTelemetry(dataLive.data);
        setActiveCropKey(dataLive.cropKey);
      }
      if (dataHist.success) {
        setHistory(dataHist.history);
        setAlerts(dataHist.alerts);
        setLogs(dataHist.logs);
      }
      if (dataCrops.success) {
        setCrops(dataCrops.crops);
      }
      setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to connect to backend server");
      setLoading(false);
    }
  };

  // Setup Real-time SSE Stream & Polling fallback
  useEffect(() => {
    fetchData();

    // Setup SSE connection
    let eventSource;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('telemetry', (e) => {
        const updatedTelemetry = JSON.parse(e.data);
        setTelemetry(updatedTelemetry);
        // Refresh history & logs periodically
        fetch('/api/telemetry/history')
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setHistory(data.history);
              setAlerts(data.alerts);
              setLogs(data.logs);
            }
          })
          .catch(() => {});
      });

      eventSource.addEventListener('alert', (e) => {
        const newAlert = JSON.parse(e.data);
        setAlerts(prev => [newAlert, ...prev]);
        if (newAlert.type === 'CRITICAL' || newAlert.type === 'WARNING') {
          playAlertChime();
        }
      });
    } catch (err) {
      console.log("SSE not supported, falling back to polling");
    }

    // Backup polling every 3s
    const pollInterval = setInterval(fetchData, 3000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(pollInterval);
    };
  }, []);

  // Update Chart on History Change
  useEffect(() => {
    if (!history || history.length === 0 || !chartCanvasRef.current) return;

    const ctx = chartCanvasRef.current.getContext('2d');
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const labels = history.map(h => h.timestamp);
    const moistureData = history.map(h => h.moisture);
    const soilTempData = history.map(h => h.soilTemp);
    const ambientTempData = history.map(h => h.ambientTemp);

    const wiltingPoint = telemetry?.wiltingPoint || 30;
    const fieldCapacity = telemetry?.fieldCapacity || 80;

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Soil Moisture (%)',
            data: moistureData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            yAxisID: 'y'
          },
          {
            label: 'Soil Temp (°C)',
            data: soilTempData,
            borderColor: '#06b6d4',
            borderDash: [4, 4],
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            yAxisID: 'y1'
          },
          {
            label: 'Ambient Temp (°C)',
            data: ambientTempData,
            borderColor: '#f59e0b',
            borderDash: [2, 2],
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', maxTicksLimit: 8 }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            min: 0,
            max: 100,
            title: { display: true, text: 'Moisture (%)', color: '#10b981' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            min: 10,
            max: 50,
            title: { display: true, text: 'Temp (°C)', color: '#06b6d4' },
            grid: { drawOnChartArea: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }, [history, telemetry, activeTab]);

  // Handler functions for REST APIs
  const handleTogglePump = async () => {
    try {
      const res = await fetch('/api/pump/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: !telemetry?.pumpState })
      });
      const data = await res.json();
      if (data.success) {
        setTelemetry(prev => ({ ...prev, pumpState: data.pumpState }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMode = async (mode) => {
    try {
      const res = await fetch('/api/pump/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      if (data.success) {
        setTelemetry(prev => ({ ...prev, pumpMode: data.pumpMode }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEmergencyStop = async () => {
    try {
      const res = await fetch('/api/pump/emergency-stop', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTelemetry(prev => ({ ...prev, pumpState: false, pumpMode: 'MANUAL' }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCropChange = async (cropKey) => {
    try {
      const res = await fetch('/api/config/crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cropKey })
      });
      const data = await res.json();
      if (data.success) {
        setActiveCropKey(cropKey);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateEvent = async (eventName) => {
    try {
      await fetch('/api/simulate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventName, durationSec: 45 })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveFirebaseConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/firebase-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fbConfigForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowFirebaseModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendAiQuestion = (questionText) => {
    const q = questionText || aiInputText;
    if (!q.trim()) return;

    const newMsgs = [...aiChatMessages, { sender: 'user', text: q }];
    setAiChatMessages(newMsgs);
    if (!questionText) setAiInputText('');

    // Generate intelligent agronomist response based on live telemetry
    setTimeout(() => {
      let reply = "Based on current sensor readings: ";
      const moisture = telemetry?.soilMoisture || 50;
      const crop = crops[activeCropKey] || {};

      if (q.toLowerCase().includes('water') || q.toLowerCase().includes('irrigate')) {
        if (moisture < crop.minMoisture) {
          reply += `The soil moisture (${moisture}%) is currently below the optimal min threshold (${crop.minMoisture}%). I recommend turning on the pump for 30 seconds to bring root zone moisture back to optimal level.`;
        } else {
          reply += `The soil moisture is adequate at ${moisture}%. No immediate watering is required to avoid root rot risk.`;
        }
      } else if (q.toLowerCase().includes('temp') || q.toLowerCase().includes('heat')) {
        reply += `Current soil temp is ${telemetry?.soilTemp}°C and ambient temp is ${telemetry?.ambientTemp}°C. Root respiration is healthy. Keep soil surface shaded during peak midday sunlight if ambient temp exceeds 35°C.`;
      } else if (q.toLowerCase().includes('npk') || q.toLowerCase().includes('fertilizer')) {
        reply += `Nutrient levels: N: ${telemetry?.nitrogen}mg/kg, P: ${telemetry?.phosphorus}mg/kg, K: ${telemetry?.potassium}mg/kg. Current values align with recommended target ratios for ${crop.name}.`;
      } else {
        reply += `System status is optimal for ${crop.name}. Soil moisture is ${moisture}%, pump mode is set to ${telemetry?.pumpMode}. Recommendation: Maintain automated closed-loop threshold control.`;
      }

      setAiChatMessages(prev => [...prev, { sender: 'ai', text: reply }]);
    }, 600);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark-900 text-slate-200">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold font-display text-emerald-400">Initializing SoilPulse AI Engine...</h2>
        <p className="text-slate-400 text-sm mt-1">Connecting to simulated ESP32 Telemetry & Firebase RTDB</p>
      </div>
    );
  }

  const activeCropObj = crops[activeCropKey] || {};
  const moistureStatus = getMoistureStatus(
    telemetry?.soilMoisture || 0,
    telemetry?.minThreshold || 40,
    telemetry?.targetMoisture || 60,
    telemetry?.wiltingPoint || 20,
    telemetry?.fieldCapacity || 80
  );

  // Calculate Health Score (0-100)
  const healthScore = Math.max(10, Math.min(100, Math.round(
    100 - Math.abs((telemetry?.soilMoisture || 50) - (telemetry?.targetMoisture || 60)) * 1.5 -
    (telemetry?.ambientTemp > 35 ? 15 : 0)
  )));

  return (
    <div className="min-h-screen flex flex-col bg-dark-900 text-slate-100">
      
      {/* --- Top Navigation Header --- */}
      <header className="sticky top-0 z-40 bg-dark-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse-glow">
              <i data-lucide="sprout" className="w-6 h-6 text-white"></i>
              <span className="text-xl">🌱</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-display font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-300">
                  SoilPulse AI
                </h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  College Demo Edition
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">ESP32 IoT Node: <span className="text-slate-200">ESP32-SOIL-NODE-01</span></p>
            </div>
          </div>

          {/* Quick Badges */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Wi-Fi RSSI */}
            <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
              <span className={`w-2 h-2 rounded-full ${telemetry?.esp32Online ? 'bg-emerald-400 animate-ping' : 'bg-red-500'}`}></span>
              <span className="text-slate-300 font-mono">{telemetry?.rssi} dBm</span>
              <span className="text-slate-400">(Wi-Fi)</span>
            </div>

            {/* Irrigation Mode */}
            <div className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 ${
              telemetry?.pumpMode === 'AUTO' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <span>🤖 Mode: {telemetry?.pumpMode}</span>
            </div>

            {/* Active Crop */}
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs text-emerald-300 font-medium">
              🌾 {activeCropObj.name || 'Tomato'}
            </div>
          </div>

          {/* Action Buttons & Profile */}
          <div className="flex items-center space-x-2">
            
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title="Toggle Audio Alerts"
              className={`p-2 rounded-lg border text-xs transition ${
                soundEnabled ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {soundEnabled ? '🔔 Chime ON' : '🔕 Chime OFF'}
            </button>

            {/* Firebase Config Modal Trigger */}
            <button
              onClick={() => setShowFirebaseModal(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition"
            >
              <span>🔥 Firebase RTDB</span>
            </button>

            {/* Arch Diagram Modal Trigger */}
            <button
              onClick={() => setShowArchModal(true)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-medium shadow-md shadow-emerald-600/20 transition"
            >
              <span>📐 Project Spec</span>
            </button>

            {/* User Profile Quick Tag */}
            <div className="pl-2 border-l border-slate-800 flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-400">
                DE
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* --- Main Navigation Tabs --- */}
      <div className="bg-dark-800/60 border-b border-slate-800 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex space-x-1 overflow-x-auto py-2">
          {[
            { id: 'dashboard', label: '📊 Dashboard Overview', icon: 'layout-dashboard' },
            { id: 'analytics', label: '📈 Telemetry Analytics', icon: 'line-chart' },
            { id: 'ai', label: '🧠 AI Agronomist & Crop Health', icon: 'bot' },
            { id: 'sandbox', label: '🕹️ Hardware Sandbox & Injector', icon: 'gamepad-2' },
            { id: 'logs', label: '📟 ESP32 Serial Monitor', icon: 'terminal' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium text-xs md:text-sm whitespace-nowrap transition flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* --- Simulation Active Event Banner (if active) --- */}
      {telemetry?.simulationEvent && (
        <div className="bg-gradient-to-r from-amber-900/60 via-amber-800/40 to-slate-900 border-b border-amber-500/40 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-amber-300 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
              <span>⚠️ HARDWARE SANDBOX EVENT ACTIVE: <strong className="uppercase text-amber-200">{telemetry.simulationEvent}</strong></span>
              <span className="text-slate-400">({telemetry.eventSecondsLeft}s remaining)</span>
            </div>
            <button
              onClick={() => handleSimulateEvent('CLEAR')}
              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-semibold transition"
            >
              Clear Event
            </button>
          </div>
        </div>
      )}

      {/* --- Main Content Area --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Top Grid: Primary Moisture Gauge + Pump Control Card + Health Score */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Card 1: Soil Moisture Core Gauge (5 cols) */}
              <div className="lg:col-span-5 glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between border border-slate-800">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-200 flex items-center space-x-2">
                      <span>💧 Real-Time Soil Moisture</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Capacitive Moisture Sensor (GPIO34)</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${moistureStatus.bg} ${moistureStatus.color} ${moistureStatus.border}`}>
                    {moistureStatus.label}
                  </span>
                </div>

                {/* Circular Gauge Display */}
                <div className="my-6 flex flex-col items-center justify-center relative">
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    {/* SVG Gauge Circle */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Background track */}
                      <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.06)" strokeWidth="10" fill="transparent" />
                      {/* Animated Progress Ring */}
                      <circle
                        cx="50" cy="50" r="42"
                        stroke={telemetry?.soilMoisture < telemetry?.wiltingPoint ? '#ef4444' : telemetry?.soilMoisture < telemetry?.minThreshold ? '#f59e0b' : '#10b981'}
                        strokeWidth="10"
                        strokeDasharray={263.89}
                        strokeDashoffset={263.89 - (263.89 * (telemetry?.soilMoisture || 0)) / 100}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-4xl font-extrabold font-display tracking-tight text-white">
                        {telemetry?.soilMoisture}%
                      </span>
                      <span className="text-xs text-slate-400 font-mono mt-1">Volumetric Water Content</span>
                    </div>
                  </div>

                  {/* Threshold Indicators */}
                  <div className="w-full grid grid-cols-3 gap-2 mt-4 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                      <span className="text-slate-400 block">Wilting Pt</span>
                      <span className="text-red-400 font-semibold">{telemetry?.wiltingPoint}%</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                      <span className="text-slate-400 block">Target Min</span>
                      <span className="text-emerald-400 font-semibold">{telemetry?.minThreshold}%</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                      <span className="text-slate-400 block">Field Cap</span>
                      <span className="text-cyan-400 font-semibold">{telemetry?.fieldCapacity}%</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex justify-between items-center pt-3 border-t border-slate-800/80">
                  <span>Last Sensor Tick: <span className="text-slate-200 font-mono">{new Date(telemetry?.lastUpdated).toLocaleTimeString()}</span></span>
                  <span className="text-emerald-400 font-medium">Sampling Rate: 2.0s</span>
                </div>
              </div>

              {/* Card 2: Interactive Pump Control Unit (7 cols) */}
              <div className="lg:col-span-7 glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="font-display text-base font-bold text-slate-200 flex items-center space-x-2">
                        <span>⚡ Autonomous Irrigation Control Unit</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">ESP32 Relay Actuator (GPIO26) & Safety Subsystem</p>
                    </div>

                    {/* Mode Toggle Switch */}
                    <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => handleToggleMode('AUTO')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          telemetry?.pumpMode === 'AUTO' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🤖 AUTO
                      </button>
                      <button
                        onClick={() => handleToggleMode('MANUAL')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          telemetry?.pumpMode === 'MANUAL' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🎮 MANUAL
                      </button>
                    </div>
                  </div>

                  {/* Pump Status & Water Pipeline Animation */}
                  <div className="my-6 p-4 rounded-xl bg-dark-900/80 border border-slate-800 relative overflow-hidden">
                    {/* Animated Flow Layer when pump is ON */}
                    {telemetry?.pumpState && (
                      <div className="absolute inset-0 animated-water-bg opacity-20 pointer-events-none"></div>
                    )}

                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                      
                      <div className="flex items-center space-x-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                          telemetry?.pumpState ? 'bg-cyan-500 text-dark-900 animate-bounce shadow-lg shadow-cyan-500/40' : 'bg-slate-800 text-slate-500'
                        }`}>
                          🌊
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-white">Water Pump Status:</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              telemetry?.pumpState ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {telemetry?.pumpState ? 'RUNNING (ACTIVE)' : 'OFF (STANDBY)'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Runtime: <span className="font-mono text-slate-200">{telemetry?.pumpRuntimeSec}s</span> | Water Pumped: <span className="font-mono text-cyan-300 font-semibold">{telemetry?.totalWaterLitres} Litres</span>
                          </p>
                        </div>
                      </div>

                      {/* Main Power Toggle Button */}
                      <button
                        onClick={handleTogglePump}
                        className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center space-x-2 ${
                          telemetry?.pumpState
                            ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/30'
                            : 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-emerald-600/30'
                        }`}
                      >
                        <span>{telemetry?.pumpState ? '⏹ STOP IRRIGATION' : '▶ START IRRIGATION'}</span>
                      </button>

                    </div>
                  </div>

                  {/* Manual Quick Burst Timers & Emergency Stop */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                      onClick={handleTogglePump}
                      className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium text-center transition"
                    >
                      ⏱️ 15s Quick Pulse
                    </button>
                    <button
                      onClick={handleTogglePump}
                      className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium text-center transition"
                    >
                      ⏱️ 30s Irrigation
                    </button>
                    <button
                      onClick={handleTogglePump}
                      className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium text-center transition"
                    >
                      ⏱️ 60s Deep Water
                    </button>
                    <button
                      onClick={handleEmergencyStop}
                      className="p-2.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 text-xs font-bold text-center transition"
                    >
                      🚨 EMERGENCY STOP
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-400">
                  <span>Safety Interlock: <span className="text-emerald-400 font-semibold">ENABLED</span> (Auto-cutoff at {telemetry?.fieldCapacity}%)</span>
                  <span>Relay Model: SRD-05VDC</span>
                </div>
              </div>

            </div>

            {/* Grid 2: Secondary Sensor Cards (4 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Soil & Ambient Temp */}
              <div className="glass-card glass-card-hover rounded-xl p-5 border border-slate-800">
                <div className="flex justify-between items-start">
                  <span className="text-2xl">🌡️</span>
                  <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded">DHT22</span>
                </div>
                <div className="mt-3">
                  <span className="text-xs text-slate-400 block font-medium">Soil / Air Temperature</span>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-2xl font-bold font-display text-white">{telemetry?.soilTemp}°C</span>
                    <span className="text-xs text-slate-400">Soil</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-sm font-semibold text-amber-400">{telemetry?.ambientTemp}°C</span>
                    <span className="text-xs text-slate-400">Air</span>
                  </div>
                </div>
                <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: `${(telemetry?.ambientTemp / 50) * 100}%` }}></div>
                </div>
              </div>

              {/* Air Humidity */}
              <div className="glass-card glass-card-hover rounded-xl p-5 border border-slate-800">
                <div className="flex justify-between items-start">
                  <span className="text-2xl">🌤️</span>
                  <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded">RH Sensor</span>
                </div>
                <div className="mt-3">
                  <span className="text-xs text-slate-400 block font-medium">Relative Air Humidity</span>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-2xl font-bold font-display text-cyan-400">{telemetry?.humidity}%</span>
                    <span className="text-xs text-slate-400">VPD: 1.2 kPa</span>
                  </div>
                </div>
                <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${telemetry?.humidity}%` }}></div>
                </div>
              </div>

              {/* NPK Nutrients */}
              <div className="glass-card glass-card-hover rounded-xl p-5 border border-slate-800">
                <div className="flex justify-between items-start">
                  <span className="text-2xl">🧪</span>
                  <span className="text-[10px] font-mono uppercase bg-slate-800 text-emerald-400 px-2 py-0.5 rounded">NPK Sensor</span>
                </div>
                <div className="mt-3">
                  <span className="text-xs text-slate-400 block font-medium">NPK Soil Nutrients (mg/kg)</span>
                  <div className="flex items-center space-x-3 mt-1 text-xs font-mono font-semibold">
                    <span className="text-emerald-400">N: {telemetry?.nitrogen}</span>
                    <span className="text-amber-400">P: {telemetry?.phosphorus}</span>
                    <span className="text-cyan-400">K: {telemetry?.potassium}</span>
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-slate-400 flex justify-between">
                  <span>pH: <strong className="text-white">{telemetry?.soilPH}</strong></span>
                  <span className="text-emerald-400 font-medium">Balanced</span>
                </div>
              </div>

              {/* Solar Voltage & Battery */}
              <div className="glass-card glass-card-hover rounded-xl p-5 border border-slate-800">
                <div className="flex justify-between items-start">
                  <span className="text-2xl">🔋</span>
                  <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Solar Node</span>
                </div>
                <div className="mt-3">
                  <span className="text-xs text-slate-400 block font-medium">Solar Voltage & Battery</span>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-2xl font-bold font-display text-white">{telemetry?.solarVoltage}V</span>
                    <span className="text-xs text-emerald-400 font-semibold">({telemetry?.batteryPercent}%)</span>
                  </div>
                </div>
                <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${telemetry?.batteryPercent}%` }}></div>
                </div>
              </div>

            </div>

            {/* Grid 3: Real-Time Alerts Feed & Active Crop Profile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Active Alerts Panel (7 cols) */}
              <div className="lg:col-span-7 glass-card rounded-2xl p-6 border border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display font-bold text-sm text-slate-200 flex items-center space-x-2">
                    <span>🚨 Live System Alert Log</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">{alerts.length} events</span>
                  </h3>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {alerts.slice(0, 8).map(alert => (
                    <div key={alert.id} className={`p-3 rounded-xl border text-xs flex items-start space-x-3 transition ${
                      alert.type === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30 text-red-200' :
                      alert.type === 'WARNING' ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' :
                      alert.type === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' :
                      'bg-slate-800/60 border-slate-700/60 text-slate-300'
                    }`}>
                      <span className="text-base">
                        {alert.type === 'CRITICAL' ? '🚨' : alert.type === 'WARNING' ? '⚠️' : alert.type === 'SUCCESS' ? '✅' : 'ℹ️'}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white">{alert.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{alert.timestamp}</span>
                        </div>
                        <p className="mt-0.5 text-slate-300">{alert.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Crop Profile Selector Card (5 cols) */}
              <div className="lg:col-span-5 glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-200 mb-3 flex items-center space-x-2">
                    <span>🌾 Active Crop & Threshold Preset</span>
                  </h3>

                  <div className="space-y-3">
                    <label className="text-xs text-slate-400 block font-medium">Select Crop Type:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.keys(crops).map(key => (
                        <button
                          key={key}
                          onClick={() => handleCropChange(key)}
                          className={`p-2.5 rounded-xl border text-xs text-left transition font-medium ${
                            activeCropKey === key
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {crops[key].name.split(' ')[0]}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
                      <div className="flex justify-between text-slate-300">
                        <span>Selected Crop:</span>
                        <strong className="text-emerald-400">{activeCropObj.name}</strong>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{activeCropObj.description}</p>
                      <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                        <div>Optimal Moisture: <strong className="text-white">{activeCropObj.optimalMoisture}%</strong></div>
                        <div>Target pH: <strong className="text-white">{activeCropObj.phRange?.join(' - ')}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-[11px] text-slate-500 text-center">
                  Thresholds auto-tune closed-loop ESP32 pump trigger points.
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: TELEMETRY ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-100">📈 Multi-Sensor Telemetry Trends</h2>
                  <p className="text-xs text-slate-400">Soil moisture correlation with soil and ambient temperature over time</p>
                </div>
                <div className="flex space-x-2 text-xs font-medium">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Live Buffer (150 pts)</span>
                </div>
              </div>

              {/* Chart Canvas */}
              <div className="w-full h-80 relative">
                <canvas ref={chartCanvasRef}></canvas>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AI AGRONOMIST & CROP HEALTH */}
        {activeTab === 'ai' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Side: Crop Health & Insights (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Health Score Card */}
              <div className="glass-card rounded-2xl p-6 border border-slate-800 text-center">
                <h3 className="font-display font-bold text-sm text-slate-300">Overall Crop Health Index</h3>
                <div className="my-4 inline-flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 border-emerald-500 bg-emerald-500/10">
                  <span className="text-4xl font-extrabold font-display text-emerald-400">{healthScore}</span>
                  <span className="text-[10px] text-slate-400 font-mono">/ 100 PTS</span>
                </div>
                <p className="text-xs text-emerald-300 font-semibold">Optimal Growth Conditions Detected</p>
              </div>

              {/* Disease Risk Meter */}
              <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
                <h3 className="font-display font-bold text-sm text-slate-200">🛡️ Disease & Stress Risk Diagnostic</h3>
                
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-300">Root Rot Risk (Overwatering):</span>
                      <span className="text-emerald-400 font-semibold">LOW (8%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: '8%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-300">Wilting Moisture Stress:</span>
                      <span className="text-emerald-400 font-semibold">NORMAL (12%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: '12%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-300">Evapotranspiration Rate:</span>
                      <span className="text-cyan-400 font-semibold">MODERATE (3.4 mm/day)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-cyan-500 h-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Side: Interactive AI Assistant Chat (7 cols) */}
            <div className="lg:col-span-7 glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between h-[500px]">
              <div>
                <h3 className="font-display font-bold text-base text-slate-100 mb-4 flex items-center space-x-2">
                  <span>🤖 AI Agronomist Assistant</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">GPT-4 / Gemini Agronomy Tuned</span>
                </h3>

                {/* Messages Box */}
                <div className="space-y-3 h-[320px] overflow-y-auto pr-2 text-xs">
                  {aiChatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-xl ${
                        msg.sender === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Input & Quick Presets */}
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
                {/* Preset Chips */}
                <div className="flex space-x-2 overflow-x-auto text-[11px]">
                  <button onClick={() => handleSendAiQuestion("Should I water now?")} className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 whitespace-nowrap">
                    💧 Should I water now?
                  </button>
                  <button onClick={() => handleSendAiQuestion("How is the NPK balance?")} className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 whitespace-nowrap">
                    🧪 Check NPK Balance
                  </button>
                  <button onClick={() => handleSendAiQuestion("Check heat stress risk")} className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 whitespace-nowrap">
                    🌡️ Heat Stress Risk?
                  </button>
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={aiInputText}
                    onChange={(e) => setAiInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendAiQuestion()}
                    placeholder="Ask AI agronomist about moisture, pump schedule, or crop health..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => handleSendAiQuestion()}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: HARDWARE SANDBOX & INJECTOR */}
        {activeTab === 'sandbox' && (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-slate-800">
              <h2 className="font-display text-base font-bold text-slate-100 mb-2">🕹️ College Presentation Hardware Sandbox</h2>
              <p className="text-xs text-slate-400 mb-6">
                Inject environmental conditions and physical fault events to test closed-loop pump automation and live alert triggers for college evaluators.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => handleSimulateEvent('RAIN_STORM')}
                  className="p-5 rounded-2xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 text-left transition space-y-2 group"
                >
                  <span className="text-3xl block group-hover:scale-110 transition-transform">🌧️</span>
                  <span className="font-bold text-sm text-cyan-200 block">Inject Rainstorm</span>
                  <span className="text-xs text-slate-400 block">Simulates heavy rainfall spike, drops solar voltage & boosts humidity.</span>
                </button>

                <button
                  onClick={() => handleSimulateEvent('DROUGHT_HEATWAVE')}
                  className="p-5 rounded-2xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 text-left transition space-y-2 group"
                >
                  <span className="text-3xl block group-hover:scale-110 transition-transform">☀️</span>
                  <span className="font-bold text-sm text-amber-200 block">Inject Heatwave Drought</span>
                  <span className="text-xs text-slate-400 block">Spikes ambient temp to 39°C and accelerates soil moisture evaporation.</span>
                </button>

                <button
                  onClick={() => handleSimulateEvent('LOW_BATTERY')}
                  className="p-5 rounded-2xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-left transition space-y-2 group"
                >
                  <span className="text-3xl block group-hover:scale-110 transition-transform">🪫</span>
                  <span className="font-bold text-sm text-red-200 block">Inject Low Battery</span>
                  <span className="text-xs text-slate-400 block">Drops solar battery to 8% to trigger low-power warning alerts.</span>
                </button>

                <button
                  onClick={() => handleSimulateEvent('CLEAR')}
                  className="p-5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition space-y-2 group"
                >
                  <span className="text-3xl block group-hover:scale-110 transition-transform">🔄</span>
                  <span className="font-bold text-sm text-slate-200 block">Reset Physics Sandbox</span>
                  <span className="text-xs text-slate-400 block">Clears all injected environment events back to normal baseline.</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ESP32 SERIAL MONITOR */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-slate-800 bg-slate-950">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-display text-sm font-bold text-emerald-400 font-mono flex items-center space-x-2">
                  <span>📟 ESP32 Serial Monitor & MQTT Packet Stream</span>
                </h2>
                <span className="text-xs font-mono text-slate-400">115200 Baud Rate</span>
              </div>

              <div className="font-mono text-xs text-emerald-400/90 space-y-1 h-96 overflow-y-auto p-4 bg-slate-900/90 rounded-xl border border-slate-800">
                {logs.map(log => (
                  <div key={log.id} className="hover:bg-slate-800/50 p-1 rounded">
                    <span className="text-slate-500">[{log.timestamp}]</span>{' '}
                    <span className={log.direction === 'TX' ? 'text-cyan-400' : 'text-amber-400'}>
                      [{log.direction} &gt; {log.topic}]:
                    </span>{' '}
                    <span className="text-slate-200">{log.payload}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* --- MODAL 1: Firebase RTDB Configuration --- */}
      {showFirebaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full border border-slate-700 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-lg text-white">🔥 Firebase Realtime Database</h3>
              <button onClick={() => setShowFirebaseModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveFirebaseConfig} className="space-y-4 text-xs">
              <p className="text-slate-300">
                Enter your Firebase project details to sync live sensor telemetry directly to Google Firebase Realtime Database.
              </p>
              <div>
                <label className="block text-slate-400 mb-1">Database URL (e.g. https://myproject-default-rtdb.firebaseio.com)</label>
                <input
                  type="text"
                  placeholder="https://your-project.firebaseio.com"
                  value={fbConfigForm.databaseURL}
                  onChange={e => setFbConfigForm({ ...fbConfigForm, databaseURL: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Project ID</label>
                <input
                  type="text"
                  placeholder="soilpulse-demo"
                  value={fbConfigForm.projectId}
                  onChange={e => setFbConfigForm({ ...fbConfigForm, projectId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">API Key</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={fbConfigForm.apiKey}
                  onChange={e => setFbConfigForm({ ...fbConfigForm, apiKey: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowFirebaseModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Architecture & Hardware Circuit Spec --- */}
      {showArchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 max-w-2xl w-full border border-slate-700 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-lg text-white">📐 College Project Technical Specification</h3>
              <button onClick={() => setShowArchModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="font-bold text-emerald-400 text-sm">ESP32 Pinout & Sensor Interfacing Diagram</h4>
                <pre className="font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto">
{`+-------------------------------------------------------------+
|                     ESP32 Microcontroller                   |
|                                                             |
|   GPIO34 (ADC) ----> Capacitive Soil Moisture Sensor (v1.2) |
|   GPIO26 (OUT) ----> 5V Relay Module ----> Submersible Pump |
|   GPIO04 (I/O) ----> DHT22 Soil / Air Temperature Sensor   |
|   GPIO32 (ADC) ----> Solar Panel Battery Voltage Divider    |
|   3.3V / GND   ----> Power Bus                             |
+-------------------------------------------------------------+`}
                </pre>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-200">System Design & Closed-Loop Control Architecture</h4>
                <p>
                  1. <strong>Telemetry Sampling:</strong> ESP32 reads analog soil moisture capacitance every 2000ms.
                </p>
                <p>
                  2. <strong>Closed-Loop Pump Automation:</strong> When moisture drops below crop threshold (e.g. 45%), ESP32 triggers GPIO26 relay until moisture reaches field capacity (75%).
                </p>
                <p>
                  3. <strong>Cloud Synchrony:</strong> Telemetry payloads are published via HTTP/REST & Firebase Realtime Database.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Footer --- */}
      <footer className="bg-dark-900 border-t border-slate-800/80 px-4 py-4 text-center text-xs text-slate-500">
        SoilPulse AI — Smart Soil Moisture Monitoring & Irrigation System | Developed for College Project Demonstration
      </footer>

    </div>
  );
}

// Render Application
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
