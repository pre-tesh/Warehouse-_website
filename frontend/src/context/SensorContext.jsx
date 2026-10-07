/**
 * SensorContext.jsx
 * Provides real-time sensor data, history, plant profile, events, and
 * connection status to the entire component tree.
 */
import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { getDataService } from '../data/mockDataService';

const SensorContext = createContext(null);

const DEFAULT_PROFILE = {
  plant_name:     'Basil',
  ideal_temp:     [18, 27],
  ideal_humidity: [40, 70],
  ideal_lux:      [2000, 7000],
  ideal_soil:     [40, 75],
};

const initialState = {
  latest:      null,
  history:     [],
  profile:     DEFAULT_PROFILE,
  events:      [],
  connected:   false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SENSOR': {
      const history = [...state.history, action.payload].slice(-200);
      return { ...state, latest: action.payload, history };
    }
    case 'HISTORY':
      return { ...state, history: action.payload };
    case 'PROFILE':
      return { ...state, profile: action.payload };
    case 'EVENTS':
      return { ...state, events: action.payload };
    case 'EVENT':
      return { ...state, events: [action.payload, ...state.events].slice(0, 50) };
    case 'CONNECTED':
      return { ...state, connected: action.payload };
    default:
      return state;
  }
}

export function SensorProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const svcRef = useRef(null);

  useEffect(() => {
    const svc = getDataService();
    svcRef.current = svc;

    svc.on('sensor',    p => dispatch({ type: 'SENSOR',    payload: p }));
    svc.on('history',   p => dispatch({ type: 'HISTORY',   payload: p }));
    svc.on('profile',   p => dispatch({ type: 'PROFILE',   payload: p }));
    svc.on('events',    p => dispatch({ type: 'EVENTS',    payload: p }));
    svc.on('event',     p => dispatch({ type: 'EVENT',     payload: p }));
    svc.on('connected', p => dispatch({ type: 'CONNECTED', payload: p }));

    return () => {
      // Note: we don't disconnect on unmount since the service is a singleton
    };
  }, []);

  const value = {
    ...state,
    dataService: svcRef.current,
    updateProfile: async (profile) => {
      const updated = await svcRef.current?.updateProfile(profile);
      if (updated) dispatch({ type: 'PROFILE', payload: updated });
      return updated;
    },
  };

  return <SensorContext.Provider value={value}>{children}</SensorContext.Provider>;
}

export function useSensor() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error('useSensor must be used within SensorProvider');
  return ctx;
}
