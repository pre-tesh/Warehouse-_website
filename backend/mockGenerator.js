/**
 * mockGenerator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Simulates realistic ESP32 sensor readings for the greenhouse digital twin.
 *
 * Generates sinusoidal base values (to mimic day/night cycles and natural drift)
 * with Gaussian noise layered on top. This is the only file that needs to be
 * replaced (or supplemented) when a real ESP32 is connected.
 *
 * Exported interface:
 *   getLatestReading() → SensorReading
 *   getHistory(n)      → SensorReading[]
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Rolling history buffer (max 200 readings) ────────────────────────────────
const MAX_HISTORY = 200;
const history = [];

// ── Gaussian noise helper ─────────────────────────────────────────────────────
function gaussianNoise(sigma) {
  // Box-Muller transform for normally-distributed noise
  const u = 1 - Math.random();
  const v = Math.random();
  return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── Clamp helper ──────────────────────────────────────────────────────────────
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

// ── Persistent state for soil moisture (drifts slowly between readings) ───────
let soilMoisture = 55; // starts in a healthy range
let soilDrift = -0.05; // slowly drying out by default

/**
 * Generates one realistic sensor reading.
 * All values are driven by the current wall-clock time so they change
 * continuously, making charts interesting even during extended demos.
 *
 * @returns {SensorReading}
 */
function generateReading() {
  const now = Date.now();
  // t: normalised time-of-day (0 → midnight, 0.5 → noon, 1 → next midnight)
  const t = (now % (24 * 3600 * 1000)) / (24 * 3600 * 1000);

  // ── Temperature: 18–30°C, peaks at midday ──────────────────────────────────
  const tempBase = 24 + 6 * Math.sin(2 * Math.PI * (t - 0.25));
  const temp = clamp(tempBase + gaussianNoise(0.4), 15, 40);

  // ── Humidity: 50–80%, inversely correlated with temp ──────────────────────
  const humBase = 65 - 10 * Math.sin(2 * Math.PI * (t - 0.25));
  const humidity = clamp(humBase + gaussianNoise(1.5), 20, 100);

  // ── Lux: 0 at night, 0–8000 lux during day, peaks at midday ──────────────
  const luxPhase = Math.sin(Math.PI * t) ** 2; // 0 at midnight, 1 at noon
  const luxBase = 8000 * luxPhase + gaussianNoise(200);
  const lux = clamp(luxBase, 0, 10000);

  // ── Soil moisture: drifts slowly, reverses direction randomly ─────────────
  // Simulate gradual drying with occasional "watering" spikes
  if (Math.random() < 0.005) soilDrift = 2; // rare watering event
  if (soilMoisture < 30) soilDrift = Math.abs(soilDrift) * 0.5; // reverse if too dry
  if (soilMoisture > 85) soilDrift = -0.05; // stop if too wet
  soilMoisture = clamp(soilMoisture + soilDrift + gaussianNoise(0.2), 10, 95);
  soilDrift = soilDrift * 0.99 - 0.01; // decay drift

  return {
    temp: parseFloat(temp.toFixed(1)),
    humidity: parseFloat(humidity.toFixed(1)),
    lux: Math.round(lux),
    soil: parseFloat(soilMoisture.toFixed(1)),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Pre-populate history with back-dated readings so charts have data immediately.
 */
function preFillHistory() {
  const now = Date.now();
  // Temporarily shift time to generate historical readings for the past hour
  for (let i = MAX_HISTORY; i >= 1; i--) {
    const pastTime = now - i * 3000; // every 3s in the past
    const fakeNow = new Date(pastTime);
    history.push({
      temp: parseFloat((24 + 6 * Math.sin(2 * Math.PI * (pastTime % 86400000) / 86400000 - Math.PI / 2) + gaussianNoise(0.4)).toFixed(1)),
      humidity: parseFloat((65 - 10 * Math.sin(2 * Math.PI * (pastTime % 86400000) / 86400000 - Math.PI / 2) + gaussianNoise(1.5)).toFixed(1)),
      lux: Math.max(0, Math.round(8000 * Math.sin(Math.PI * ((pastTime % 86400000) / 86400000)) ** 2 + gaussianNoise(200))),
      soil: parseFloat(clamp(55 + (MAX_HISTORY - i) * (-0.05) + gaussianNoise(0.2), 10, 95).toFixed(1)),
      timestamp: fakeNow.toISOString(),
    });
  }
}

preFillHistory();

/**
 * Tick: add a new reading to the rolling history buffer every time it's called.
 * The server calls this on an interval.
 */
function tick() {
  const reading = generateReading();
  history.push(reading);
  if (history.length > MAX_HISTORY) history.shift();
  return reading;
}

/**
 * Returns the most recent reading (generating a new one if needed).
 */
function getLatestReading() {
  if (history.length === 0) tick();
  return history[history.length - 1];
}

/**
 * Returns the last `n` readings from the history buffer.
 * @param {number} n
 */
function getHistory(n = 100) {
  return history.slice(-n);
}

module.exports = { tick, getLatestReading, getHistory };
