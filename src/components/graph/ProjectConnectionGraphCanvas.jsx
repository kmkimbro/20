import {
  useRef,
  useState,
  useLayoutEffect,
  useMemo,
  useCallback,
} from 'react';
import GraphNode from './GraphNode.jsx';
import GraphPrdDocumentNode from './GraphPrdDocumentNode.jsx';
import GraphNodeDetailPanel from './GraphNodeDetailPanel.jsx';
import { GRAPH_NODE_THEME } from './graphNodeTheme';
import {
  MOCK_WELD_FRAME_CANVAS,
  MOCK_WELD_FRAME_ZONES,
  MOCK_WELD_FRAME_NODE_POSITIONS,
  MOCK_WELD_FRAME_LEGEND,
  GRAPH_PAGE_MARGIN,
} from './mockWeldFrameLayout.js';
import { buildNeighborIds, entityByIdMap } from './graphConnectionUtils.js';

const GRAPH_DIMMED_OPACITY = 0.3;

function centerRelativeToContainer(el, container) {
  if (!el || !container) return { x: 0, y: 0 };
  const er = el.getBoundingClientRect();
  const cr = container.getBoundingClientRect();
  return {
    x: er.left - cr.left + er.width / 2,
    y: er.top - cr.top + er.height / 2,
  };
}

function curvedPath(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ox = (-dy / len) * 28;
  const oy = (dx / len) * 28;
  return `M ${x1} ${y1} Q ${mx + ox} ${my + oy} ${x2} ${y2}`;
}

/**
 * Interactive within-project graph: zoned canvas, hover dim + dashed curved edges, click → detail panel.
 */
export default function ProjectConnectionGraphCanvas({
  graph,
  projectId,
  onOpenDocument,
  onCadFileClick,
}) {
  const canvasRef = useRef(null);
  const nodeRefs = useRef({});
  const setNodeRef = useCallback((id, el) => {
    if (el) nodeRefs.current[id] = el;
    else delete nodeRefs.current[id];
  }, []);

  const [hoverId, setHoverId] = useState(null);
  const [detailEntityId, setDetailEntityId] = useState(null);
  const [edgePaths, setEdgePaths] = useState([]);
  const [resizeTick, setResizeTick] = useState(0);
  const innerRef = useRef(null);

  const graphEntities = useMemo(
    () => (Array.isArray(graph?.entities) ? graph.entities : []),
    [graph?.entities],
  );
  const cadFileLabel = graph?.cadFile ?? '';

  const byId = useMemo(() => entityByIdMap(graphEntities), [graphEntities]);
  const neighborIds = useMemo(
    () => (hoverId ? buildNeighborIds(hoverId, graphEntities) : new Set()),
    [hoverId, graphEntities],
  );

  const docPrdById = useMemo(() => {
    const map = {};
    const cad = cadFileLabel;
    for (const e of graphEntities) {
      if (e.type !== 'document') continue;
      const stepLinks = (e.connects || []).filter((c) => c.to.startsWith('op')).length;
      map[e.id] = {
        stateLabel: 'In sync',
        lastUpdated: 'Today',
        accentKey: 'in_sync',
        operationCount: Math.max(1, stepLinks || 1),
        cadFileLabel: e.id === 'maint03' ? 'No CAD file linked' : cad,
      };
    }
    return map;
  }, [graphEntities, cadFileLabel]);

  useLayoutEffect(() => {
    const container = innerRef.current;
    if (!container || !hoverId) {
      setEdgePaths([]);
      return;
    }
    const fromEl = nodeRefs.current[hoverId];
    if (!fromEl) {
      setEdgePaths([]);
      return;
    }
    const fr = centerRelativeToContainer(fromEl, container);
    const paths = [];
    for (const tid of neighborIds) {
      if (tid === hoverId) continue;
      const toEl = nodeRefs.current[tid];
      if (!toEl) continue;
      const tr = centerRelativeToContainer(toEl, container);
      const target = byId.get(tid);
      const stroke = target ? GRAPH_NODE_THEME[target.type]?.accent ?? '#64748b' : '#64748b';
      paths.push({
        key: `${hoverId}-${tid}`,
        d: curvedPath(fr.x, fr.y, tr.x, tr.y),
        stroke,
      });
    }
    setEdgePaths(paths);
  }, [hoverId, neighborIds, byId, graphEntities, graphEntities.length, resizeTick]);

  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setResizeTick((t) => t + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onCanvasMouseLeave = useCallback((e) => {
    const next = e.relatedTarget;
    if (next && canvasRef.current?.contains(next)) return;
    setHoverId(null);
  }, []);

  const handleNodeClick = useCallback((entity) => {
    setDetailEntityId(entity.id);
  }, []);

  return (
    <>
      <div
        ref={canvasRef}
        onMouseLeave={onCanvasMouseLeave}
        style={{
          position: 'relative',
          width: '100%',
          minWidth: Math.min(MOCK_WELD_FRAME_CANVAS.width + GRAPH_PAGE_MARGIN * 2, '100%'),
          maxWidth: '100%',
          overflow: 'auto',
          background: '#FAFBFC',
          borderRadius: 10,
          border: '1px solid #E5E7EB',
          boxSizing: 'border-box',
          padding: GRAPH_PAGE_MARGIN,
        }}
      >
        <div
          style={{
            padding: `0 0 16px`,
            marginBottom: 0,
            borderBottom: '1px solid #E5E7EB',
            background: '#FFFFFF',
          }}
        >
          <p
            style={{
              margin: '0 0 12px',
              fontSize: 13,
              fontWeight: 500,
              color: '#64748B',
            }}
          >
            Hover any node to see connections.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px 22px',
              alignItems: 'center',
            }}
          >
            {MOCK_WELD_FRAME_LEGEND.map((item) => (
              <span
                key={item.key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#475569',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    border: `2px solid ${item.color}`,
                    flexShrink: 0,
                  }}
                />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div
          ref={innerRef}
          style={{
            position: 'relative',
            width: MOCK_WELD_FRAME_CANVAS.width,
            minHeight: MOCK_WELD_FRAME_CANVAS.height,
            height: MOCK_WELD_FRAME_CANVAS.height,
            margin: '0 auto',
          }}
        >
          {MOCK_WELD_FRAME_ZONES.map((z) => (
            <div
              key={z.id}
              style={{
                position: 'absolute',
                left: z.left,
                top: z.top,
                width: z.width,
                height: z.height,
                borderRadius: 10,
                border: `1px dashed ${z.accent}`,
                background: z.tint,
                pointerEvents: 'none',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 12,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: z.accent,
                  opacity: 0.85,
                }}
              >
                {z.label}
              </span>
            </div>
          ))}

          <svg
            width={MOCK_WELD_FRAME_CANVAS.width}
            height={MOCK_WELD_FRAME_CANVAS.height}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              zIndex: 2,
              pointerEvents: 'none',
            }}
            aria-hidden
          >
            {edgePaths.map((p) => (
              <path
                key={p.key}
                d={p.d}
                fill="none"
                stroke={p.stroke}
                strokeWidth={1.5}
                strokeDasharray="7 6"
                strokeLinecap="round"
                opacity={0.92}
              />
            ))}
          </svg>

          {graphEntities.map((entity) => {
            const pos = MOCK_WELD_FRAME_NODE_POSITIONS[entity.id];
            if (!pos) return null;
            const dimmed = Boolean(hoverId && !neighborIds.has(entity.id));
            const highlighted = hoverId === entity.id;
            const connectedHighlight = Boolean(
              hoverId && neighborIds.has(entity.id) && entity.id !== hoverId,
            );

            return (
              <div
                key={entity.id}
                ref={(el) => setNodeRef(entity.id, el)}
                style={{
                  position: 'absolute',
                  left: pos.left,
                  top: pos.top,
                  zIndex: 3,
                }}
                onMouseEnter={() => setHoverId(entity.id)}
              >
                {entity.type === 'document' ? (
                  <GraphPrdDocumentNode
                    entity={entity}
                    prd={docPrdById[entity.id]}
                    dimmed={dimmed}
                    dimmedOpacity={GRAPH_DIMMED_OPACITY}
                    highlighted={highlighted}
                    connectedHighlight={connectedHighlight}
                    docId={entity.id}
                    projectId={projectId}
                    onRenameDocument={() => {}}
                    onCadFileLabelClick={onCadFileClick}
                    onClick={() => handleNodeClick(entity)}
                    onMouseEnter={() => setHoverId(entity.id)}
                    onMouseLeave={() => {}}
                  />
                ) : (
                  <GraphNode
                    entity={entity}
                    dimmed={dimmed}
                    dimmedOpacity={GRAPH_DIMMED_OPACITY}
                    highlighted={highlighted}
                    connectedHighlight={connectedHighlight}
                    onClick={() => handleNodeClick(entity)}
                    onMouseEnter={() => setHoverId(entity.id)}
                    onMouseLeave={() => {}}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {detailEntityId ? (
        <GraphNodeDetailPanel
          graph={graph}
          entityId={detailEntityId}
          onClose={() => setDetailEntityId(null)}
          onOpenDocument={onOpenDocument}
        />
      ) : null}
    </>
  );
}
