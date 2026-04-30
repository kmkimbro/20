import { useParams } from 'react-router-dom';
import PrototypeProvider from './contexts/PrototypeProvider.jsx';
import App from './App.jsx';

/**
 * Wraps the full app with PrototypeProvider using the route's conceptId.
 * Same app, same workflow; only the swappable component (e.g. PlacedItem) is the concept variant.
 */
export default function PrototypeWrapper() {
  const { conceptId } = useParams();
  return (
    <PrototypeProvider conceptId={conceptId}>
      <App />
    </PrototypeProvider>
  );
}
