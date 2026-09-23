import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { activePrototypeForPathname } from '../config/prototypes.js';

/** Keeps the browser tab title in sync with the active prototype (not a single deploy label). */
export default function PrototypeDocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const active = activePrototypeForPathname(pathname);
    document.title = active ? `${active.title} · Q20 Prototypes` : 'Q20 Prototypes';
  }, [pathname]);

  return null;
}
