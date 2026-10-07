# 🌿 Mini Greenhouse Digital Twin

Real-time ESP32 sensor dashboard with a live 3D greenhouse visualization.

## Quick Start

### 1. Backend (Node/Express + WebSocket)
```bash
cd backend
npm install
npm start
# → REST API: http://localhost:4000/api
# → WebSocket: ws://localhost:4000/ws
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Project Structure

```
greenhouse-twin/
├── backend/
│   ├── server.js          # Express REST + WebSocket server
│   └── mockGenerator.js   # Simulated sensor data (swap point for ESP32)
│
└── frontend/
    └── src/
        ├── data/
        │   └── mockDataService.js   ← ⭐ SWAP THIS for real ESP32
        ├── lib/
        │   └── twinEngine.js        ← Core digital twin logic
        ├── context/
        │   ├── SensorContext.jsx
        │   └── ActuatorContext.jsx
        ├── components/
        │   ├── 3d/
        │   │   ├── GreenhouseScene.jsx
        │   │   ├── GreenhouseStructure.jsx
        │   │   ├── PlantModel.jsx
        │   │   └── GrowLight.jsx
        │   ├── SensorCard.jsx
        │   ├── HealthScore.jsx
        │   ├── ActuatorPanel.jsx
        │   ├── HistoryCharts.jsx
        │   ├── EventLog.jsx
        │   └── PlantProfileEditor.jsx
        └── pages/
            └── Dashboard.jsx
```

---

## Connecting a Real ESP32

The **only file to modify** is `frontend/src/data/mockDataService.js`.

Change `VITE_BACKEND_URL` in `.env` to your ESP32/backend address:
```env
VITE_BACKEND_URL=http://192.168.1.100:4000
```

Your ESP32 backend must broadcast WebSocket messages in this format:
```json
{ "type": "sensor",   "payload": { "temp": 24.1, "humidity": 65.2, "lux": 3400, "soil": 58.0, "timestamp": "..." } }
{ "type": "actuator", "payload": { "light_on": true, "brightness": 180, "mode": "auto" } }
```

No other frontend files need changing.

---

## Sensor Data Schema

```typescript
SensorReading {
  temp:      number   // °C
  humidity:  number   // %
  lux:       number   // lux
  soil:      number   // %
  timestamp: string   // ISO 8601
}
```

## Plant Profile Schema

```typescript
PlantProfile {
  plant_name:     string
  ideal_temp:     [min: number, max: number]
  ideal_humidity: [min: number, max: number]
  ideal_lux:      [min: number, max: number]
  ideal_soil:     [min: number, max: number]
}
```

## Actuator Schema

```typescript
ActuatorState {
  light_on:   boolean
  brightness: number   // 0-255
  mode:       'auto' | 'manual'
}
```

---

## Twin Logic (twinEngine.js)

| Function | Description |
|----------|-------------|
| `evaluateMetric(value, [min, max])` | Returns `{ status: 'ok'\|'low'\|'high', deviation }` |
| `evaluateReading(reading, profile)` | Evaluates all 4 metrics at once |
| `computeHealthScore(history, profile)` | Rolling 0-100 health score |
| `generateAdvice(evaluation, plantName)` | Human-readable advice strings |
| `computeAutoLightBrightness(lux, idealLux)` | Maps lux deficit → brightness 0-255 |

---

## REST API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sensor/latest` | Latest sensor reading |
| GET | `/api/sensor/history?limit=100` | Historical readings |
| GET | `/api/actuator` | Current actuator state |
| POST | `/api/actuator` | Update actuator (manual override) |
| GET | `/api/profile` | Active plant profile |
| PUT | `/api/profile` | Update plant profile |
| GET | `/api/events` | Event log |
