import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import {
  DOC_TYPE_ORDER,
  DOC_TYPE_META,
  STATUS_META,
  docTypeLabel,
  statusLabel,
} from '../../data/partsDocTaxonomy.js';

function findNode(root, id) {
  if (!root || root.id === id) return root || null;
  for (const c of root.children || []) {
    const f = findNode(c, id);
    if (f) return f;
  }
  return null;
}

function collectSubtreeIds(n, set) {
  if (!n) return;
  set.add(n.id);
  for (const c of n.children || []) collectSubtreeIds(c, set);
}

function collectDocumentsInSubtree(n, out) {
  if (!n) return;
  if (n.type === 'document' && n.docName) {
    const docType = n.docType || 'other';
    const syncStatus = n.syncStatus || 'in_sync';
    out.push({
      id: n.id,
      label: n.label,
      docName: n.docName,
      hint: n.hint,
      docType,
      syncStatus,
      typeLabel: docTypeLabel(docType),
      statusLabel: statusLabel(syncStatus),
    });
  }
  for (const c of n.children || []) collectDocumentsInSubtree(c, out);
}

function buildGraphData(root) {
  const nodes = [];
  const links = [];
  function walk(n, parentId) {
    const isDoc = n.type === 'document';
    const docType = isDoc ? (n.docType || 'other') : null;
    const syncKey = n.syncStatus || null;
    nodes.push({
      id: n.id,
      name: n.label,
      type: isDoc ? 'document' : 'assembly',
      docName: n.docName || null,
      docType,
      syncStatus: syncKey,
      typeLabel: isDoc ? docTypeLabel(docType) : null,
      statusLabel: syncKey ? statusLabel(syncKey) : null,
    });
    if (parentId != null) links.push({ source: parentId, target: n.id });
    for (const c of n.children || []) walk(c, n.id);
  }
  if (root) walk(root, null);
  return { nodes, links };
}

function linkEndpointId(endpoint) {
  if (endpoint == null) return null;
  return typeof endpoint === 'object' ? endpoint.id : endpoint;
}

function truncate(str, max) {
  if (!str) return '';
  return str.length <= max ? str : `${str.slice(0, max - 1)}…`;
}

function groupDocsByType(docs) {
  const map = new Map(DOC_TYPE_ORDER.map((k) => [k, []]));
  for (const d of docs) {
    const k = map.has(d.docType) ? d.docType : 'other';
    map.get(k).push(d);
  }
  return DOC_TYPE_ORDER.filter((k) => map.get(k).length > 0).map((k) => ({
    key: k,
    items: map.get(k),
    meta: DOC_TYPE_META[k],
  }));
}

function fillRoundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
    return;
  }
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fill();
}

function strokeRoundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.stroke();
    return;
  }
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.stroke();
}

/**
 * Force-directed network: document nodes show file name + type + sync status;
 * list below groups by document type.
 */
export default function PartsNetworkGraph({ tree: treeRoot, onOpenDocument }) {
  const fgRef = useRef();
  const wrapRef = useRef(null);
  const [dims, setDims] = useState({ w: 640, h: 420 });
  const [focusId, setFocusId] = useState(null);

  const graphData = useMemo(() => buildGraphData(treeRoot), [treeRoot]);

  useEffect(() => {
    setFocusId(null);
    queueMicrotask(() => {
      fgRef.current?.d3ReheatSimulation?.();
    });
  }, [treeRoot?.id]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      setDims({
        w: Math.max(320, Math.floor(width)),
        h: Math.max(360, Math.floor(height)),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const subtreeIds = useMemo(() => {
    if (!focusId || !treeRoot) return null;
    const n = findNode(treeRoot, focusId);
    if (!n) return null;
    const s = new Set();
    collectSubtreeIds(n, s);
    return s;
  }, [focusId, treeRoot]);

  const linkedDocs = useMemo(() => {
    if (!focusId || !treeRoot) return [];
    const n = findNode(treeRoot, focusId);
    if (!n) return [];
    const out = [];
    collectDocumentsInSubtree(n, out);
    return out;
  }, [focusId, treeRoot]);

  const groupedDocs = useMemo(() => groupDocsByType(linkedDocs), [linkedDocs]);

  const nodeColor = useCallback((n) => {
    const typeColor = n.type === 'document'
      ? (DOC_TYPE_META[n.docType]?.color || DOC_TYPE_META.other.color)
      : '#94a3b8';
    if (!subtreeIds) return n.type === 'document' ? typeColor : '#94a3b8';
    if (!subtreeIds.has(n.id)) {
      return n.type === 'document' ? 'rgba(100, 116, 139, 0.32)' : 'rgba(148, 163, 184, 0.28)';
    }
    if (n.id === focusId) return '#0f172a';
    return n.type === 'document' ? typeColor : '#475569';
  }, [subtreeIds, focusId]);

  const linkColor = useCallback((link) => {
    const s = linkEndpointId(link.source);
    const t = linkEndpointId(link.target);
    if (!subtreeIds) return 'rgba(15, 23, 42, 0.1)';
    if (subtreeIds.has(s) && subtreeIds.has(t)) return 'rgba(15, 23, 42, 0.22)';
    return 'rgba(15, 23, 42, 0.04)';
  }, [subtreeIds]);

  const linkWidth = useCallback((link) => {
    const s = linkEndpointId(link.source);
    const t = linkEndpointId(link.target);
    if (!subtreeIds) return 1;
    if (subtreeIds.has(s) && subtreeIds.has(t)) return 1.4;
    return 0.6;
  }, [subtreeIds]);

  const nodeLabel = useCallback((n) => {
    if (n.type === 'document') {
      return [
        n.docName || n.name,
        n.typeLabel,
        n.statusLabel,
      ].filter(Boolean).join(' · ');
    }
    return [n.name, n.statusLabel].filter(Boolean).join(' · ');
  }, []);

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const inv = 1 / Math.max(globalScale, 0.35);
    const line = 12 * inv;
    const pad = 4 * inv;
    let y = node.y + 14 * inv;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (node.type === 'document') {
      ctx.font = `600 ${11 * inv}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = subtreeIds && !subtreeIds.has(node.id) ? 'rgba(15,23,42,0.35)' : '#0f172a';
      const docLine = truncate(node.docName || node.name, 26);
      ctx.fillText(docLine, node.x, y);
      y += line + pad;

      if (node.typeLabel) {
        const tm = DOC_TYPE_META[node.docType] || DOC_TYPE_META.other;
        ctx.font = `${9 * inv}px Inter, system-ui, sans-serif`;
        const tw = ctx.measureText(node.typeLabel).width + 10 * inv;
        const th = 14 * inv;
        ctx.fillStyle = tm.pillBg;
        ctx.strokeStyle = tm.pillBorder;
        ctx.lineWidth = 1 * inv;
        fillRoundRect(ctx, node.x - tw / 2, y, tw, th, 4 * inv);
        strokeRoundRect(ctx, node.x - tw / 2, y, tw, th, 4 * inv);
        ctx.fillStyle = tm.color;
        ctx.textBaseline = 'middle';
        ctx.fillText(node.typeLabel, node.x, y + th / 2);
        ctx.textBaseline = 'top';
        y += th + pad;
      }

      if (node.statusLabel && node.syncStatus) {
        const sm = STATUS_META[node.syncStatus] || STATUS_META.in_sync;
        ctx.font = `600 ${8.5 * inv}px Inter, system-ui, sans-serif`;
        const sw = ctx.measureText(node.statusLabel).width + 10 * inv;
        const sh = 13 * inv;
        ctx.fillStyle = sm.bg;
        ctx.strokeStyle = sm.border;
        ctx.lineWidth = 1 * inv;
        fillRoundRect(ctx, node.x - sw / 2, y, sw, sh, 3.5 * inv);
        strokeRoundRect(ctx, node.x - sw / 2, y, sw, sh, 3.5 * inv);
        ctx.fillStyle = sm.fg;
        ctx.textBaseline = 'middle';
        ctx.fillText(node.statusLabel, node.x, y + sh / 2);
      }
    } else {
      ctx.font = `500 ${10 * inv}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = subtreeIds && !subtreeIds.has(node.id) ? 'rgba(71,85,105,0.45)' : '#334155';
      ctx.fillText(truncate(node.name, 22), node.x, y);
      y += line + pad * 0.5;
      if (node.statusLabel && node.syncStatus) {
        const sm = STATUS_META[node.syncStatus] || STATUS_META.in_sync;
        ctx.font = `600 ${8.5 * inv}px Inter, system-ui, sans-serif`;
        const sw = ctx.measureText(node.statusLabel).width + 10 * inv;
        const sh = 13 * inv;
        ctx.fillStyle = sm.bg;
        ctx.strokeStyle = sm.border;
        ctx.lineWidth = 1 * inv;
        fillRoundRect(ctx, node.x - sw / 2, y, sw, sh, 3.5 * inv);
        strokeRoundRect(ctx, node.x - sw / 2, y, sw, sh, 3.5 * inv);
        ctx.fillStyle = sm.fg;
        ctx.textBaseline = 'middle';
        ctx.fillText(node.statusLabel, node.x, y + sh / 2);
      }
    }
  }, [subtreeIds]);

  const onNodeClick = useCallback((node) => {
    if (node.type === 'document' && node.docName) {
      onOpenDocument(node.docName);
      return;
    }
    setFocusId((prev) => (prev === node.id ? null : node.id));
  }, [onOpenDocument]);

  const onBackgroundClick = useCallback(() => {
    setFocusId(null);
  }, []);

  const onEngineStop = useCallback(() => {
    fgRef.current?.zoomToFit(400, 80);
  }, []);

  if (!treeRoot || graphData.nodes.length === 0) {
    return <div style={{ color: '#64748b', fontSize: 14 }}>No assembly data.</div>;
  }

  return (
    <div>
      <p style={{
        fontSize: 13,
        color: '#64748b',
        margin: '0 0 10px',
        lineHeight: 1.5,
      }}
      >
        Nodes show <strong style={{ color: '#334155' }}>file name</strong>,{' '}
        <strong style={{ color: '#334155' }}>type</strong>, and{' '}
        <strong style={{ color: '#334155' }}>sync status</strong>. Click an assembly to focus; click a document to open.
      </p>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px 16px',
        marginBottom: 12,
        fontSize: 11,
        color: '#64748b',
      }}
      >
        <span style={{ fontWeight: 700, letterSpacing: '0.04em', color: '#94a3b8' }}>DOCUMENT TYPES</span>
        {DOC_TYPE_ORDER.filter((k) => k !== 'other').map((k) => {
          const m = DOC_TYPE_META[k];
          return (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: m.color,
                flexShrink: 0,
              }}
              />
              {m.label}
            </span>
          );
        })}
      </div>

      <div
        ref={wrapRef}
        style={{
          height: 480,
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <ForceGraph2D
          ref={fgRef}
          width={dims.w}
          height={dims.h}
          graphData={graphData}
          nodeId="id"
          backgroundColor="#ffffff"
          nodeLabel={nodeLabel}
          nodeVal={(n) => (n.type === 'document' ? 5 : 6)}
          nodeRelSize={4}
          nodeColor={nodeColor}
          linkColor={linkColor}
          linkWidth={linkWidth}
          onNodeClick={onNodeClick}
          onBackgroundClick={onBackgroundClick}
          onEngineStop={onEngineStop}
          cooldownTicks={120}
          warmupTicks={80}
          d3VelocityDecay={0.35}
          nodeCanvasObjectMode={() => 'after'}
          nodeCanvasObject={nodeCanvasObject}
        />
      </div>

      {focusId && groupedDocs.length > 0 ? (
        <div style={{
          marginTop: 16,
          padding: '14px 16px',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          background: '#f8fafc',
        }}
        >
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: '#64748b',
            textTransform: 'uppercase',
            marginBottom: 14,
          }}
          >
            Documents in this branch — by type
          </div>
          {groupedDocs.map(({ key, items, meta }) => (
            <div key={key} style={{ marginBottom: 18 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
              >
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: meta.color,
                }}
                />
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#334155',
                  letterSpacing: '0.02em',
                }}
                >
                  {meta.label}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>({items.length})</span>
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'none' }}>
                {items.map((d) => {
                  const sm = STATUS_META[d.syncStatus] || STATUS_META.in_sync;
                  return (
                    <li key={d.id} style={{ marginBottom: 10 }}>
                      <button
                        type="button"
                        onClick={() => onOpenDocument(d.docName)}
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#4F6EF7',
                          textAlign: 'left',
                          padding: 0,
                          textDecoration: 'underline',
                          textUnderlineOffset: 3,
                          display: 'block',
                        }}
                      >
                        {d.docName}
                      </button>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{d.label}</div>
                      <span style={{
                        display: 'inline-block',
                        marginTop: 6,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: sm.fg,
                        background: sm.bg,
                        border: `1px solid ${sm.border}`,
                        padding: '3px 8px',
                        borderRadius: 5,
                      }}
                      >
                        {d.statusLabel}
                      </span>
                      {d.hint ? (
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{d.hint}</div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {focusId && linkedDocs.length === 0 ? (
        <div style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>
          No document leaves under this node.
        </div>
      ) : null}
    </div>
  );
}
