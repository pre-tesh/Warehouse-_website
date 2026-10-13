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

  let lightTone = 'Off';
  if (actuator.light_on) {
    if (brightnessPercent < 25) lightTone = 'Low';
    else if (brightnessPercent < 60) lightTone = 'Balanced';
    else if (brightnessPercent < 85) lightTone = 'High';
    else lightTone = 'Peak';
  }

  return (
    <div className="actuator-panel">
      <div className="actuator-panel__header">
        <span className="actuator-panel__title">💡 Grow Light</span>
        <span className={`actuator-panel__status ${actuator.light_on ? 'on' : 'off'}`}>
          {actuator.light_on ? 'ON' : 'OFF'}
        </span>
      </div>

      <div className="actuator-panel__slider-top">
        <div className="actuator-panel__slider-row">
          <span className="actuator-panel__slider-label">Brightness</span>
          <span className="actuator-panel__slider-value">{brightnessPercent}%</span>
        </div>

        <div className="actuator-panel__brightness-meter">
          <div
            className="actuator-panel__brightness-fill"
            style={{ width: `${brightnessPercent}%`, opacity: actuator.light_on ? 1 : 0.25 }}
          />
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

        <div className="actuator-panel__light-output">
          <span className="actuator-panel__light-tone">{lightTone}</span>
          <span className="actuator-panel__light-description">Warm, even crop lighting</span>
        </div>
      </div>

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

      <div className={`actuator-panel__manual ${actuator.mode === 'manual' ? 'enabled' : 'disabled'}`}>
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
      </div>

      {actuator.mode === 'auto' && (
        <div className="actuator-panel__auto-info">
          <span>🤖</span>
          <span>Auto mode: the roof light system reacts to lux and scales warmth and output to keep the plant within its ideal range.</span>
        </div>
      )}
    </div>
  );
}
