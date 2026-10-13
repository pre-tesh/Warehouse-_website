/**
 * HealthScore.jsx
 * Circular arc SVG health score indicator + advice text list.
 */
import { useMemo } from 'react';
import {
  computeHealthScore,
  evaluateReading,
  generateAdvice,
  healthScoreColor,
} from '../lib/twinEngine';
import './HealthScore.css';

// ── SVG arc helpers ───────────────────────────────────────────────────────────
function polarToXY(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export default function HealthScore({ history, profile, compact = false }) {
  const score = useMemo(() => computeHealthScore(history ?? [], profile), [history, profile]);

  const latest = history?.[history.length - 1];
  const evaluation = latest ? evaluateReading(latest, profile) : null;
  const advice = evaluation ? generateAdvice(evaluation, profile.plant_name) : [];

  const color = healthScoreColor(score);
  const statusText = score >= 75 ? 'Thriving' : score >= 45 ? 'Needs Attention' : 'Stressed';
  const scoreAngle = (score / 100) * 280;
  const startAngle = 130;
  const endAngle = startAngle + scoreAngle;

  const trackPath = arcPath(60, 60, 48, 130, 130 + 280);
  const fillPath = score > 0 ? arcPath(60, 60, 48, 130, endAngle) : '';

  if (compact) {
    return (
      <div className="health-score health-score--compact" style={{ '--status-color': color }}>
        <div className="health-score__status-row">
          <span className="health-score__status-dot" />
          <span className="health-score__status-label">{statusText}</span>
          <span className="health-score__score-pill">{score}</span>
        </div>

        <div className="health-score__hover-panel">
          <div className="health-score__hover-title">Plant status</div>
          <div className="health-score__hover-score">{score}/100</div>
          <div className="health-score__advice">
            {advice.map((text, i) => (
              <div key={i} className="health-score__advice-item">
                <span className="health-score__advice-dot" style={{ background: color }} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="health-score">
      <div className="health-score__arc-wrap">
        <svg viewBox="0 0 120 120" className="health-score__svg">
          <path d={trackPath} fill="none" stroke="#1e3020" strokeWidth="8" strokeLinecap="round" />
          {fillPath && (
            <path
              d={fillPath}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: 'stroke 0.5s ease' }}
            />
          )}
          <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>
            {score}
          </text>
          <text x="60" y="72" textAnchor="middle" fontSize="8" fill="#7A9E7E" letterSpacing="2">
            HEALTH
          </text>
        </svg>
      </div>

      <div className="health-score__label" style={{ color }}>
        {statusText}
      </div>

      <div className="health-score__advice">
        {advice.map((text, i) => (
          <div key={i} className="health-score__advice-item">
            <span className="health-score__advice-dot" style={{ background: score >= 75 ? '#6BCB77' : score >= 45 ? '#D9A441' : '#E05C5C' }} />
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
