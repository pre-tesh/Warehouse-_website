/**
 * App.jsx — Application root
 * Wraps the app in data providers and renders the Dashboard.
 */
import { SensorProvider } from './context/SensorContext';
import { ActuatorProvider } from './context/ActuatorContext';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <SensorProvider>
      <ActuatorProvider>
        <Dashboard />
      </ActuatorProvider>
    </SensorProvider>
  );
}
