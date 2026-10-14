/**
 * mockGenerator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Only used when the backend is started with USE_MOCK=1 (no real ESP32).
 * Produces a plausible { temp, humidity, soil, light } reading.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function gaussianNoise(sigma) {
  const u = 1 - Math.random();
  const v = Math.random();
  return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

let soil = 55;

function generateReading() {
  const t = (Date.now() % 86400000) / 86400000; // 0..1 through the day

  const temp     = clamp(24 + 6 * Math.sin(2 * Math.PI * (t - 0.25)) + gaussianNoise(0.4), 15, 40);
  const humidity = clamp(65 - 10 * Math.sin(2 * Math.PI * (t - 0.25)) + gaussianNoise(1.5), 20, 100);
  const light    = clamp(80 * Math.sin(Math.PI * t) ** 2 + gaussianNoise(2), 0, 100);

  soil = clamp(soil - 0.05 + gaussianNoise(0.2), 10, 95);
  if (soil < 30) soil = 70; // "watered"

  return {
    temp:     parseFloat(temp.toFixed(1)),
    humidity: parseFloat(humidity.toFixed(1)),
    soil:     parseFloat(soil.toFixed(1)),
    light:    parseFloat(light.toFixed(1)),
  };
}

module.exports = { generateReading };
