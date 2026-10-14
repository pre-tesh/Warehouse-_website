# 🌿 Mini Greenhouse Digital Twin

Real-time ESP32 sensor dashboard with a live 3D greenhouse and 3 controllable lights.

```
 Greenhouse                     Laptop (server)                 Tablet (demo screen)
┌────────────┐  POST /api/esp/data  ┌───────────────────┐  WebSocket  ┌──────────────┐
│   ESP32    │ ───────────────────► │ Node backend :4000│ ──────────► │  Dashboard   │
│ DHT11 soil │ ◄─────────────────── │ React app    :5173│ ◄────────── │ (browser)    │
│ LDR 3 LEDs │  {"set":[1,0,1]}     └───────────────────┘  REST       └──────────────┘
└────────────┘
```

All three devices must be on the **same WiFi**.

## Demo setup

### 1. Laptop — start the server
```bash
# terminal 1
cd backend && npm install && npm start      # API + WebSocket on :4000

# terminal 2
cd frontend && npm install && npm run dev   # dashboard on :5173 (listens on the LAN)
```
Find the laptop's IP (`hostname -I` on Linux, `ipconfig` on Windows), e.g. `192.168.1.23`.
If the ESP32 or tablet can't connect, allow ports **4000** and **5173** through the laptop firewall
(Linux/ufw: `sudo ufw allow 4000/tcp && sudo ufw allow 5173/tcp`).

### 2. ESP32 — flash `espcode.ino`
Edit the top of the file:
```cpp
const char* WIFI_SSID   = "YourWifi";
const char* WIFI_PASS   = "YourPassword";
const char* SERVER_HOST = "192.168.1.23";   // the laptop's IP
```
Libraries: *DHT sensor library* + *Adafruit Unified Sensor*. ESP32 WiFi is 2.4 GHz only.
Open the Serial Monitor (115200) — you should see `Connected! ESP32 IP: ...` and live readings.

### 3. Tablet — open the dashboard
Browse to `http://192.168.1.23:5173`. The header shows **Live · ESP32 online** once data arrives.
(No config needed — the page talks to the backend on whatever host it was loaded from.)

## Controlling the lights
- **Website**: 3 buttons (Light 1/2/3) + All on / All off → reaches the ESP32 within ~1 s.
- **Physical**: UP button lights the next LED, DOWN switches off the last lit one → shows on the website within ~1 s.
- Both stay in sync; the 3D greenhouse shows the 3 bulbs lighting up.

## No hardware? Simulate it
```bash
cd backend && USE_MOCK=1 npm start
```

## Sensor calibration
- **Soil**: capacitive sensors read *high when dry*. Set `SOIL_RAW_DRY` / `SOIL_RAW_WET` in `espcode.ino`
  from the `raw` value on the Serial Monitor (sensor in air = dry, in water = wet).
- **Light**: the LDR gives a relative **0–100 %** (not lux). Tune the ideal range in the dashboard's *Profile* tab.
- **Wiring**: power the LDR divider from **3V3**, not 5V — a 5V divider can push GPIO35 above 3.3 V and damage the ESP32.

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/esp/data` | ESP32 → server: `{temp, humidity, soil, light, leds:[0\|1,0\|1,0\|1]}`; reply may contain `{set:[...]}` |
| POST | `/api/actuator` | Website → LED command: `{index:0-2, on:bool}` or `{leds:[b,b,b]}` |
| GET | `/api/actuator` | Current LED state |
| GET | `/api/device` | ESP32 online status |
| GET | `/api/sensor/latest` · `/api/sensor/history?limit=100` | Readings |
| GET/PUT | `/api/profile` | Plant ideal ranges (`ideal_temp`, `ideal_humidity`, `ideal_light`, `ideal_soil`) |
| GET | `/api/events` | Event log |

WebSocket `ws://<laptop>:4000/ws` pushes: `sensor`, `actuator`, `device`, `profile`, `history`, `events`, `event`.

## Project structure
```
backend/
  server.js          Express REST + WebSocket, ESP32 ingestion, LED command relay
  mockGenerator.js   Fake readings (USE_MOCK=1 only)
frontend/src/
  data/mockDataService.js   WebSocket + REST client
  context/                  SensorContext, ActuatorContext
  components/               SensorCard, ActuatorPanel (3 buttons), charts, 3D scene…
  lib/twinEngine.js         Health score + advice logic
espcode.ino                 ESP32 firmware
```
