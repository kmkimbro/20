import { X } from 'lucide-react';
import { GRAPH_NODE_THEME } from './graphNodeTheme';
import { listConnectionRows } from './graphConnectionUtils.js';

function typeSwatch(type) {
  const t = GRAPH_NODE_THEME[type] || GRAPH_NODE_THEME.person;
  return t.accent;
}

/**
 * Slide-over panel listing a node's connections (bidirectional) with relationship labels.
 */
export default function GraphNodeDetailPanel({ graph, entityId, onClose, onOpenDocument }) {
  if (!entityId || !graph?.entities) return null;
  const entity = graph.entities.find((e) => e.id === entityId);
  if (!entity) return null;
  const rows = listConnectionRows(entityId, graph.entities);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10020,
        pointerEvents: 'auto',
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(15, 23, 42, 0.18)',
      }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="presentation"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(380px, 92vw)',
          maxWidth: '100%',
          height: '100%',
          background: '#fff',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          padding: '18px 18px 12px',
          borderBottom: '1px solid #E5E7EB',
        }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#9CA3AF',
              marginBottom: 6,
            }}
            >
              {entity.type}
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827', lineHeight: 1.25 }}>
              {entity.label}
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B7280', lineHeight: 1.45 }}>
              {entity.subtitle}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              border: 'none',
              background: '#F3F4F6',
              borderRadius: 8,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#6B7280',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '14px 18px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#9CA3AF' }}>
          CONNECTIONS
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 12px 20px' }}>
          {entity.type === 'document' && onOpenDocument ? (
            <div style={{ padding: '0 6px 14px' }}>
              <button
                type="button"
                onClick={() => onOpenDocument(entity.label)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#4F6EF7',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Open in editor
              </button>
            </div>
          ) : null}
          {rows.length === 0 ? (
            <p style={{ padding: '0 6px', fontSize: 13, color: '#9CA3AF' }}>No connections.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {rows.map((r) => (
                <li
                  key={r.key}
                  style={{
                    padding: '12px 10px',
                    borderBottom: '1px solid #F3F4F6',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: typeSwatch(r.type),
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>
                      {r.direction}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{r.name}</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#4F6EF7', fontWeight: 500, paddingLeft: 16 }}>{r.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
