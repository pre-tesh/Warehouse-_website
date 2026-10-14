/**
 * ActuatorPanel.jsx
 * Three on/off buttons — one per physical LED in the greenhouse — plus
 * "All on / All off" shortcuts. Commands go backend -> ESP32.
 */
import { useActuator } from '../context/ActuatorContext';
import { useSensor } from '../context/SensorContext';
import './ActuatorPanel.css';

export default function ActuatorPanel() {
  const { actuator, toggleLed, setAll } = useActuator();
  const { device } = useSensor();
  const leds = actuator.leds ?? [false, false, false];
  const onCount = leds.filter(Boolean).length;

  return (
    <div className="actuator-panel">
      <div className="actuator-panel__header">
        <span className="actuator-panel__title">💡 Grow Lights</span>
        <span className={`actuator-panel__status ${onCount > 0 ? 'on' : 'off'}`}>
          {onCount}/3 ON
        </span>
      </div>

      <div className="actuator-panel__buttons">
        {leds.map((on, i) => (
          <button
            key={i}
            type="button"
            className={`led-btn ${on ? 'on' : 'off'}`}
            onClick={() => toggleLed(i)}
            aria-pressed={on}
          >
            <span className="led-btn__bulb">{on ? '💡' : '○'}</span>
            <span className="led-btn__name">Light {i + 1}</span>
            <span className="led-btn__state">{on ? 'ON' : 'OFF'}</span>
          </button>
        ))}
      </div>

      <div className="actuator-panel__shortcuts">
        <button type="button" className="shortcut-btn" onClick={() => setAll(true)} disabled={onCount === 3}>
          All on
        </button>
        <button type="button" className="shortcut-btn" onClick={() => setAll(false)} disabled={onCount === 0}>
          All off
        </button>
      </div>

      {!device.online && (
        <div className="actuator-panel__warning">
          ESP32 is offline — commands will be applied when it reconnects.
        </div>
      )}
    </div>
  );
}
