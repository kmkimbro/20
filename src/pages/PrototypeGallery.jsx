import { Link } from 'react-router-dom';
import { PROTOTYPES } from '../config/prototypes.js';
import PrototypeSwitcher from '../components/PrototypeSwitcher.jsx';
import WireframeFlowView from '../components/WireframeFlowView.jsx';
import { useViewMode } from '../contexts/ViewModeContext.jsx';

export default function PrototypeGallery() {
  const { viewMode } = useViewMode();

  if (viewMode === 'flow') {
    return (
      <>
        <WireframeFlowView />
        <PrototypeSwitcher />
      </>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Prototype concepts</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Full app with one workflow swapped for a concept. Use the app as normal (place images, resize, move); only the image controls differ.
      </p>
      <Link
        to="/"
        style={{
          display: 'inline-block',
          marginBottom: 24,
          color: '#4F6EF7',
          textDecoration: 'none',
          fontWeight: 500,
        }}
      >
        ← Back to app (production)
      </Link>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {PROTOTYPES.map((p) => (
          <li key={p.id} style={{ marginBottom: 16 }}>
            <Link
              to={p.path}
              style={{
                display: 'block',
                padding: 16,
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                textDecoration: 'none',
                color: 'inherit',
                background: '#fff',
              }}
            >
              <strong style={{ fontSize: 16 }}>{p.title}</strong>
              <p style={{ margin: '8px 0 0', fontSize: 14, color: '#666' }}>{p.description}</p>
            </Link>
          </li>
        ))}
      </ul>
      <PrototypeSwitcher />
    </div>
  );
}
