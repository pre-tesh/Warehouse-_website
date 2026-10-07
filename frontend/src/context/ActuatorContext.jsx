/**
 * ActuatorContext.jsx
 * Provides actuator state and control functions throughout the app.
 */
import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { getDataService } from '../data/mockDataService';

const ActuatorContext = createContext(null);

const initialState = {
  light_on:   false,
  brightness: 0,
  mode:       'auto',
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

  useEffect(() => {
    const svc = getDataService();
    svcRef.current = svc;
    svc.on('actuator', p => dispatch({ type: 'UPDATE', payload: p }));
  }, []);

  const setManual = async (patch) => {
    const updated = await svcRef.current?.sendActuatorCommand({ mode: 'manual', ...patch });
    if (updated) dispatch({ type: 'UPDATE', payload: updated });
  };

  const setAutoMode = async () => {
    const updated = await svcRef.current?.sendActuatorCommand({ mode: 'auto' });
    if (updated) dispatch({ type: 'UPDATE', payload: updated });
  };

  return (
    <ActuatorContext.Provider value={{ actuator: state, setManual, setAutoMode }}>
      {children}
    </ActuatorContext.Provider>
  );
}

export function useActuator() {
  const ctx = useContext(ActuatorContext);
  if (!ctx) throw new Error('useActuator must be used within ActuatorProvider');
  return ctx;
}
