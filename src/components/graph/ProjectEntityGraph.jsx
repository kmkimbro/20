import { useMemo } from 'react';
import GraphNode from './GraphNode.jsx';

function toIdSet(value) {
  if (value == null) return new Set();
  if (value instanceof Set) return value;
  if (Array.isArray(value)) return new Set(value);
  return new Set();
}

/**
 * Within-project connection graph: lays out {@link GraphNode} cards on a canvas-style surface.
 * `projectId` is required for future cross-project views (stable container key); same `GraphNode` API everywhere.
 */
export default function ProjectEntityGraph({
  projectId,
  projectLabel,
  nodes,
  highlightedIds,
  dimmedIds,
  onNodeClick,
  onNodeMouseEnter,
  onNodeMouseLeave,
  /** Optional chrome */
  showHeader = true,
  emptyMessage = 'No entities to show in this graph yet.',
}) {
  const hi = useMemo(() => toIdSet(highlightedIds), [highlightedIds]);
  const di = useMemo(() => toIdSet(dimmedIds), [dimmedIds]);

  return (
    <section
      data-project-id={projectId}
      aria-label={projectLabel ? `${projectLabel} — entity graph` : 'Project entity graph'}
      style={{
        borderRadius: 10,
        border: '1px solid #E5E7EB',
        background: '#F9FAFB',
        padding: 16,
        minHeight: 120,
      }}
    >
      {showHeader ? (
        <div style={{ marginBottom: 14 }}>
          <h3 style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: '#374151',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
          >
            Within project
          </h3>
          {projectLabel ? (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B7280' }}>
              {projectLabel}
              <span style={{ color: '#9CA3AF' }}>{' · '}{nodes.length} node{nodes.length === 1 ? '' : 's'}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {nodes.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>{emptyMessage}</p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            alignItems: 'flex-start',
            alignContent: 'flex-start',
          }}
        >
          {nodes.map((entity) => (
            <GraphNode
              key={entity.id}
              entity={entity}
              highlighted={hi.has(entity.id)}
              dimmed={di.has(entity.id)}
              onClick={onNodeClick ? (e) => onNodeClick(entity, e) : undefined}
              onMouseEnter={onNodeMouseEnter ? (e) => onNodeMouseEnter(entity, e) : undefined}
              onMouseLeave={onNodeMouseLeave ? (e) => onNodeMouseLeave(entity, e) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
