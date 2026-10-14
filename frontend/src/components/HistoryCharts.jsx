/**
 * HistoryCharts.jsx
 * Line charts for all four sensor metrics with ideal-range shaded bands.
 */
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ReferenceArea,
} from 'recharts';
import './HistoryCharts.css';

const METRICS = [
  { key: 'temp',     label: 'Temperature', unit: '°C',  color: '#2d6a4f', profileKey: 'ideal_temp' },
  { key: 'humidity', label: 'Humidity',    unit: '%',   color: '#0284c7', profileKey: 'ideal_humidity' },
  { key: 'light',    label: 'Light Level', unit: '%',   color: '#d97706', profileKey: 'ideal_light' },
  { key: 'soil',     label: 'Soil Moisture',unit: '%',   color: '#7c3aed', profileKey: 'ideal_soil' },
];

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function MetricChart({ metric, data, profile }) {
  const [rangeMin, rangeMax] = profile[metric.profileKey] ?? [0, 100];

  const chartData = (data ?? []).map(r => ({
    t: formatTime(r.timestamp),
    v: r[metric.key],
  }));

  // Compute y-axis domain with padding
  const values = chartData.map(d => d.v).filter(Boolean);
  const dataMin = Math.min(...values, rangeMin) * 0.9;
  const dataMax = Math.max(...values, rangeMax) * 1.1;

  return (
    <div className="history-chart">
      <div className="history-chart__title">
        <span style={{ color: metric.color, fontSize: '0.85rem' }}>●</span> {metric.label}
        <span className="history-chart__range-badge">
          Ideal: {rangeMin}–{rangeMax}{metric.unit}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 4" stroke="#e2ebe3" />

          <XAxis
            dataKey="t"
            tick={{ fill: '#496150', fontSize: 10, fontWeight: 500 }}
            tickLine={false}
            axisLine={{ stroke: '#dbe5dc' }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[dataMin, dataMax]}
            tick={{ fill: '#496150', fontSize: 10, fontWeight: 500 }}
            tickLine={false}
            axisLine={{ stroke: '#dbe5dc' }}
            width={40}
          />

          <Tooltip
            contentStyle={{
              background: '#ffffff',
              border: '1px solid #dbe5dc',
              borderRadius: 10,
              fontSize: '0.78rem',
              color: '#152419',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              fontWeight: 600,
            }}
            formatter={(v) => [`${v.toFixed(1)}${metric.unit}`, metric.label]}
          />

          {/* Ideal range shaded band */}
          <ReferenceArea
            y1={rangeMin}
            y2={rangeMax}
            fill={metric.color}
            fillOpacity={0.08}
            stroke={metric.color}
            strokeOpacity={0.25}
            strokeDasharray="4 4"
          />

          {/* Boundary lines */}
          <ReferenceLine y={rangeMin} stroke={metric.color} strokeDasharray="4 3" strokeOpacity={0.5} strokeWidth={1} />
          <ReferenceLine y={rangeMax} stroke={metric.color} strokeDasharray="4 3" strokeOpacity={0.5} strokeWidth={1} />

          <Line
            type="monotone"
            dataKey="v"
            stroke={metric.color}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 5, fill: metric.color, stroke: '#ffffff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function HistoryCharts({ history, profile }) {
  return (
    <div className="history-charts">
      <div className="history-charts__grid">
        {METRICS.map(m => (
          <MetricChart key={m.key} metric={m} data={history} profile={profile} />
        ))}
      </div>
    </div>
  );
}
