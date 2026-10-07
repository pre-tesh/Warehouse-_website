/**
 * ActuatorPanel.jsx
 * Controls for the grow light: Auto/Manual mode toggle, on/off switch,
 * and a brightness slider for manual mode.
 */
import { useActuator } from '../context/ActuatorContext';
import './ActuatorPanel.css';

export default function ActuatorPanel() {
  const { actuator, setManual, setAutoMode } = useActuator();
  const brightnessPercent = Math.round((actuator.brightness / 255) * 100);

  return (
    <div className="actuator-panel">
      <div className="actuator-panel__header">
        <span className="actuator-panel__title">💡 Grow Light</span>
        <span className={`actuator-panel__status ${actuator.light_on ? 'on' : 'off'}`}>
          {actuator.light_on ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* ── Mode toggle ─────────────────────────────────────────────────── */}
      <div className="actuator-panel__mode-row">
        <span className="actuator-panel__mode-label">Mode</span>
        <div className="actuator-panel__mode-toggle">
          <button
            className={`mode-btn ${actuator.mode === 'auto' ? 'active' : ''}`}
            onClick={setAutoMode}
          >
            Auto
          </button>
          <button
            className={`mode-btn ${actuator.mode === 'manual' ? 'active' : ''}`}
            onClick={() => setManual({ light_on: actuator.light_on, brightness: actuator.brightness })}
          >
            Manual
          </button>
        </div>
      </div>

      {/* ── Manual controls ─────────────────────────────────────────────── */}
      <div className={`actuator-panel__manual ${actuator.mode === 'manual' ? 'enabled' : 'disabled'}`}>
        {/* On/Off toggle */}
        <div className="actuator-panel__toggle-row">
          <span className="actuator-panel__toggle-label">Light</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={actuator.light_on}
              disabled={actuator.mode !== 'manual'}
              onChange={(e) => setManual({ light_on: e.target.checked, brightness: e.target.checked ? Math.max(actuator.brightness, 128) : 0 })}
            />
            <span className="toggle-thumb" />
          </label>
        </div>

        {/* Brightness slider */}
        <div className="actuator-panel__slider-row">
          <span className="actuator-panel__slider-label">Brightness</span>
          <span className="actuator-panel__slider-value">{brightnessPercent}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="255"
          value={actuator.brightness}
          disabled={actuator.mode !== 'manual'}
          onChange={(e) => setManual({ light_on: parseInt(e.target.value) > 0, brightness: parseInt(e.target.value) })}
          className="actuator-panel__slider"
        />
      </div>

      {/* ── Auto mode info ──────────────────────────────────────────────── */}
      {actuator.mode === 'auto' && (
        <div className="actuator-panel__auto-info">
          <span>🤖</span>
          <span>Auto mode: light activates when lux falls below the plant's ideal range. Brightness scales proportionally with the lux deficit.</span>
        </div>
      )}

      {/* ── Brightness bar ───────────────────────────────────────────────── */}
      <div className="actuator-panel__brightness-bar-wrap">
        <div
          className="actuator-panel__brightness-bar"
          style={{ width: `${brightnessPercent}%`, opacity: actuator.light_on ? 1 : 0.2 }}
        />
      </div>
    </div>
  );
}
