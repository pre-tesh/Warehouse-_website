/**
 * server.js  —  Mini Greenhouse Digital Twin: Node/Express Backend
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides:
 *   REST endpoints for sensor history, actuator state, and plant profile
 *   WebSocket server that pushes new sensor readings to all clients every 3s
 *
 * Data source is mockGenerator.js — swap that module for a real ESP32 adapter
 * when hardware is available (see mockGenerator.js header for the interface).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const http    = require('http');
const WebSocket = require('ws');
const cors    = require('cors');
const { v4: uuidv4 } = require('uuid');
const { tick, getLatestReading, getHistory } = require('./mockGenerator');

// ── App setup ─────────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// ── In-memory state ───────────────────────────────────────────────────────────

/** Active plant profile (Basil defaults) */
let plantProfile = {
  plant_name:      'Basil',
  ideal_temp:      [18, 27],
  ideal_humidity:  [40, 70],
  ideal_lux:       [2000, 7000],
  ideal_soil:      [40, 75],
};

/** Actuator state */
let actuatorState = {
  light_on:   false,
  brightness: 0,      // 0-255
  mode:       'auto', // 'auto' | 'manual'
};

/** Simple event log (last 50 events) */
const eventLog = [];
function logEvent(message) {
  const entry = { id: uuidv4(), timestamp: new Date().toISOString(), message };
  eventLog.unshift(entry);
  if (eventLog.length > 50) eventLog.pop();
  // Push event to all WebSocket clients
  broadcast({ type: 'event', payload: entry });
  return entry;
}

// ── Auto-light logic ──────────────────────────────────────────────────────────
/**
 * computeAutoLightBrightness()
 * Maps current lux to a brightness (0-255) using a linear ramp.
 * The darker the greenhouse (lower lux), the brighter the grow light.
 *
 * @param {number} lux         - current lux reading
 * @param {number} luxMin      - lower bound of ideal lux range
 * @param {number} luxMax      - upper bound of ideal lux range
 * @returns {number}           - brightness value 0-255
 */
function computeAutoLightBrightness(lux, luxMin, luxMax) {
  if (!Number.isFinite(lux) || !Number.isFinite(luxMin) || !Number.isFinite(luxMax)) {
    return 0;
  }

  // Already inside the configured optimal lux window: keep the light off.
  if (lux >= luxMin && lux <= luxMax) return 0;

  // Above the preferred maximum: the greenhouse is already bright enough,
  // so the light should remain off to avoid overshooting the target range.
  if (lux > luxMax) return 0;

  // Below the minimum target lux: ramp LED power up in proportion to the deficit.
  const deficit = luxMin - lux;
  const ratio = deficit / Math.max(luxMin, 1);
  return Math.round(clamp(ratio * 255, 0, 255));
}

function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

/**
 * applyAutoLight()
 * Called on every sensor tick when actuator is in 'auto' mode.
 * Updates actuatorState and logs events when the light turns on/off.
 */
function applyAutoLight(reading) {
  if (actuatorState.mode !== 'auto') return;

  const [luxMin, luxMax] = plantProfile.ideal_lux || [0, 0];
  const newBrightness = computeAutoLightBrightness(reading.lux, luxMin, luxMax);
  const shouldBeOn = newBrightness > 0;

  if (shouldBeOn !== actuatorState.light_on) {
    actuatorState.light_on   = shouldBeOn;
    actuatorState.brightness = newBrightness;
    if (shouldBeOn) {
      logEvent(`Light auto-turned ON — lux ${reading.lux} is below the ${luxMin}-${luxMax} optimal window`);
    } else {
      logEvent(`Light auto-turned OFF — lux ${reading.lux} is within the ${luxMin}-${luxMax} optimal window`);
    }
  } else {
    actuatorState.brightness = newBrightness;
  }
}

// ── WebSocket broadcast ───────────────────────────────────────────────────────
function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// ── Sensor tick interval (every 3 seconds) ────────────────────────────────────
setInterval(() => {
  const reading = tick();          // generate (or fetch from ESP32) a new reading
  applyAutoLight(reading);         // run auto-light decision
  broadcast({ type: 'sensor', payload: reading });
  broadcast({ type: 'actuator', payload: actuatorState });
}, 3000);

// ── REST API ──────────────────────────────────────────────────────────────────

// Latest sensor reading
app.get('/api/sensor/latest', (req, res) => {
  res.json(getLatestReading());
});

// Historical readings (last n)
app.get('/api/sensor/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(getHistory(limit));
});

// Actuator state (GET)
app.get('/api/actuator', (req, res) => {
  res.json(actuatorState);
});

// Actuator state (POST) — manual override
app.post('/api/actuator', (req, res) => {
  const { light_on, brightness, mode } = req.body;

  if (mode !== undefined) actuatorState.mode = mode;
  if (mode === 'manual') {
    // Manual override — accept explicit light_on and brightness
    if (light_on  !== undefined) actuatorState.light_on   = light_on;
    if (brightness !== undefined) actuatorState.brightness = clamp(brightness, 0, 255);

    logEvent(`Manual override: light ${actuatorState.light_on ? 'ON' : 'OFF'} at ${Math.round(actuatorState.brightness / 255 * 100)}% brightness`);
  } else if (mode === 'auto') {
    logEvent('Switched back to auto mode');
  }

  broadcast({ type: 'actuator', payload: actuatorState });
  res.json(actuatorState);
});

// Active plant profile (GET)
app.get('/api/profile', (req, res) => {
  res.json(plantProfile);
});

// Update plant profile (PUT)
app.put('/api/profile', (req, res) => {
  const { plant_name, ideal_temp, ideal_humidity, ideal_lux, ideal_soil } = req.body;
  if (plant_name)     plantProfile.plant_name     = plant_name;
  if (ideal_temp)     plantProfile.ideal_temp     = ideal_temp;
  if (ideal_humidity) plantProfile.ideal_humidity = ideal_humidity;
  if (ideal_lux)      plantProfile.ideal_lux      = ideal_lux;
  if (ideal_soil)     plantProfile.ideal_soil     = ideal_soil;

  if (actuatorState.mode === 'auto') {
    applyAutoLight(getLatestReading());
  }

  logEvent(`Plant profile updated to "${plantProfile.plant_name}"`);
  broadcast({ type: 'profile', payload: plantProfile });
  broadcast({ type: 'actuator', payload: actuatorState });
  res.json(plantProfile);
});

// Event log (GET)
app.get('/api/events', (req, res) => {
  res.json(eventLog);
});

// ── WebSocket client handshake ────────────────────────────────────────────────
wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  // Send current state immediately on connect so the UI hydrates instantly
  ws.send(JSON.stringify({ type: 'sensor',   payload: getLatestReading() }));
  ws.send(JSON.stringify({ type: 'actuator', payload: actuatorState }));
  ws.send(JSON.stringify({ type: 'profile',  payload: plantProfile }));
  ws.send(JSON.stringify({ type: 'history',  payload: getHistory(100) }));
  ws.send(JSON.stringify({ type: 'events',   payload: eventLog }));

  ws.on('close', () => console.log('[WS] Client disconnected'));
  ws.on('error', (err) => console.error('[WS] Error:', err.message));
});

// ── Start server ──────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🌿 Greenhouse Digital Twin Backend`);
  console.log(`   REST API : http://localhost:${PORT}/api`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws\n`);
});
