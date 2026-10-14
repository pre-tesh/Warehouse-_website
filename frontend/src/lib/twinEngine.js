/**
 * twinEngine.js  —  Digital Twin Core Logic
 * ─────────────────────────────────────────────────────────────────────────────
 * This module contains ALL the "smart" behaviour of the digital twin:
 *   • Per-metric threshold evaluation   (evaluateMetric)
 *   • Overall plant health score        (computeHealthScore)
 *   • Human-readable advice generation  (generateAdvice)
 *   • Auto-light brightness mapping     (computeAutoLightBrightness)
 *
 * Intentionally kept framework-agnostic (pure JS) so it can be unit-tested
 * independently of any React/WebSocket infrastructure.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Types (JSDoc for editor autocomplete) ─────────────────────────────────────
/**
 * @typedef {'ok' | 'low' | 'high'} MetricStatus
 *
 * @typedef {{ status: MetricStatus, deviation: number }} MetricEval
 *   deviation: signed percentage outside the ideal range (0 if inside)
 *
 * @typedef {{
 *   temp: MetricEval,
 *   humidity: MetricEval,
 *   lux: MetricEval,
 *   soil: MetricEval,
 * }} ReadingEval
 */

// ── Constants ─────────────────────────────────────────────────────────────────
/** Number of recent readings to include in the rolling health score window */
const HEALTH_WINDOW = 20;

// ── Core evaluation ───────────────────────────────────────────────────────────

/**
 * evaluateMetric()
 * Compares a single sensor value against an ideal [min, max] range.
 *
 * @param {number} value      - current sensor reading
 * @param {[number, number]} range - [min, max] ideal range
 * @returns {MetricEval}
 *
 * Example:
 *   evaluateMetric(15, [18, 27]) → { status: 'low', deviation: -16.7 }
 *   evaluateMetric(23, [18, 27]) → { status: 'ok',  deviation: 0 }
 */
export function evaluateMetric(value, [min, max]) {
  if (value < min) {
    // Below ideal range — deviation = how far below as % of the range width
    const deviation = ((value - min) / (max - min)) * 100;
    return { status: 'low', deviation: parseFloat(deviation.toFixed(1)) };
  }
  if (value > max) {
    // Above ideal range
    const deviation = ((value - max) / (max - min)) * 100;
    return { status: 'high', deviation: parseFloat(deviation.toFixed(1)) };
  }
  return { status: 'ok', deviation: 0 };
}

/**
 * evaluateReading()
 * Runs evaluateMetric for all four metrics of a single sensor reading.
 *
 * @param {SensorReading} reading
 * @param {PlantProfile}  profile
 * @returns {ReadingEval}
 */
export function evaluateReading(reading, profile) {
  return {
    temp:     evaluateMetric(reading.temp,     profile.ideal_temp),
    humidity: evaluateMetric(reading.humidity, profile.ideal_humidity),
    lux:      evaluateMetric(reading.lux,      profile.ideal_lux),
    soil:     evaluateMetric(reading.soil,     profile.ideal_soil),
  };
}

// ── Health score ──────────────────────────────────────────────────────────────

/**
 * computeHealthScore()
 * Overall health score 0–100 based on what % of metrics are in-range
 * across the last HEALTH_WINDOW readings.
 *
 * Algorithm:
 *   For each reading in the window, each metric contributes:
 *     1.0 point if status === 'ok'
 *     max(0, 1 - |deviation|/50) partial credit for borderline values
 *   Score = (sum of credits) / (window_size × 4 metrics) × 100
 *
 * @param {SensorReading[]} history  - recent readings (latest last)
 * @param {PlantProfile}    profile
 * @returns {number}  0–100
 */
export function computeHealthScore(history, profile) {
  const window = history.slice(-HEALTH_WINDOW);
  if (window.length === 0) return 100;

  const metrics = ['temp', 'humidity', 'lux', 'soil'];
  const profileKeys = {
    temp:     'ideal_temp',
    humidity: 'ideal_humidity',
    lux:      'ideal_lux',
    soil:     'ideal_soil',
  };

  let totalCredit = 0;
  const maxCredit = window.length * metrics.length;

  for (const reading of window) {
    for (const metric of metrics) {
      const { status, deviation } = evaluateMetric(reading[metric], profile[profileKeys[metric]]);
      if (status === 'ok') {
        totalCredit += 1;
      } else {
        // Partial credit: lose points proportional to how far out-of-range
        // Cap penalty at 50% deviation (beyond that → 0 credit)
        totalCredit += Math.max(0, 1 - Math.abs(deviation) / 50);
      }
    }
  }

  return Math.round((totalCredit / maxCredit) * 100);
}

// ── Advice generation ─────────────────────────────────────────────────────────

// Human-readable descriptions of each metric for advice messages
const METRIC_LABELS = {
  temp:     'Temperature',
  humidity: 'Humidity',
  lux:      'Light (lux)',
  soil:     'Soil moisture',
};

// Specific action suggestions per metric × direction
const ADVICE_ACTIONS = {
  temp: {
    low:  'Try raising the ambient temperature or reducing ventilation.',
    high: 'Improve ventilation or move the plant away from heat sources.',
  },
  humidity: {
    low:  'Consider misting the leaves or placing a water tray nearby.',
    high: 'Increase airflow to reduce humidity and prevent mould.',
  },
  lux: {
    low:  'Consider turning on the grow light or moving the plant closer to a window.',
    high: 'Provide some shade or move the plant away from direct sunlight.',
  },
  soil: {
    low:  'The plant needs watering — soil moisture is too low.',
    high: 'Allow the soil to dry out before watering again to prevent root rot.',
  },
};

/**
 * generateAdvice()
 * Produces an array of human-readable advice strings based on which metrics
 * are out of range and in which direction.
 *
 * @param {ReadingEval} evaluation  - output of evaluateReading()
 * @param {string}      plantName
 * @returns {string[]}
 */
export function generateAdvice(evaluation, plantName) {
  const advice = [];
  const metrics = ['temp', 'humidity', 'lux', 'soil'];

  for (const metric of metrics) {
    const { status } = evaluation[metric];
    if (status === 'ok') continue;

    const label  = METRIC_LABELS[metric];
    const action = ADVICE_ACTIONS[metric][status];
    const dir    = status === 'low' ? 'below' : 'above';

    advice.push(`${label} is ${dir} the ideal range for ${plantName}. ${action}`);
  }

  if (advice.length === 0) {
    advice.push(`All metrics are within the ideal range. ${plantName} is thriving! 🌿`);
  }

  return advice;
}

// ── Auto-light control ────────────────────────────────────────────────────────

/**
 * computeAutoLightBrightness()
 * Determines the LED grow-light brightness level based on current lux.
 *
 * Logic:
 *   - If lux ≥ luxMin  →  light is not needed, return 0
 *   - If lux < luxMin  →  linearly ramp brightness from 0 (at luxMin) to 255 (at 0 lux)
 *     brightness = (1 - lux / luxMin) × 255
 *
 * This means the darker it gets, the brighter the grow light will be,
 * proportionally compensating for the lux deficit.
 *
 * @param {number} lux
 * @param {[number, number]} idealLux  - [min, max]
 * @returns {number}  brightness 0-255
 */
export function computeAutoLightBrightness(lux, [luxMin, luxMax]) {
  if (!Number.isFinite(lux) || !Number.isFinite(luxMin) || !Number.isFinite(luxMax)) {
    return 0;
  }

  if (lux >= luxMin && lux <= luxMax) return 0;
  if (lux > luxMax) return 0;

  const deficit = luxMin - lux;
  const ratio = deficit / Math.max(luxMin, 1);
  return Math.round(Math.min(Math.max(ratio * 255, 0), 255));
}

/**
 * shouldAutoLightBeOn()
 * Convenience predicate for the auto-light decision.
 *
 * @param {number} lux
 * @param {[number, number]} idealLux
 * @returns {boolean}
 */
export function shouldAutoLightBeOn(lux, idealLux) {
  return computeAutoLightBrightness(lux, idealLux) > 0;
}

// ── Health score color helper ─────────────────────────────────────────────────

/**
 * healthScoreColor()
 * Maps a 0-100 health score to one of three status colours.
 *
 * @param {number} score
 * @returns {'#6BCB77' | '#D9A441' | '#E05C5C'}
 */
export function healthScoreColor(score) {
  if (score >= 75) return '#6BCB77'; // healthy green
  if (score >= 45) return '#D9A441'; // warning amber
  return '#E05C5C';                  // danger red
}

/**
 * statusColor()
 * Returns a CSS variable name for a given metric status.
 */
export function statusColor(status) {
  switch (status) {
    case 'ok':   return 'var(--sage)';
    case 'low':  return 'var(--amber)';
    case 'high': return 'var(--red-alert)';
    default:     return 'var(--text-muted)';
  }
}
