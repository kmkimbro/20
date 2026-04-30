import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Trash2, Home, FolderPlus, Sparkles } from 'lucide-react';
import { ProjectEntityGraph, WITHIN_PROJECT_GRAPH_SAMPLE_NODES } from '../../components/graph';

export const DOCUMENT_LINK_KINDS = [
  { value: 'references', label: 'References' },
  { value: 'supersedes', label: 'Supersedes' },
  { value: 'verifies', label: 'Verifies' },
  { value: 'derived_from', label: 'Derived from' },
  { value: 'related', label: 'Related' },
];

function docKey(projectId, docId) {
  return `${projectId}::${docId}`;
}

export function kindLabel(kind) {
  return DOCUMENT_LINK_KINDS.find((k) => k.value === kind)?.label || kind;
}

/**
 * Sandbox UI: cross-project document nodes, user-defined directed links, force graph + table.
 */
export default function DocumentConnectionsPanel({
  projects,
  projectDocs,
  documentLinks,
  setDocumentLinks,
  openDocument,
  palette: C,
  /** When the user picks "Link from here" on a document, parent sets this once; panel selects From and clears it. */
  linkSourceDraft,
  onConsumedLinkSource,
  onGoHome,
  onCreateProject,
  onLoadSampleProject,
}) {
  const fgRef = useRef(null);
  const wrapRef = useRef(null);
  const [dims, setDims] = useState({ w: 640, h: 380 });
  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx, setToIdx] = useState(1);
  const [kind, setKind] = useState(DOCUMENT_LINK_KINDS[0].value);
  const [feedback, setFeedback] = useState(null);
  /** Sample within-project entity graph: highlight one node, dim others (same interaction model as a real graph). */
  const [sampleGraphFocusId, setSampleGraphFocusId] = useState(null);

  const docRows = useMemo(() => {
    const rows = [];
    for (const p of projects) {
      const list = projectDocs[p.id] || [];
      for (const d of list) {
        rows.push({
          key: docKey(p.id, d.id),
          projectId: p.id,
          projectName: p.name,
          docId: d.id,
          docName: d.name,
        });
      }
    }
    return rows;
  }, [projects, projectDocs]);

  const keySet = useMemo(() => new Set(docRows.map((r) => r.key)), [docRows]);

  useEffect(() => {
    if (docRows.length === 0) return;
    setFromIdx((i) => Math.min(i, docRows.length - 1));
    setToIdx((i) => Math.min(i, docRows.length - 1));
  }, [docRows.length]);

  useEffect(() => {
    if (!linkSourceDraft) return;
    const i = docRows.findIndex(
      (r) => r.projectId === linkSourceDraft.projectId && r.docId === linkSourceDraft.docId,
    );
    if (i >= 0) {
      setFromIdx(i);
      const j = docRows.findIndex((_, idx) => idx !== i);
      if (j >= 0) setToIdx(j);
    }
    onConsumedLinkSource?.();
  }, [linkSourceDraft, docRows, onConsumedLinkSource]);

  const fromRow = docRows[fromIdx] ?? docRows[0];
  const toRow = docRows[toIdx] ?? docRows[0];
  const fromKey = fromRow?.key ?? '';
  const toKey = toRow?.key ?? '';
  const keysDistinct = Boolean(fromKey && toKey && fromKey !== toKey);

  const graphData = useMemo(() => {
    const nodes = docRows.map((r) => ({
      id: r.key,
      name: r.docName,
      sub: r.projectName,
    }));
    const links = [];
    for (const L of documentLinks) {
      const s = docKey(L.fromProjectId, L.fromDocId);
      const t = docKey(L.toProjectId, L.toDocId);
      if (!keySet.has(s) || !keySet.has(t)) continue;
      links.push({
        id: L.id,
        source: s,
        target: t,
        kind: L.kind,
      });
    }
    return { nodes, links };
  }, [docRows, documentLinks, keySet]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      setDims({
        w: Math.max(280, Math.floor(width)),
        h: Math.max(300, Math.floor(height)),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fgRef.current?.d3ReheatSimulation?.();
    });
  }, [graphData.nodes.length, graphData.links.length]);

  const showFeedback = (msg) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 3200);
  };

  const addLink = () => {
    if (!keysDistinct) return;
    const [fp, fd] = fromKey.split('::');
    const [tp, td] = toKey.split('::');
    const dup = documentLinks.some(
      (L) => L.fromProjectId === fp && L.fromDocId === fd
        && L.toProjectId === tp && L.toDocId === td && L.kind === kind,
    );
    if (dup) {
      showFeedback('That exact link already exists. Change the relationship or pick different files.');
      return;
    }
    setDocumentLinks((prev) => [
      ...prev,
      {
        id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fromProjectId: fp,
        fromDocId: fd,
        toProjectId: tp,
        toDocId: td,
        kind,
      },
    ]);
    showFeedback('Link added. It appears in the graph and the table below.');
  };

  const removeLink = (id) => {
    setDocumentLinks((prev) => prev.filter((L) => L.id !== id));
  };

  const onEngineStop = useCallback(() => {
    fgRef.current?.zoomToFit?.(400, 60);
  }, []);

  const linkColor = useCallback(() => 'rgba(17, 24, 39, 0.38)', []);
  const linkLabel = useCallback((l) => kindLabel(l.kind), []);

  const btnSecondary = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 6,
    border: `1px solid ${C.cardBdr}`,
    background: '#fff',
    fontSize: 13,
    fontWeight: 500,
    color: C.text,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };

  if (docRows.length === 0) {
    return (
      <div style={{ padding: '32px 36px', maxWidth: 560 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>
          Document links
        </h1>
        <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.6, margin: '0 0 22px' }}>
          This screen lists every document in your projects so you can connect them (for example:
          a work instruction <strong style={{ color: C.text }}>references</strong> a drawing).
          Nothing here is sent to a server; it stays in this browser tab&apos;s storage for this prototype only.
        </p>
        <ol style={{ margin: '0 0 24px', paddingLeft: 22, color: C.text, fontSize: 14, lineHeight: 1.7 }}>
          <li style={{ marginBottom: 6 }}>Create a project (sidebar → <strong>New Project</strong>).</li>
          <li style={{ marginBottom: 6 }}>Add at least two documents inside that project.</li>
          <li>Come back here, pick <strong>Start</strong> and <strong>End</strong>, choose a relationship, then <strong>Add link</strong>.</li>
        </ol>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 16px' }}>
          Tip: from any document tile or list row, use <strong>Link to another file…</strong> to jump here with <strong>Start</strong> already filled in.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {onLoadSampleProject ? (
            <button
              type="button"
              onClick={onLoadSampleProject}
              style={{
                ...btnSecondary,
                border: `1px solid rgba(79, 110, 247, 0.35)`,
                background: C.blueLight,
                color: C.blue,
                fontWeight: 600,
              }}
            >
              <Sparkles size={16} aria-hidden />
              Try sample project + links
            </button>
          ) : null}
          <button type="button" onClick={onCreateProject} style={btnSecondary}>
            <FolderPlus size={16} aria-hidden />
            New project
          </button>
          <button type="button" onClick={onGoHome} style={btnSecondary}>
            <Home size={16} aria-hidden />
            Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px 36px', overflow: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>
        Document links
      </h1>
      <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.55, margin: '0 0 8px', maxWidth: 760 }}>
        Each row below is one relationship. The arrow runs from <strong style={{ color: C.text }}>Start</strong> toward{' '}
        <strong style={{ color: C.text }}>End</strong>. Hover a line in the graph to read the relationship. Click a node to open the file.
      </p>
      <p style={{ fontSize: 12, color: C.muted, margin: '0 0 18px' }}>
        Add another link anytime; links can cross projects if you have files in more than one place.
      </p>

      {feedback ? (
        <div
          role="status"
          style={{
            marginBottom: 14,
            padding: '10px 14px',
            borderRadius: 8,
            background: C.blueLight,
            border: `1px solid rgba(79, 110, 247, 0.2)`,
            fontSize: 13,
            color: C.text,
          }}
        >
          {feedback}
        </div>
      ) : null}

      <div style={{
        marginBottom: 8,
        fontSize: 11,
        fontWeight: 700,
        color: C.muted,
        letterSpacing: '0.06em',
      }}
      >
        NEW LINK
      </div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'flex-end',
        marginBottom: 18,
        padding: 16,
        background: C.card,
        border: `1px solid ${C.cardBdr}`,
        borderRadius: 10,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: '1 1 220px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>Start (arrow runs from here)</span>
          <select
            value={String(fromIdx)}
            onChange={(e) => setFromIdx(Number(e.target.value))}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${C.cardBdr}`,
              fontSize: 13,
              color: C.text,
              background: '#fff',
              maxWidth: '100%',
            }}
          >
            {docRows.map((r, i) => (
              <option key={r.key} value={String(i)}>{r.projectName} — {r.docName}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: '0 1 200px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>Relationship</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${C.cardBdr}`,
              fontSize: 13,
              color: C.text,
              background: '#fff',
            }}
          >
            {DOCUMENT_LINK_KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: '1 1 220px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>End (arrow points here)</span>
          <select
            value={String(toIdx)}
            onChange={(e) => setToIdx(Number(e.target.value))}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${C.cardBdr}`,
              fontSize: 13,
              color: C.text,
              background: '#fff',
              maxWidth: '100%',
            }}
          >
            {docRows.map((r, i) => (
              <option key={r.key} value={String(i)}>{r.projectName} — {r.docName}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={addLink}
          disabled={!keysDistinct}
          style={{
            padding: '11px 20px',
            borderRadius: 8,
            border: 'none',
            background: !keysDistinct ? C.muted : C.blue,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: !keysDistinct ? 'not-allowed' : 'pointer',
            height: 42,
            whiteSpace: 'nowrap',
            fontFamily: 'inherit',
            flex: '0 0 auto',
          }}
        >
          Add link
        </button>
      </div>
      {!keysDistinct && docRows.length >= 2 ? (
        <p style={{ fontSize: 12, color: C.muted, margin: '-8px 0 16px' }}>
          Pick two different files for Start and End.
        </p>
      ) : null}
      {docRows.length === 1 ? (
        <p style={{ fontSize: 12, color: C.muted, margin: '-8px 0 16px' }}>
          Add a second document in a project to create a link between files.
        </p>
      ) : null}

      <div style={{ marginBottom: 10 }}>
        <div
          ref={wrapRef}
          style={{
            width: '100%',
            height: dims.h,
            minHeight: 300,
            borderRadius: 10,
            border: `1px solid ${C.cardBdr}`,
            overflow: 'hidden',
            background: '#FAFBFC',
          }}
        >
          <ForceGraph2D
            ref={fgRef}
            width={dims.w}
            height={dims.h}
            graphData={graphData}
            nodeId="id"
            linkSource="source"
            linkTarget="target"
            nodeLabel={(n) => `${n.name}\n${n.sub}`}
            nodeColor={() => C.blue}
            linkColor={linkColor}
            linkLabel={linkLabel}
            linkDirectionalArrowLength={5}
            linkDirectionalArrowRelPos={1}
            linkWidth={1.35}
            onNodeClick={(n) => openDocument(n.name)}
            onEngineStop={onEngineStop}
            cooldownTicks={120}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.35}
          />
        </div>
      </div>

      <div style={{ marginTop: 22, marginBottom: 8 }}>
        <p style={{ fontSize: 12, color: C.sub, margin: '0 0 10px', lineHeight: 1.45, maxWidth: 720 }}>
          <strong style={{ color: C.text }}>Within-project entity graph</strong> — compact node cards for documents, tools, operations, people, and CAD (sample data).
          Click a card to highlight it and dim the rest; same components are used for future cross-project graphs.
        </p>
        <ProjectEntityGraph
          projectId={docRows[0]?.projectId ?? 'preview'}
          projectLabel={docRows[0]?.projectName ?? 'Canvas preview'}
          nodes={WITHIN_PROJECT_GRAPH_SAMPLE_NODES}
          highlightedIds={sampleGraphFocusId ? [sampleGraphFocusId] : []}
          dimmedIds={
            sampleGraphFocusId
              ? WITHIN_PROJECT_GRAPH_SAMPLE_NODES.map((n) => n.id).filter((id) => id !== sampleGraphFocusId)
              : undefined
          }
          onNodeClick={(entity) => {
            setSampleGraphFocusId((prev) => (prev === entity.id ? null : entity.id));
          }}
        />
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', marginBottom: 8 }}>
        ALL LINKS ({documentLinks.length})
      </div>
      <div style={{ border: `1px solid ${C.cardBdr}`, borderRadius: 10, overflow: 'hidden', background: C.card }}>
        {documentLinks.length === 0 ? (
          <div style={{ padding: 18, color: C.sub, fontSize: 13, lineHeight: 1.5 }}>
            No links yet. Use <strong style={{ color: C.text }}>New link</strong> above: choose which file the relationship starts from,
            what kind it is, and which file it points to, then press <strong style={{ color: C.text }}>Add link</strong>.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                <th style={{ textAlign: 'left', padding: '11px 16px', color: C.muted, fontWeight: 600, fontSize: 11 }}>START</th>
                <th style={{ textAlign: 'left', padding: '11px 16px', color: C.muted, fontWeight: 600, fontSize: 11 }}>RELATIONSHIP</th>
                <th style={{ textAlign: 'left', padding: '11px 16px', color: C.muted, fontWeight: 600, fontSize: 11 }}>END</th>
                <th style={{ width: 52 }} aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {documentLinks.map((L) => {
                const fRow = docRows.find((r) => r.projectId === L.fromProjectId && r.docId === L.fromDocId);
                const tRow = docRows.find((r) => r.projectId === L.toProjectId && r.docId === L.toDocId);
                const fromLabel = fRow ? `${fRow.projectName} — ${fRow.docName}` : '(removed file)';
                const toLabel = tRow ? `${tRow.projectName} — ${tRow.docName}` : '(removed file)';
                return (
                  <tr key={L.id} style={{ borderTop: `1px solid ${C.cardBdr}` }}>
                    <td style={{ padding: '11px 16px', color: C.text }}>{fromLabel}</td>
                    <td style={{ padding: '11px 16px', color: C.blue, fontWeight: 600 }}>{kindLabel(L.kind)}</td>
                    <td style={{ padding: '11px 16px', color: C.text }}>{toLabel}</td>
                    <td style={{ padding: '6px 10px' }}>
                      <button
                        type="button"
                        title="Remove link"
                        onClick={() => removeLink(L.id)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          padding: 6,
                          borderRadius: 6,
                          color: C.muted,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
