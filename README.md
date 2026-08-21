# SoilPulse AI - Smart Soil Moisture & Autonomous Irrigation System

A production-quality full-stack **Smart Soil Moisture & Irrigation Control System** built with **React**, **Tailwind CSS**, **Node.js ESP32 Telemetry Physics Engine**, **Firebase Realtime Database**, **Chart.js**, and **AI Agronomist Insights**.

Designed specifically for college project demonstrations, academic evaluations, and smart agriculture research without requiring physical microcontroller hardware.

---

## 🌟 Key Features

1. **ESP32 Microcontroller Physical Telemetry Simulator**:
   - Realistic physical soil moisture decay model (evapotranspiration affected by diurnal air temperature & humidity).
   - Dynamic soil temperature, air temp, relative humidity, N-P-K nutrient levels, solar battery voltage, and Wi-Fi RSSI signals.
   - Closed-loop automated pump control with field capacity auto-shutoff safety.

2. **React + Tailwind CSS Frontend Dashboard**:
   - Circular gauge for live soil moisture % with status indicators (Optimal, Mild Stress, Wilting Point Alert, Waterlogged).
   - High-impact sensor cards for Soil/Air Temp, Humidity, NPK balance, and Solar Battery charging.
   - Interactive Irrigation Pump Control Unit (Auto / Manual mode, timed burst buttons, Emergency Stop).
   - Water pipeline animation showing real-time water flow particles during active irrigation.

3. **Firebase Realtime Database Integration**:
   - High-frequency live data sync to Google Firebase RTDB (`/sensorData/live` and `/sensorData/history`).
   - Seamless built-in zero-config fallback engine if external Firebase keys are omitted.

4. **Telemetry Analytics & Trend Graphs**:
   - Recharts / Chart.js multi-axis historical trend graph over 150 live sampling points.

5. **AI Agronomist Engine**:
   - Calculates overall crop health score (0-100).
   - Root Rot risk, Wilting moisture stress, and Evapotranspiration diagnostics.
   - Dynamic presets for Tomato, Wheat, Maize, Strawberry, and Citrus crops.
   - Interactive AI Agronomist Chat widget with instant answers.

6. **College Evaluator Hardware Sandbox & ESP32 Serial Monitor**:
   - Live ESP32 Serial Monitor displaying raw JSON MQTT telemetry packets.
   - Hardware Event Injector buttons to simulate Rainstorms, Drought Heatwaves, Low Solar Battery, and Sensor Noise.
   - System Architecture & ESP32 Circuit Pinout presentation modal.

---

## ⚡ Quick Start

### 1. Launch Server
Run the Node.js backend server:

```bash
npm start
# or
node server.js
```

### 2. Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `5000` | Port number for the Express/HTTP server |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |
| `FIREBASE_DATABASE_URL` | `""` | Firebase Realtime Database URL for telemetry sync |

### 3. Access Application
Open your browser to:
[http://localhost:5000](http://localhost:5000)

---

## 📡 REST API Reference

- `GET /api/telemetry/live`: Returns current live ESP32 sensor state & crop parameters.
- `GET /api/telemetry/history`: Returns telemetry buffer, alert log, and serial monitor packets.
- `POST /api/pump/toggle`: Manually toggle water pump ON/OFF.
- `POST /api/pump/mode`: Set pump mode (`AUTO` or `MANUAL`).
- `POST /api/pump/emergency-stop`: Immediately cut power to pump and pause automated rules.
- `POST /api/config/crop`: Switch crop profile (`tomato`, `wheat`, `maize`, `strawberry`, `citrus`).
- `POST /api/simulate-event`: Inject hardware simulation events (`RAIN_STORM`, `DROUGHT_HEATWAVE`, `LOW_BATTERY`, `CLEAR`).
- `GET /api/events`: Server-Sent Events (SSE) live telemetry stream (`text/event-stream`).
- `GET /api/diagnostics/salinity`: Calculates soil Electrical Conductivity (EC in dS/m) and salinity risk classification.
- `GET /api/diagnostics/water-usage`: Returns cumulative irrigation volume, pump runtime, average flow rate, and daily estimated water consumption.
- `GET /health`: Healthcheck status endpoint.

### Sample Live Telemetry Response Schema (`GET /api/telemetry/live`)
```json
{
  "soilMoisture": 58.4,
  "soilTemp": 23.5,
  "ambientTemp": 27.8,
  "humidity": 62.1,
  "soilPH": 6.5,
  "solarVoltage": 4.85,
  "rssi": -64,
  "wifiStatus": "CONNECTED",
  "pumpState": false,
  "pumpMode": "AUTO"
}
```

---

## 📝 Release Notes & CHANGELOG (v1.3.0)

- **Water Usage Analytics**: Integrated cumulative water volume tracking, pump runtime calculations, and flow rate efficiency rating (`HIGH_EFFICIENCY`, `MODERATE`, `HEAVY_CONSUMPTION`).
- **Soil Salinity & EC Index**: Added Electrical Conductivity (dS/m) calculation helper and salinity risk classifier (`NON_SALINE`, `SLIGHTLY_SALINE`, `MODERATELY_SALINE`, `HIGHLY_SALINE`).
- **Telemetry Signal Quality**: Added Wi-Fi RSSI evaluation utilities (`EXCELLENT`, `GOOD`, `FAIR`, `POOR`).
- **SSE Stream Enhancements**: Implemented heartbeat ping interval to maintain active server-sent event socket connections.
- **Crop Moisture Evaluator**: Added crop profile threshold evaluation (`OPTIMAL`, `MILD DEFICIT`, `CRITICAL WILTING`, `WATERLOGGED`).
- **Pump Safety Guard**: Reinforced emergency stop override with automated runtime counter reset.
- **UI Enhancements**: Added custom status dot indicators and moisture level badge styling tokens.
- **Environmental Diagnostics**: Added evaluation routines for ambient heat stress, soil temperature, and relative humidity fungal alerts.
- **NPK Nutrient Analysis**: Integrated nitrogen, phosphorus, and potassium target balance rating helper functions.





## Recent Updates
- Input validation and health score calculation algorithms integrated.
