/**
 * SensorCard.jsx
 * Real-time sensor reading card with status badge and mini sparkline chart.
 */
import { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, ReferenceLine,
} from 'recharts';
import { evaluateMetric, statusColor } from '../lib/twinEngine';
import './SensorCard.css';

const METRIC_CONFIG = {
  temp:     { label: 'Temperature', unit: '°C', icon: '🌡️', decimals: 1 },
  humidity: { label: 'Humidity',    unit: '%',  icon: '💧', decimals: 1 },
  light:    { label: 'Light',       unit: '%',  icon: '☀️', decimals: 0 },
  soil:     { label: 'Soil Moisture', unit: '%', icon: '🪴', decimals: 1 },
};

export default function SensorCard({ metric, value, history, idealRange }) {
  const cfg = METRIC_CONFIG[metric];
  const evaluation = idealRange ? evaluateMetric(value ?? 0, idealRange) : { status: 'ok', deviation: 0 };

  // Prepare sparkline data (last 30 readings)
  const sparkData = useMemo(() =>
    (history ?? []).slice(-30).map((r, i) => ({ i, v: r[metric] })),
    [history, metric]
  );

  const statusLabel = { ok: 'Optimal', low: 'Low', high: 'High' }[evaluation.status];
  const color = statusColor(evaluation.status);

  return (
    <div className={`sensor-card sensor-card--${evaluation.status}`}>
      <div className="sensor-card__header">
        <span className="sensor-card__icon">{cfg.icon}</span>
        <span className="sensor-card__label">{cfg.label}</span>
        <span className="sensor-card__badge" style={{ color, borderColor: color }}>
          {statusLabel}
        </span>
      </div>

      <div className="sensor-card__value">
        {value !== null && value !== undefined
          ? value.toFixed(cfg.decimals)
          : '—'}
        <span className="sensor-card__unit">{cfg.unit}</span>
      </div>

      {idealRange && (
        <div className="sensor-card__range">
          Ideal: {idealRange[0]}–{idealRange[1]}{cfg.unit}
        </div>
      )}

      {/* Mini sparkline */}
      <div className="sensor-card__spark">
        <ResponsiveContainer width="100%" height={40}>
          <LineChart data={sparkData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            {idealRange && (
              <>
                <ReferenceLine y={idealRange[0]} stroke={color} strokeDasharray="3 3" strokeOpacity={0.4} />
                <ReferenceLine y={idealRange[1]} stroke={color} strokeDasharray="3 3" strokeOpacity={0.4} />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
