/**
 * EventLog.jsx
 * Scrollable color-coded event log feed.
 */
import './EventLog.css';

function formatTime(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function eventDot(message) {
  const msg = message.toLowerCase();
  if (msg.includes('off') || msg.includes('back in range') || msg.includes('optimal') || msg.includes('updated'))
    return '#6BCB77';
  if (msg.includes('on') || msg.includes('manual'))
    return '#D9A441';
  if (msg.includes('stress') || msg.includes('low') || msg.includes('high'))
    return '#E05C5C';
  return '#7A9E7E';
}

export default function EventLog({ events }) {
  const list = events ?? [];

  return (
    <div className="event-log">
      <div className="event-log__header">
        <span>📋 Event Log</span>
        <span className="event-log__count">{list.length} events</span>
      </div>
      <div className="event-log__list">
        {list.length === 0 && (
          <div className="event-log__empty">No events yet. Waiting for sensor data…</div>
        )}
        {list.map((ev) => (
          <div key={ev.id} className="event-log__item">
            <span className="event-log__dot" style={{ background: eventDot(ev.message) }} />
            <span className="event-log__time">{formatTime(ev.timestamp)}</span>
            <span className="event-log__msg">{ev.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
