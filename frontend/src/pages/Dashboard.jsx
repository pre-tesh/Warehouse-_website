/**
 * Dashboard.jsx
 * Main dashboard page — the primary view of the digital twin.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  Header (title + connection status + timestamp)             │
 *   ├─────────────────────────┬───────────────────────────────────┤
 *   │  3D Greenhouse Scene    │  Right Panel:                     │
 *   │  (60% width)            │    Sensor Cards (2×2 grid)        │
 *   │                         │    Health Score                   │
 *   │                         │    Actuator Panel                 │
 *   ├─────────────────────────┴───────────────────────────────────┤
 *   │  Tab bar: [Charts] [Events] [Profile]                       │
 *   │  Tab content panel                                          │
 *   └─────────────────────────────────────────────────────────────┘
 */
import { useState } from 'react';
import { useSensor } from '../context/SensorContext';
import GreenhouseScene from '../components/3d/GreenhouseScene';
import SensorCard from '../components/SensorCard';
import HealthScore from '../components/HealthScore';
import ActuatorPanel from '../components/ActuatorPanel';
import HistoryCharts from '../components/HistoryCharts';
import EventLog from '../components/EventLog';
import PlantProfileEditor from '../components/PlantProfileEditor';
import './Dashboard.css';

const TABS = ['Charts', 'Events', 'Profile'];

export default function Dashboard() {
  const { latest, history, profile, events, connected, device } = useSensor();
  const [activeTab, setActiveTab] = useState('Charts');

  const now = latest?.timestamp
    ? new Date(latest.timestamp).toLocaleTimeString()
    : '—';

  return (
    <div className="dashboard">
      <header className="dashboard__topbar">
        <div className="dashboard__title-group">
          <div className="dashboard__logo">🌿</div>
          <div>
            <h1 className="dashboard__title">Greenhouse Digital Twin</h1>
            <p className="dashboard__subtitle">ESP32 · {profile.plant_name} · Real-time monitoring</p>
          </div>
        </div>

        <div className="dashboard__header-right">
          <div className={`dashboard__conn ${connected && device.online ? 'connected' : 'disconnected'}`}>
            <span className="dashboard__conn-dot pulse" />
            {!connected ? 'Connecting to server…' : device.online ? 'Live · ESP32 online' : 'ESP32 offline'}
          </div>
          <div className="dashboard__timestamp">Last update: {now}</div>
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <main className="dashboard__main">
        {/* 3D Scene — centerpiece */}
        <section className="dashboard__scene">
          <div className="dashboard__scene-inner">
            <GreenhouseScene />
          </div>

          <div className="dashboard__scene-status">
            <HealthScore history={history} profile={profile} compact />
          </div>

          <div className="dashboard__scene-label">
            3D Digital Twin — Orbit to explore
          </div>
        </section>

        {/* Right panel */}
        <aside className="dashboard__right">
          {/* Sensor cards */}
          <div className="dashboard__sensor-grid">
            {[
              { metric: 'temp',     idealRange: profile.ideal_temp },
              { metric: 'humidity', idealRange: profile.ideal_humidity },
              { metric: 'light',    idealRange: profile.ideal_light },
              { metric: 'soil',     idealRange: profile.ideal_soil },
            ].map(({ metric, idealRange }) => (
              <SensorCard
                key={metric}
                metric={metric}
                value={latest?.[metric] ?? null}
                history={history}
                idealRange={idealRange}
              />
            ))}
          </div>

          {/* Grow light control sits directly below metrics for faster access */}
          <ActuatorPanel />
        </aside>
      </main>

      {/* ── Bottom tab section ───────────────────────────────────────────── */}
      <section className="dashboard__bottom">
        <div className="tab-bar">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'Charts'  && '📈 '}
              {tab === 'Events'  && '📋 '}
              {tab === 'Profile' && '🌱 '}
              {tab}
            </button>
          ))}
        </div>

        <div className="dashboard__tab-content fade-in" key={activeTab}>
          {activeTab === 'Charts'  && <HistoryCharts history={history} profile={profile} />}
          {activeTab === 'Events'  && <EventLog events={events} />}
          {activeTab === 'Profile' && <PlantProfileEditor />}
        </div>
      </section>
    </div>
  );
}
