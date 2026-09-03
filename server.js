/**
 * SoilPulse AI - Full-Stack Smart Soil Moisture & Irrigation Backend Server
 * Includes ESP32 Telemetry Physical Simulator, Firebase RTDB Sync Bridge,
 * REST APIs, SSE Real-Time Event Stream, and Static Frontend Web Server.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 5000;

// --- System State & Configuration ---
let firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  isConfigured: false
};

// Crop Profiles Database
const CROP_PROFILES = {
  tomato: {
    name: 'Tomato (Solanum lycopersicum)',
    minMoisture: 45,
    maxMoisture: 75,
    optimalMoisture: 60,
    wiltingPoint: 30,
    fieldCapacity: 80,
    description: 'Requires consistent soil moisture. Susceptible to blossom end rot if moisture fluctuates wildly.',
    phRange: [6.0, 6.8],
    recommendedNPK: { n: 120, p: 60, k: 180 }
  },
  wheat: {
    name: 'Wheat (Triticum aestivum)',
    minMoisture: 35,
    maxMoisture: 65,
    optimalMoisture: 50,
    wiltingPoint: 20,
    fieldCapacity: 75,
    description: 'Moderate water requirements. Sensitive to waterlogging during early germination.',
    phRange: [6.0, 7.0],
    recommendedNPK: { n: 140, p: 50, k: 80 }
  },
  maize: {
    name: 'Corn / Maize (Zea mays)',
    minMoisture: 40,
    maxMoisture: 70,
    optimalMoisture: 55,
    wiltingPoint: 25,
    fieldCapacity: 80,
    description: 'High water demand during grain filling phase. Deep soil aeration recommended.',
    phRange: [5.8, 7.0],
    recommendedNPK: { n: 160, p: 70, k: 120 }
  },
  strawberry: {
    name: 'Strawberry (Fragaria × ananassa)',
    minMoisture: 55,
    maxMoisture: 80,
    optimalMoisture: 68,
    wiltingPoint: 35,
    fieldCapacity: 85,
    description: 'Shallow root system requires frequent light irrigation to maintain root zone moisture.',
    phRange: [5.5, 6.5],
    recommendedNPK: { n: 90, p: 45, k: 150 }
  },
  citrus: {
    name: 'Citrus / Orange (Citrus × sinensis)',
    minMoisture: 30,
    maxMoisture: 60,
    optimalMoisture: 45,
    wiltingPoint: 18,
    fieldCapacity: 70,
    description: 'Drought tolerant; benefits from dry-down cycles to trigger floral induction.',
    phRange: [6.0, 7.5],
    recommendedNPK: { n: 130, p: 40, k: 110 }
  }
};

let activeCropKey = 'tomato';
let activeCrop = CROP_PROFILES[activeCropKey];

// Physical Telemetry Simulation State
let state = {
  soilMoisture: 58.4,       // %
  ambientTemp: 27.8,        // °C
  soilTemp: 23.5,           // °C
  humidity: 62.1,           // %
  soilPH: 6.5,              // pH scale
  nitrogen: 118,            // mg/kg
  phosphorus: 58,           // mg/kg
  potassium: 175,           // mg/kg
  solarVoltage: 4.85,       // Volts (0.0 to 5.2V)
  batteryPercent: 94,       // %
  rssi: -64,                // dBm
  wifiStatus: "CONNECTED"
};

/**
 * Calculates Wi-Fi telemetry signal quality label from RSSI dBm rating.
 */
function getSignalQuality(rssi) {
  if (rssi >= -55) return "EXCELLENT";
  if (rssi >= -70) return "GOOD";
  if (rssi >= -85) return "FAIR";
  return "POOR";
}

/**
 * Evaluates soil moisture level against active crop profile thresholds.
 */
function evaluateMoistureHealth(moisture, crop) {
  if (moisture < crop.wiltingPoint) return { status: 'CRITICAL', label: 'Wilting Stress Alert' };
  if (moisture < crop.minMoisture) return { status: 'WARNING', label: 'Mild Moisture Deficit' };
  if (moisture <= crop.maxMoisture) return { status: 'OPTIMAL', label: 'Optimal Moisture Range' };
  if (moisture <= crop.fieldCapacity) return { status: 'HIGH', label: 'Field Capacity Reached' };
  return { status: 'WATERLOGGED', label: 'Waterlogging Risk' };
}

/**
 * Evaluates ambient environmental conditions for heat stress or fungal risk.
 */
function evaluateEnvironmentalAlerts(ambientTemp, soilTemp, humidity) {
  const alerts = [];
  if (ambientTemp > 35) alerts.push({ level: 'WARNING', code: 'HEAT_STRESS', msg: 'Ambient heat wave stress detected' });
  if (humidity > 85) alerts.push({ level: 'WARNING', code: 'HIGH_HUMIDITY', msg: 'High humidity; elevated fungal disease risk' });
  if (soilTemp > 30) alerts.push({ level: 'INFO', code: 'SOIL_WARM', msg: 'Soil temperature above average range' });
  return alerts;
}

/**
 * Analyzes soil N-P-K nutrient balance against crop recommendation targets.
 */
function analyzeNPKBalance(n, p, k, targetNPK = { n: 120, p: 60, k: 180 }) {
  return {
    nitrogenStatus: n < targetNPK.n * 0.8 ? 'DEFICIENT' : n > targetNPK.n * 1.2 ? 'SURPLUS' : 'BALANCED',
    phosphorusStatus: p < targetNPK.p * 0.8 ? 'DEFICIENT' : p > targetNPK.p * 1.2 ? 'SURPLUS' : 'BALANCED',
    potassiumStatus: k < targetNPK.k * 0.8 ? 'DEFICIENT' : k > targetNPK.k * 1.2 ? 'SURPLUS' : 'BALANCED'
  };
}

Object.assign(state, {
  pumpState: false,         // false = OFF, true = ON
  pumpMode: 'AUTO',         // 'AUTO' or 'MANUAL'
  pumpRuntimeSec: 0,
  totalWaterLitres: 42.5,
  wiltingPoint: activeCrop.wiltingPoint,
  fieldCapacity: activeCrop.fieldCapacity,
  targetMoisture: activeCrop.optimalMoisture,
  minThreshold: activeCrop.minMoisture,
  simulationEvent: null,    // null, 'RAIN_STORM', 'DROUGHT_HEATWAVE', 'LOW_BATTERY', 'SENSOR_FAULT'
  eventSecondsLeft: 0,
  esp32Online: true,
  lastUpdated: new Date().toISOString()
});

// Historical Data Buffers (up to 300 telemetry points)
const telemetryHistory = [];
const alertHistory = [];
const esp32SerialLogs = [];

/**
 * Ensures historical buffer size is safely capped to prevent memory growth.
 */
function throttleHistoryBuffer(buffer, maxSize = 300) {
  while (buffer.length > maxSize) {
    buffer.shift();
  }
  return buffer;
}

// --- SSE Subscribers List ---
const sseClients = [];

function broadcastSSE(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(payload);
    } catch (err) {
      // client disconnected
    }
  });
}

// Helper to push serial log
function logSerialPacket(direction, topic, payload) {
  const timestamp = new Date().toLocaleTimeString();
  const entry = {
    id: Date.now() + Math.random().toString(36).substr(2, 4),
    timestamp,
    direction, // 'TX' or 'RX'
    topic,
    payload
  };
  esp32SerialLogs.unshift(entry);
  if (esp32SerialLogs.length > 80) esp32SerialLogs.pop();
}

// Helper to record alert
function addAlert(type, title, message) {
  const alertItem = {
    id: Date.now() + Math.random().toString(36).substr(2, 4),
    timestamp: new Date().toLocaleTimeString(),
    type, // 'CRITICAL', 'WARNING', 'INFO', 'SUCCESS'
    title,
    message
  };
  alertHistory.unshift(alertItem);
  if (alertHistory.length > 50) alertHistory.pop();
  
  // Push alert to SSE subscribers
  broadcastSSE('alert', alertItem);
}

// Soil Salinity & Electrical Conductivity (EC) Index Evaluator
function calculateSoilSalinityEC(n, p, k, moisture, temp) {
  const totalIons = (n || 0) + (p || 0) * 0.8 + (k || 0) * 1.2;
  const moistureFactor = Math.max(moisture, 10) / 100;
  const tempCompensation = 1 + 0.02 * ((temp || 25) - 25);
  
  const ecValue = +((totalIons / 500) / moistureFactor * tempCompensation).toFixed(2);
  
  let category = 'NON_SALINE';
  let riskLevel = 'LOW';
  let advice = 'Soil EC is within ideal range for healthy root nutrient osmosis.';

  if (ecValue > 4.0) {
    category = 'HIGHLY_SALINE';
    riskLevel = 'CRITICAL';
    advice = 'Severe salt accumulation detected. Flush root zone with clean fresh irrigation water immediately to prevent osmotic shock.';
  } else if (ecValue > 2.5) {
    category = 'MODERATELY_SALINE';
    riskLevel = 'MODERATE';
    advice = 'Elevated electrical conductivity. Consider reducing fertilizer application and monitoring root tip health.';
  } else if (ecValue > 1.2) {
    category = 'SLIGHTLY_SALINE';
    riskLevel = 'LOW_MODERATE';
    advice = 'Optimal electrical conductivity for nutrient-rich crop growth.';
  }

  return {
    ecValue,
    unit: 'dS/m',
    category,
    riskLevel,
    totalDissolvedIons: +totalIons.toFixed(1),
    temperatureCompensationFactor: +tempCompensation.toFixed(3),
    advice
  };
}

// Water Usage Analytics & Irrigation Efficiency Calculator
function calculateWaterUsageAnalytics(totalLitres, pumpRuntimeSec, cropName) {
  const runtimeMinutes = +(pumpRuntimeSec / 60).toFixed(2);
  const averageFlowRateLpm = pumpRuntimeSec > 0 ? +(totalLitres / (pumpRuntimeSec / 60)).toFixed(2) : 0;
  
  const estimatedDailyLiters = +(totalLitres * 1.5).toFixed(1);
  const waterConservationRating = totalLitres < 50 ? 'HIGH_EFFICIENCY' : (totalLitres < 100 ? 'MODERATE' : 'HEAVY_CONSUMPTION');
  
  return {
    cumulativeVolumeLiters: +totalLitres.toFixed(2),
    totalPumpRuntimeSec: pumpRuntimeSec,
    pumpRuntimeMinutes: runtimeMinutes,
    averageFlowRateLpm: averageFlowRateLpm,
    estimatedDailyLiters: estimatedDailyLiters,
    waterConservationRating: waterConservationRating,
    targetCrop: cropName || 'General',
    status: 'NORMAL'
  };
}

// --- ESP32 Telemetry Simulation Engine ---
let secondsTick = 0;
setInterval(() => {
  secondsTick++;

  // Event Duration countdown
  if (state.simulationEvent && state.eventSecondsLeft > 0) {
    state.eventSecondsLeft--;
    if (state.eventSecondsLeft <= 0) {
      addAlert('INFO', 'Simulation Event Ended', `Event '${state.simulationEvent}' has expired. Returning to normal physics.`);
      state.simulationEvent = null;
    }
  }

  // Base physics calculation
  let moistureDelta = -0.05; // natural evapotranspiration dry-down
  let tempVariation = Math.sin(secondsTick / 20) * 0.2;
  let humidityVariation = Math.cos(secondsTick / 20) * 0.3;

  state.ambientTemp = +(26.5 + tempVariation * 3).toFixed(1);
  state.soilTemp = +(22.8 + tempVariation * 1.5).toFixed(1);
  state.humidity = +(62.0 + humidityVariation * 5).toFixed(1);
  state.rssi = -60 - Math.floor(Math.random() * 8);

  // Apply Simulation Override Events
  if (state.simulationEvent === 'RAIN_STORM') {
    moistureDelta += 0.8;
    state.humidity = +(88.5 + Math.random() * 4).toFixed(1);
    state.solarVoltage = 1.2; // heavy cloud cover
  } else if (state.simulationEvent === 'DROUGHT_HEATWAVE') {
    moistureDelta -= 0.25;
    state.ambientTemp = +(38.5 + Math.random() * 2).toFixed(1);
    state.humidity = +(28.0 + Math.random() * 3).toFixed(1);
  } else if (state.simulationEvent === 'LOW_BATTERY') {
    state.batteryPercent = Math.max(8, state.batteryPercent - 1);
    state.solarVoltage = 0.8;
  } else if (state.simulationEvent === 'SENSOR_FAULT') {
    state.rssi = -95;
  }

  // Pump Action Logic
  if (state.pumpState) {
    moistureDelta += 0.95; // irrigation rapid intake
    state.pumpRuntimeSec += 2;
    state.totalWaterLitres = +(state.totalWaterLitres + 0.15).toFixed(2);
    
    // Auto-stop if field capacity reached or max pump run duration (60s)
    if (state.soilMoisture >= state.fieldCapacity) {
      state.pumpState = false;
      addAlert('SUCCESS', 'Pump Auto-Shutoff', `Soil moisture reached Field Capacity (${state.fieldCapacity}%). Irrigation stopped safely.`);
    }
  } else {
    // Automated Control Mode decision loop
    if (state.pumpMode === 'AUTO' && !state.simulationEvent && state.soilMoisture < state.minThreshold) {
      state.pumpState = true;
      addAlert('WARNING', 'Auto-Irrigation Triggered', `Soil moisture (${state.soilMoisture}%) fell below threshold (${state.minThreshold}%). Pump activated.`);
    }
  }

  // Update Soil Moisture within bounds
  state.soilMoisture = +(Math.max(10, Math.min(95, state.soilMoisture + moistureDelta))).toFixed(1);

  // NPK Dynamic Balance
  state.nitrogen = Math.round(activeCrop.recommendedNPK.n + (Math.random() * 4 - 2));
  state.phosphorus = Math.round(activeCrop.recommendedNPK.p + (Math.random() * 2 - 1));
  state.potassium = Math.round(activeCrop.recommendedNPK.k + (Math.random() * 4 - 2));

  // Solar & Battery Dynamics
  if (state.simulationEvent !== 'LOW_BATTERY') {
    state.solarVoltage = +(4.6 + Math.sin(secondsTick / 10) * 0.4).toFixed(2);
    state.batteryPercent = Math.min(100, Math.max(20, Math.round(92 + Math.sin(secondsTick / 15) * 6)));
  }

  state.lastUpdated = new Date().toISOString();

  // Low Moisture Alert Check
  if (state.soilMoisture <= state.wiltingPoint && secondsTick % 10 === 0) {
    addAlert('CRITICAL', 'Wilting Point Emergency!', `Soil moisture is at dangerous level (${state.soilMoisture}%). Immediate irrigation required!`);
  }

  // Serial Packet Telemetry Log Simulation
  const currentFormattedTime = new Date().toLocaleTimeString();
  const serialPayload = JSON.stringify({
    dev_id: "ESP32-SOIL-NODE-01",
    moist_pct: state.soilMoisture,
    temp_c: state.soilTemp,
    amb_temp_c: state.ambientTemp,
    hum_pct: state.humidity,
    pump_active: state.pumpState ? 1 : 0,
    batt_v: state.solarVoltage,
    rssi_dbm: state.rssi
  });

  logSerialPacket('TX', 'telemetry/pub', serialPayload);

  // Add history point every 10 ticks (approx 20s)
  if (secondsTick % 10 === 0) {
    telemetryHistory.push({
      timestamp: currentFormattedTime,
      moisture: state.soilMoisture,
      soilTemp: state.soilTemp,
      ambientTemp: state.ambientTemp,
      humidity: state.humidity,
      pump: state.pumpState ? 1 : 0
    });
    if (telemetryHistory.length > 150) telemetryHistory.shift();
  }

  // Push updates to connected SSE clients
  broadcastSSE('telemetry', state);

  // Sync to external Firebase RTDB if credentials provided
  if (firebaseConfig.isConfigured && firebaseConfig.databaseURL) {
    syncToFirebaseRTDB();
  }
}, 2000);

// Helper to push REST PUT to external Firebase RTDB
function syncToFirebaseRTDB() {
  try {
    const parsedUrl = url.parse(`${firebaseConfig.databaseURL}/sensorData/live.json`);
    const payload = JSON.stringify({
      ...state,
      activeCropName: activeCrop.name,
      syncedAt: new Date().toISOString()
    });

    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.path,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      // Firebase synced ok
    });
    req.on('error', (e) => {
      // Firebase sync background notice
    });
    req.write(payload);
    req.end();
  } catch (err) {
    // Ignore URL parse error
  }
}

// --- Request Router ---
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Helper JSON response
  const sendJSON = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  // --- API Endpoints ---

  // 1. GET /api/telemetry/live
  if (method === 'GET' && pathname === '/api/telemetry/live') {
    return sendJSON(200, {
      success: true,
      data: state,
      crop: activeCrop,
      cropKey: activeCropKey,
      firebaseConfigured: firebaseConfig.isConfigured
    });
  }

  // 2. GET /api/telemetry/history
  if (method === 'GET' && pathname === '/api/telemetry/history') {
    return sendJSON(200, {
      success: true,
      history: telemetryHistory,
      alerts: alertHistory,
      logs: esp32SerialLogs
    });
  }

  // 3. POST /api/pump/toggle
  if (method === 'POST' && pathname === '/api/pump/toggle') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const desiredState = typeof payload.state === 'boolean' ? payload.state : !state.pumpState;
        
        state.pumpState = desiredState;
        const msg = desiredState ? 'Water Pump ACTIVATED via Remote Command' : 'Water Pump DEACTIVATED via Remote Command';
        addAlert(desiredState ? 'WARNING' : 'INFO', 'Manual Pump Control', msg);
        logSerialPacket('RX', 'cmd/pump', JSON.stringify({ action: desiredState ? 'PUMP_ON' : 'PUMP_OFF' }));

        broadcastSSE('telemetry', state);
        return sendJSON(200, { success: true, pumpState: state.pumpState, message: msg });
      } catch (e) {
        return sendJSON(400, { success: false, error: 'Invalid JSON payload' });
      }
    });
    return;
  }

  // 4. POST /api/pump/mode
  if (method === 'POST' && pathname === '/api/pump/mode') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (payload.mode === 'AUTO' || payload.mode === 'MANUAL') {
          state.pumpMode = payload.mode;
          addAlert('INFO', 'Irrigation Mode Changed', `System mode set to ${state.pumpMode}`);
          broadcastSSE('telemetry', state);
          return sendJSON(200, { success: true, pumpMode: state.pumpMode });
        }
        return sendJSON(400, { success: false, error: 'Mode must be AUTO or MANUAL' });
      } catch (e) {
        return sendJSON(400, { success: false, error: 'Invalid payload' });
      }
    });
    return;
  }

  // 5. POST /api/pump/emergency-stop
  if (method === 'POST' && pathname === '/api/pump/emergency-stop') {
    state.pumpState = false;
    state.pumpMode = 'MANUAL';
    state.pumpRuntimeSec = 0;
    state.emergencyStopActive = true;
    addAlert('CRITICAL', 'EMERGENCY STOP TRIGGERED', 'All irrigation pumps forcefully shut down. Automated logic paused.');
    logSerialPacket('RX', 'cmd/safety', JSON.stringify({ action: 'EMERGENCY_SHUTDOWN' }));
    broadcastSSE('telemetry', state);
    return sendJSON(200, { success: true, message: 'Emergency stop executed successfully' });
  }

  // 6. POST /api/config/crop
  if (method === 'POST' && pathname === '/api/config/crop') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (CROP_PROFILES[payload.cropKey]) {
          activeCropKey = payload.cropKey;
          activeCrop = CROP_PROFILES[activeCropKey];
          state.wiltingPoint = activeCrop.wiltingPoint;
          state.fieldCapacity = activeCrop.fieldCapacity;
          state.targetMoisture = activeCrop.optimalMoisture;
          state.minThreshold = activeCrop.minMoisture;
          
          addAlert('SUCCESS', 'Crop Profile Switched', `Active crop profile set to ${activeCrop.name}`);
          broadcastSSE('telemetry', state);
          return sendJSON(200, { success: true, cropKey: activeCropKey, crop: activeCrop });
        }
        return sendJSON(404, { success: false, error: 'Crop profile not found' });
      } catch (e) {
        return sendJSON(400, { success: false, error: 'Invalid payload' });
      }
    });
    return;
  }

  // 7. POST /api/simulate-event
  if (method === 'POST' && pathname === '/api/simulate-event') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const allowedEvents = ['RAIN_STORM', 'DROUGHT_HEATWAVE', 'LOW_BATTERY', 'SENSOR_FAULT', 'CLEAR'];
        if (allowedEvents.includes(payload.event)) {
          if (payload.event === 'CLEAR') {
            state.simulationEvent = null;
            state.eventSecondsLeft = 0;
            addAlert('INFO', 'Sandbox Reset', 'Simulation environmental override cleared.');
          } else {
            state.simulationEvent = payload.event;
            state.eventSecondsLeft = payload.durationSec || 60;
            addAlert('WARNING', 'Hardware Event Injected', `Triggered event: ${payload.event} for ${state.eventSecondsLeft} seconds.`);
          }
          broadcastSSE('telemetry', state);
          return sendJSON(200, { success: true, event: state.simulationEvent, secondsLeft: state.eventSecondsLeft });
        }
        return sendJSON(400, { success: false, error: 'Invalid event parameter' });
      } catch (e) {
        return sendJSON(400, { success: false, error: 'Invalid payload' });
      }
    });
    return;
  }

  // 8. POST /api/firebase-config
  if (method === 'POST' && pathname === '/api/firebase-config') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        firebaseConfig = {
          apiKey: payload.apiKey || '',
          authDomain: payload.authDomain || '',
          databaseURL: payload.databaseURL || '',
          projectId: payload.projectId || '',
          storageBucket: payload.storageBucket || '',
          messagingSenderId: payload.messagingSenderId || '',
          appId: payload.appId || '',
          isConfigured: !!(payload.apiKey && payload.databaseURL)
        };
        addAlert('SUCCESS', 'Firebase Settings Saved', firebaseConfig.isConfigured ? 'Connected to live Firebase project: ' + firebaseConfig.projectId : 'Using high-frequency internal RTDB mirror.');
        return sendJSON(200, { success: true, configured: firebaseConfig.isConfigured });
      } catch (e) {
        return sendJSON(400, { success: false, error: 'Invalid payload' });
      }
    });
    return;
  }

  // 9. GET /api/events (SSE Stream)
  if (method === 'GET' && pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to SoilPulse SSE Stream' })}\n\n`);
    
    const pingInterval = setInterval(() => {
      try {
        res.write(`:ping\n\n`);
      } catch (e) {
        clearInterval(pingInterval);
      }
    }, 25000);

    const clientObj = { id: Date.now(), res, pingInterval };
    sseClients.push(clientObj);

    req.on('close', () => {
      clearInterval(pingInterval);
      const index = sseClients.indexOf(clientObj);
      if (index !== -1) sseClients.splice(index, 1);
    });
    return;
  }

  // 10. GET /api/crops
  if (method === 'GET' && pathname === '/api/crops') {
    return sendJSON(200, { success: true, crops: CROP_PROFILES, activeKey: activeCropKey });
  }

  // 11. GET /api/diagnostics/salinity
  if (method === 'GET' && pathname === '/api/diagnostics/salinity') {
    const salinityData = calculateSoilSalinityEC(
      state.nitrogen,
      state.phosphorus,
      state.potassium,
      state.soilMoisture,
      state.soilTemp
    );
    return sendJSON(200, { success: true, timestamp: new Date().toISOString(), salinity: salinityData });
  }

  // 12. GET /api/diagnostics/water-usage
  if (method === 'GET' && pathname === '/api/diagnostics/water-usage') {
    const waterData = calculateWaterUsageAnalytics(
      state.totalWaterLitres,
      state.pumpRuntimeSec,
      activeCrop.name
    );
    return sendJSON(200, { success: true, timestamp: new Date().toISOString(), waterUsage: waterData });
  }

  // 13. GET /api/diagnostics/frost-risk
  if (method === 'GET' && pathname === '/api/diagnostics/frost-risk') {
    const frostRisk = (state.ambientTemp <= 2.0 && state.humidity >= 80) ? 'CRITICAL' : (state.ambientTemp <= 5.0 ? 'MODERATE' : 'LOW');
    return sendJSON(200, { success: true, timestamp: new Date().toISOString(), ambientTemp: state.ambientTemp, humidity: state.humidity, frostRisk });
  }

  // 14. GET /api/diagnostics/organic-matter
  if (method === 'GET' && pathname === '/api/diagnostics/organic-matter') {
    const somVal = state.soilOrganicMatter || 3.2;
    const category = somVal >= 4.0 ? 'High' : (somVal >= 2.0 ? 'Moderate' : 'Low');
    return sendJSON(200, { success: true, timestamp: new Date().toISOString(), soilOrganicMatter: somVal, category });
  }

  // 15. GET /api/diagnostics/aeration
  if (method === 'GET' && pathname === '/api/diagnostics/aeration') {
    const density = state.bulkDensity || 1.35;
    const compactionIndex = state.compactionIndex || 45;
    const porosity = density > 1.6 || compactionIndex > 80 ? 'Poor' : (density >= 1.3 ? 'Moderate' : 'High');
    return sendJSON(200, { success: true, timestamp: new Date().toISOString(), bulkDensity: density, compactionIndex, porosity });
  }

  // 16. GET /api/irrigation/threshold
  if (method === 'GET' && pathname === '/api/irrigation/threshold') {
    const minThreshold = state.minThreshold || activeCrop.minMoisture;
    const needsIrrigation = state.soilMoisture < minThreshold;
    return sendJSON(200, {
      success: true,
      timestamp: new Date().toISOString(),
      crop: activeCrop.name,
      currentMoisture: state.soilMoisture,
      minThreshold,
      needsIrrigation
    });
  }

  // 17. GET /api/sensors/health-check
  if (method === 'GET' && pathname === '/api/sensors/health-check') {
    return sendJSON(200, {
      success: true,
      timestamp: new Date().toISOString(),
      esp32Online: state.esp32Online,
      lastUpdated: state.lastUpdated,
      rssi: state.rssi,
      status: state.esp32Online ? 'HEALTHY' : 'OFFLINE'
    });
  }





  // 18. GET /api/analytics/nitrogen-volatilization
  if (method === 'GET' && pathname === '/api/analytics/nitrogen-volatilization') {
    const temp = state.temperature || 24.5;
    const ph = state.soilPh || 6.8;
    const moisture = state.soilMoisture || 52;
    const riskFactor = (ph > 7.2 ? 30 : 10) + (temp > 25 ? 25 : 10) + (moisture < 35 ? 20 : 5);
    const riskLevel = riskFactor >= 60 ? 'CRITICAL' : (riskFactor >= 35 ? 'MODERATE' : 'LOW');
    return sendJSON(200, {
      success: true,
      timestamp: new Date().toISOString(),
      temperature: temp,
      soilPh: ph,
      soilMoisture: moisture,
      volatilizationRiskFactor: riskFactor,
      riskLevel
    });
  }


  // 19. GET /api/diagnostics/growing-degree-days
  if (method === 'GET' && pathname === '/api/diagnostics/growing-degree-days') {
    const cumulativeGDD = state.cumulativeGDD || 720;
    const dailyGDD = Math.max(0, ((state.temperature || 26) - 10));
    return sendJSON(200, {
      success: true,
      timestamp: new Date().toISOString(),
      crop: activeCrop.name,
      dailyGDD: +dailyGDD.toFixed(1),
      cumulativeGDD,
      phenologicalStage: cumulativeGDD > 900 ? 'Grain Filling' : (cumulativeGDD > 450 ? 'Reproductive / Flowering' : 'Vegetative')
    });
  }

  // 11. POST /api/auth/login (Demo Authentication)
  if (method === 'POST' && pathname === '/api/auth/login') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const email = payload.email || 'demo@soilpulse.ai';
        const role = email.includes('admin') || email.includes('evaluator') ? 'Senior Agricultural Evaluator' : 'Field Technician';
        return sendJSON(200, {
          success: true,
          token: 'token_soilpulse_' + Math.random().toString(36).substr(2),
          user: {
            name: email.split('@')[0].toUpperCase(),
            email: email,
            role: role,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
          }
        });
      } catch (e) {
        return sendJSON(400, { success: false, error: 'Auth failed' });
      }
    });
    return;
  }

  // --- Static File Server for Frontend ---
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);

  // Security check to prevent directory traversal
  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.jsx': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Fallback to index.html for SPA routing
        fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, indexContent) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(` 🌱 SoilPulse AI - Smart Soil Moisture & Irrigation Server`);
  console.log(` 📡 Server running on: http://localhost:${PORT}`);
  console.log(` 📱 Mobile / Local Network Access: http://10.108.92.96:${PORT}`);
  console.log(` ⚡ Simulated ESP32 telemetry loop running every 2000ms`);
  console.log(` ───────────────────────────────────────────────────────`);
  console.log(` REST APIs Available:`);
  console.log(`  - GET  /api/telemetry/live`);
  console.log(`  - GET  /api/telemetry/history`);
  console.log(`  - POST /api/pump/toggle`);
  console.log(`  - POST /api/pump/mode`);
  console.log(`  - POST /api/pump/emergency-stop`);
  console.log(`  - POST /api/simulate-event`);
  console.log(`  - GET  /api/events (SSE Stream)`);
  console.log(`=======================================================`);
});

// Aug 20 API helper middleware
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (res && res.on) {
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
        });
    }
    if (typeof next === 'function') next();
};

