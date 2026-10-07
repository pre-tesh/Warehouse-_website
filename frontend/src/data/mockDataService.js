/**
 * mockDataService.js  —  DATA SOURCE SWAP POINT
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS THE ONE FILE TO REPLACE when connecting a real ESP32.
 *
 * To connect a real ESP32:
 *   1. Change VITE_BACKEND_URL in your .env to point at the ESP32/backend host.
 *   2. Ensure the ESP32/backend broadcasts the same message shapes over WebSocket:
 *        { type: 'sensor',   payload: SensorReading }
 *        { type: 'actuator', payload: ActuatorState }
 *        { type: 'profile',  payload: PlantProfile  }
 *        { type: 'history',  payload: SensorReading[] }
 *        { type: 'events',   payload: EventEntry[]   }
 *   3. No other files need changing.
 *
 * Current implementation:
 *   Connects to the local Node backend (which runs mockGenerator.js internally).
 *   The backend WebSocket path is ws://localhost:4000/ws.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
const WS_URL      = BACKEND_URL.replace(/^http/, 'ws') + '/ws';

/**
 * createDataService()
 * Returns a data service object that manages the WebSocket connection.
 * Consumers register handlers via `.on(eventType, handler)`.
 *
 * @returns {{ on, off, sendActuatorCommand, disconnect }}
 */
export function createDataService() {
  let ws        = null;
  const handlers = {}; // { [eventType]: Set<Function> }

  function dispatch(type, payload) {
    if (handlers[type]) {
      handlers[type].forEach(fn => fn(payload));
    }
  }

  function connect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[DataService] WebSocket connected to', WS_URL);
      dispatch('connected', true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        dispatch(msg.type, msg.payload);
      } catch (err) {
        console.error('[DataService] Failed to parse message:', err);
      }
    };

    ws.onclose = () => {
      console.warn('[DataService] WebSocket closed. Reconnecting in 3s…');
      dispatch('connected', false);
      setTimeout(connect, 3000); // auto-reconnect
    };

    ws.onerror = (err) => {
      console.error('[DataService] WebSocket error:', err);
    };
  }

  connect();

  return {
    /**
     * Register a listener for a given event type.
     * Types: 'sensor' | 'actuator' | 'profile' | 'history' | 'events' | 'event' | 'connected'
     */
    on(type, handler) {
      if (!handlers[type]) handlers[type] = new Set();
      handlers[type].add(handler);
    },

    off(type, handler) {
      handlers[type]?.delete(handler);
    },

    /**
     * Send an actuator command to the backend REST API.
     * This is separate from the WebSocket because commands are infrequent writes.
     *
     * @param {Partial<ActuatorState>} patch
     */
    async sendActuatorCommand(patch) {
      const res = await fetch(`${BACKEND_URL}/api/actuator`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      });
      return res.json();
    },

    /**
     * Update the plant profile via REST.
     * @param {PlantProfile} profile
     */
    async updateProfile(profile) {
      const res = await fetch(`${BACKEND_URL}/api/profile`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(profile),
      });
      return res.json();
    },

    disconnect() {
      ws?.close();
    },
  };
}

// ── Singleton instance ────────────────────────────────────────────────────────
// A single shared instance used across the app via React context.
let _instance = null;
export function getDataService() {
  if (!_instance) _instance = createDataService();
  return _instance;
}
