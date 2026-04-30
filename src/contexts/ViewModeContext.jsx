import { createContext, useContext, useState, useCallback } from 'react';

export const ViewModeContext = createContext({
  viewMode: 'normal',
  setViewMode: () => {},
});

export function useViewMode() {
  return useContext(ViewModeContext);
}

const VALID_VIEW_MODES = ['normal', 'wireframe', 'flow'];

export default function ViewModeProvider({ children }) {
  const [viewMode, setViewModeState] = useState('normal');

  const setViewMode = useCallback((mode) => {
    setViewModeState((prev) => {
      const next = typeof mode === 'function' ? mode(prev) : mode;
      return VALID_VIEW_MODES.includes(next) ? next : 'normal';
    });
  }, []);

  const value = { viewMode, setViewMode };

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
}

/** Wrapper that applies data-view-mode for wireframe CSS. Must be inside ViewModeProvider. */
export function ViewModeRoot({ children }) {
  const { viewMode } = useViewMode();
  return (
    <div
      data-view-mode={viewMode}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--gray-100, #F5F5F5)',
      }}
    >
      {children}
    </div>
  );
}
