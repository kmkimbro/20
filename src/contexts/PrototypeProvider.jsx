import { useMemo, useEffect } from 'react';
import { PrototypeContext, getPlacedItemComponent } from './PrototypeContext.jsx';

export default function PrototypeProvider({ conceptId = null, children }) {
  const value = useMemo(
    () => ({
      conceptId,
      placedItemComponent: getPlacedItemComponent(conceptId),
    }),
    [conceptId]
  );

  // So CSS can scope prototype-specific rules (e.g. des-combined-3 add-row on hover) without prop drilling.
  useEffect(() => {
    const root = document.documentElement;
    if (conceptId) {
      root.setAttribute('data-concept-id', conceptId);
    } else {
      root.removeAttribute('data-concept-id');
    }
    return () => root.removeAttribute('data-concept-id');
  }, [conceptId]);

  return (
    <PrototypeContext.Provider value={value}>
      {children}
    </PrototypeContext.Provider>
  );
}
