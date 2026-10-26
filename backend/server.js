/**
 * server.js  —  Mini Greenhouse Digital Twin: Node/Express Backend
 * ─────────────────────────────────────────────────────────────────────────────
 *   ESP32  --HTTP POST /api/esp/data (every ~1s)-->  backend  --WebSocket-->  website
 *   ESP32  <--- response { set: [0|1,0|1,0|1] } ---  backend  <--REST------  website
 *
 * The ESP32 is the source of truth for sensor data and for the physical LED
 * state (its up/down buttons still work). When the website sends an LED command
 * it is kept "pending" and handed to the ESP32 in the response to its next POST,
 * until the ESP32 reports that it has applied it (or the command times out).
 *
 * Run with USE_MOCK=1 to simulate an ESP32 when no hardware is connected.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const http    = require('http');
const WebSocket = require('ws');
const cors    = require('cors');
const { v4: uuidv4 } = require('uuid');
const { generateReading } = require('./mockGenerator');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const USE_MOCK = process.env.USE_MOCK === '1';

const NUM_LEDS = 3;
const DEVICE_TIMEOUT_MS  = 5000;  // no POST for this long => ESP32 offline
const COMMAND_TIMEOUT_MS = 5000;  // give up on an undelivered LED command
const MAX_HISTORY = 200;

// ── In-memory state ───────────────────────────────────────────────────────────

let plantProfile = {
  plant_name:     'Zigzag Plant (Nagdaman)',
  ideal_temp:     [18, 27],
  ideal_humidity: [40, 70],
  ideal_light:    [30, 80],
  ideal_soil:     [40, 75],
};

/** leds: boolean[3] — what the website shows (and what the ESP32 should be)
 *  water: boolean — valve open/closed state
 */
let actuatorState = { leds: [false, false, false], water: false };

/** Outstanding website command not yet confirmed by the ESP32 */
let pendingCommand = null; // { leds: boolean[], water: boolean, at: number }

const history = [];
let latestReading = null;
let lastValues = { temp: null, humidity: null, soil: null, light: null };

let device = { online: false, lastSeen: null, ip: null };

const eventLog = [];

function logEvent(message) {
  const entry = { id: uuidv4(), timestamp: new Date().toISOString(), message };
  eventLog.unshift(entry);
  if (eventLog.length > 50) eventLog.pop();
  broadcast({ type: 'event', payload: entry });
  return entry;
}

function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

const ledsEqual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const toBoolLeds = (arr) => Array.from({ length: NUM_LEDS }, (_, i) => Boolean(arr?.[i]));
const toBoolWater = (v) => v === true || v === 1 || v === '1';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function setDevice(patch) {
  const next = { ...device, ...patch };
  const changed = next.online !== device.online;
  device = next;
  if (changed) {
    logEvent(device.online ? 'ESP32 connected' : 'ESP32 went offline');
    broadcast({ type: 'device', payload: device });
  }
}

// ── Sensor ingestion ──────────────────────────────────────────────────────────

/**
 * Accepts a partial reading (a failed DHT read arrives as null). Missing values
 * fall back to the last good value. Nothing is published until all four metrics
 * have been seen at least once.
 */
function ingestReading({ temp, humidity, soil, light }) {
  if (isNum(temp))     lastValues.temp     = temp;
  if (isNum(humidity)) lastValues.humidity = humidity;
  if (isNum(soil))     lastValues.soil     = soil;
  if (isNum(light))    lastValues.light    = light;

  if (Object.values(lastValues).some(v => v === null)) return;

  latestReading = { ...lastValues, timestamp: new Date().toISOString() };
  history.push(latestReading);
  if (history.length > MAX_HISTORY) history.shift();
  broadcast({ type: 'sensor', payload: latestReading });
}

/**
 * Reconciles the full actuator state reported by the ESP32 with what the website wants.
 * Returns the command to send back to the ESP32 (or null).
 */
function reconcileActuator(reportedLeds, reportedWater) {
  const now = Date.now();
  const reportedWaterBool = Boolean(reportedWater);

  if (pendingCommand) {
    const ledMatch = ledsEqual(reportedLeds, pendingCommand.leds);
    const waterMatch = reportedWaterBool === Boolean(pendingCommand.water);

    if (ledMatch && waterMatch) {
      pendingCommand = null; // ESP32 applied the command
      return null;
    }

    if (now - pendingCommand.at > COMMAND_TIMEOUT_MS) {
      pendingCommand = null; // give up; trust the device
      actuatorState = { leds: reportedLeds, water: reportedWaterBool };
      broadcast({ type: 'actuator', payload: actuatorState });
      return null;
    }

    const reply = {};
    if (!ledMatch) reply.set = pendingCommand.leds.map(v => (v ? 1 : 0));
    if (!waterMatch) reply.water = pendingCommand.water ? 1 : 0;
    return reply;
  }

  const ledChanged = !ledsEqual(reportedLeds, actuatorState.leds);
  const waterChanged = reportedWaterBool !== actuatorState.water;

  if (ledChanged || waterChanged) {
    if (ledChanged) {
      reportedLeds.forEach((on, i) => {
        if (on !== actuatorState.leds[i]) {
          logEvent(`Light ${i + 1} turned ${on ? 'ON' : 'OFF'} (physical button)`);
        }
      });
    }
    if (waterChanged) {
      logEvent(`Water valve ${reportedWaterBool ? 'OPEN' : 'CLOSED'} (physical button)`);
    }
    actuatorState = { leds: reportedLeds, water: reportedWaterBool };
    broadcast({ type: 'actuator', payload: actuatorState });
  }
  return null;
}

function markDeviceSeen(ip) {
  setDevice({ online: true, lastSeen: new Date().toISOString(), ip: ip ?? device.ip });
}

// Offline watchdog
setInterval(() => {
  if (device.online && device.lastSeen && Date.now() - new Date(device.lastSeen).getTime() > DEVICE_TIMEOUT_MS) {
    setDevice({ online: false });
  }
}, 1000);

// ── Optional mock ESP32 ───────────────────────────────────────────────────────
if (USE_MOCK) {
  console.log('[mock] USE_MOCK=1 — simulating an ESP32');
  setInterval(() => {
    markDeviceSeen('mock');
    ingestReading(generateReading());
    reconcileActuator(actuatorState.leds, actuatorState.water); // mock device "applies" commands instantly
  }, 1000);
}

// ── REST API ──────────────────────────────────────────────────────────────────

/**
 * ESP32 -> backend.
 * Body: { temp, humidity, soil, light, leds: [0|1,0|1,0|1] }
 * Response: { set?: [0|1,0|1,0|1] }  (set is present only when the website sent a command)
 */
app.post('/api/esp/data', (req, res) => {
  const { temp, humidity, soil, light, leds, water } = req.body ?? {};
  markDeviceSeen(req.ip?.replace('::ffff:', ''));
  ingestReading({ temp, humidity, soil, light });

  let reply = null;
  if (Array.isArray(leds) || typeof water !== 'undefined') {
    const reportedLeds = Array.isArray(leds) ? toBoolLeds(leds) : actuatorState.leds;
    const reportedWater = typeof water !== 'undefined' ? toBoolWater(water) : actuatorState.water;
    reply = reconcileActuator(reportedLeds, reportedWater);
  }

  if (reply && Object.keys(reply).length > 0) {
    return res.json(reply);
  }
  res.json({ ok: 1 });
});

app.get('/api/sensor/latest', (req, res) => res.json(latestReading));

app.get('/api/sensor/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(history.slice(-limit));
});

app.get('/api/device', (req, res) => res.json(device));

app.get('/api/actuator', (req, res) => res.json(actuatorState));

/**
 * Website -> backend LED command.
 * Body: { index: 0-2, on: boolean }   toggle a single LED
 *   or: { leds: [bool,bool,bool] }    set all three
 */
app.post('/api/actuator', (req, res) => {
  const { index, on, leds, water } = req.body ?? {};
  const target = [...actuatorState.leds];
  let targetWater = actuatorState.water;

  if (Array.isArray(leds)) {
    toBoolLeds(leds).forEach((v, i) => { target[i] = v; });
  } else if (Number.isInteger(index) && index >= 0 && index < NUM_LEDS && typeof on === 'boolean') {
    target[index] = on;
  } else if (typeof leds !== 'undefined' || typeof water !== 'undefined') {
    // no LED update requested; keep existing LED state
  }

  if (typeof water !== 'undefined') {
    targetWater = toBoolWater(water);
  }

  const changed = !ledsEqual(target, actuatorState.leds) || targetWater !== actuatorState.water;
  if (changed) {
    target.forEach((v, i) => {
      if (v !== actuatorState.leds[i]) logEvent(`Light ${i + 1} turned ${v ? 'ON' : 'OFF'} (website)`);
    });
    if (targetWater !== actuatorState.water) {
      logEvent(`Water valve ${targetWater ? 'OPEN' : 'CLOSED'} (website)`);
    }
    actuatorState = { leds: target, water: targetWater };
    pendingCommand = { leds: target, water: targetWater, at: Date.now() };
    broadcast({ type: 'actuator', payload: actuatorState });
  }
  res.json(actuatorState);
});

app.get('/api/profile', (req, res) => res.json(plantProfile));

app.put('/api/profile', (req, res) => {
  const { plant_name, ideal_temp, ideal_humidity, ideal_light, ideal_soil } = req.body;
  if (plant_name)     plantProfile.plant_name     = plant_name;
  if (ideal_temp)     plantProfile.ideal_temp     = ideal_temp;
  if (ideal_humidity) plantProfile.ideal_humidity = ideal_humidity;
  if (ideal_light)    plantProfile.ideal_light    = ideal_light;
  if (ideal_soil)     plantProfile.ideal_soil     = ideal_soil;

  logEvent(`Plant profile updated to "${plantProfile.plant_name}"`);
  broadcast({ type: 'profile', payload: plantProfile });
  res.json(plantProfile);
});

app.get('/api/events', (req, res) => res.json(eventLog));

// ── WebSocket client handshake ────────────────────────────────────────────────
wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  const send = (type, payload) => ws.send(JSON.stringify({ type, payload }));
  if (latestReading) send('sensor', latestReading);
  send('actuator', actuatorState);
  send('profile', plantProfile);
  send('device', device);
  send('history', history.slice(-100));
  send('events', eventLog);

  ws.on('close', () => console.log('[WS] Client disconnected'));
  ws.on('error', (err) => console.error('[WS] Error:', err.message));
});

// ── Start server ──────────────────────────────────────────────────────────────
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌿 Greenhouse Digital Twin Backend`);
    console.log(`   REST API : http://localhost:${PORT}/api`);
    console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`   ESP32 should POST to: http://<this-computer-LAN-IP>:${PORT}/api/esp/data\n`);
  });
}

module.exports = { app, server, wss };
