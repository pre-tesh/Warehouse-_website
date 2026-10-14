/**
 * ActuatorContext.jsx
 * Provides the state of the 3 LEDs and functions to switch them.
 */
import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { getDataService } from '../data/mockDataService';

const ActuatorContext = createContext(null);

const initialState = {
  leds: [false, false, false],
};

function reducer(state, action) {
  switch (action.type) {
    case 'UPDATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export function ActuatorProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const svcRef = useRef(null);
  const ledsRef = useRef(state.leds);
  ledsRef.current = state.leds;

  useEffect(() => {
    const svc = getDataService();
    svcRef.current = svc;
    const onActuator = p => dispatch({ type: 'UPDATE', payload: p });
    svc.on('actuator', onActuator);
    return () => svc.off('actuator', onActuator);
  }, []);

  /** Optimistically update the UI, then tell the backend. Roll back on failure. */
  const send = async (nextLeds, request) => {
    const previous = ledsRef.current;
    dispatch({ type: 'UPDATE', payload: { leds: nextLeds } });
    try {
      const updated = await request();
      if (updated) dispatch({ type: 'UPDATE', payload: updated });
    } catch (err) {
      console.error(err);
      dispatch({ type: 'UPDATE', payload: { leds: previous } });
    }
  };

  const setLed = (index, on) => {
    const next = [...ledsRef.current];
    next[index] = on;
    return send(next, () => svcRef.current.setLed(index, on));
  };

  const toggleLed = (index) => setLed(index, !ledsRef.current[index]);

  const setAll = (on) => {
    const next = [on, on, on];
    return send(next, () => svcRef.current.setAllLeds(next));
  };

  return (
    <ActuatorContext.Provider value={{ actuator: state, setLed, toggleLed, setAll }}>
      {children}
    </ActuatorContext.Provider>
  );
}

export function useActuator() {
  const ctx = useContext(ActuatorContext);
  if (!ctx) throw new Error('useActuator must be used within ActuatorProvider');
  return ctx;
}
