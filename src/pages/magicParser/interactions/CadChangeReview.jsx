import { useEffect, useRef, useState } from 'react';
import { Check, RefreshCw, Tag } from 'lucide-react';
import CadView from '../../../components/CadView.jsx';
import Toolbar from '../../../components/Toolbar.jsx';
import InteractionFrame from './InteractionFrame.jsx';

const TABLE_ROWS = [
  { id: 'm6', name: 'M6×20 SHCS', qty: '4' },
  { id: 'frame', name: 'Weldment frame', qty: '1' },
  { id: 'dowel', name: 'Dowel pin P-204', qty: '2', changeId: 'dowel' },
];

const CAD_OPS = [
  {
    id: 's1',
    label: 'Place the frame',
    parts: [{ name: 'Weldment frame' }, { name: 'Datum pads' }],
  },
  {
    id: 's2',
    label: 'Fasten hole A',
    changeId: 'hole-a',
    revision: 'modified',
    revisionLabel: 'Moved 4 mm',
    parts: [{ name: 'M6×20 SHCS' }, { name: 'Hole A' }],
  },
  {
    id: 's3',
    label: 'Torque the M6',
    changeId: 'torque',
    revision: 'modified',
    revisionLabel: '8 → 12 N·m',
    parts: [{ name: 'M6 fastener' }],
  },
  {
    id: 's4',
    label: 'Press dowel pin',
    changeId: 'dowel',
    revision: 'removed',
    revisionLabel: 'Removed',
    parts: [{ name: 'Dowel pin P-204' }],
  },
  {
    id: 's5',
    label: 'Check the frame',
    parts: [{ name: 'Traveler' }],
  },
];

export default function CadChangeReview({ document: doc, onBack }) {
  const [focus, setFocus] = useState(null);
  const [nav, setNav] = useState('doc');
  const [annotationsOn, setAnnotationsOn] = useState(true);
  const [acknowledged, setAcknowledged] = useState(() => new Set());
  const [decisions, setDecisions] = useState({});
  const [prompt, setPrompt] = useState(true);
  const [manual, setManual] = useState(false);
  const yesRef = useRef(null);

  const settle = (id, choice = 'ack') => {
    if (!id) return;
    setAcknowledged((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setDecisions((prev) => ({ ...prev, [id]: choice }));
  };

  const open = (id) => !acknowledged.has(id);
  const flagged = (id) => manual && open(id);
  const dim = (id) => Boolean(focus) && focus !== id;

  useEffect(() => {
    if (!prompt) return undefined;
    yesRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setPrompt(false);
        setManual(false);
      }
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [prompt]);

  const updateScreenshots = (accept) => {
    if (accept) settle('hole-a', 'updated');
    setPrompt(false);
    setManual(false);
  };

  const reviewManually = () => {
    setPrompt(false);
    setManual(true);
  };
  const shotUpdated = decisions['hole-a'] === 'updated';
  const cadOps = CAD_OPS
    .filter((op) => !(op.revision === 'removed' && acknowledged.has(op.changeId)))
    .map((op) => (
      acknowledged.has(op.changeId)
        ? { ...op, revision: undefined, revisionLabel: undefined }
        : op
    ));
  const tableRows = TABLE_ROWS.filter((row) => open(row.changeId) || !row.changeId);

  return (
    <>
    <InteractionFrame
      doc={doc}
      onBack={onBack}
      showCadNav
      navActive={nav}
      onNavChange={setNav}
      stageHeader={(
        <Toolbar
          annotationsVisible={annotationsOn}
          onToggleAnnotations={setAnnotationsOn}
        />
      )}
      cad={(
        <CadView
          docTitle={doc?.name || 'WI-014 — Frame weldment'}
          operations={cadOps}
          revisionFocus={focus}
          onOperationSelect={(op) => setFocus(op.changeId || null)}
          onAcknowledgeRevision={(op) => settle(op.changeId)}
        />
      )}
    >
      <article className="ai-page">
        <div className="page-header">
          <h1 className="page-title">Frame weldment</h1>
          <span className="page-date">Rev C · Feb 10, 2020</span>
        </div>

        <section className="ai-object">
          <div className="ai-figure">
            <div className={`ai-shot${flagged('hole-a') ? ' is-change' : ''}${dim('hole-a') ? ' is-dim' : ''}`}>
              {!shotUpdated ? <span className="ai-callout is-before" style={{ left: '34%', top: '42%' }} /> : null}
              {shotUpdated ? <span className="ai-callout is-after" style={{ left: '58%', top: '36%' }} /> : null}
              {flagged('hole-a') ? (
                <span className="ai-icon-actions">
                  <button type="button" className="ai-icon-btn" aria-label="Update screenshot" onClick={() => settle('hole-a', 'updated')}>
                    <RefreshCw size={14} />
                    <span className="ai-tip" role="tooltip">CAD changed. Update this screenshot?</span>
                  </button>
                  <button type="button" className="ai-icon-btn" aria-label="Keep current screenshot" onClick={() => settle('hole-a', 'kept')}>
                    <Check size={14} />
                    <span className="ai-tip" role="tooltip">Keep the current screenshot.</span>
                  </button>
                </span>
              ) : null}
              {!annotationsOn && flagged('torque') ? (
                <button type="button" className={`ai-icon-btn ai-shot-flag${dim('torque') ? ' is-dim' : ''}`} aria-label="Show the changed annotation" onClick={() => setAnnotationsOn(true)}>
                  <Tag size={14} />
                  <span className="ai-tip" role="tooltip">An annotation on this drawing changed.</span>
                </button>
              ) : null}
            </div>
            {annotationsOn ? (
              <div className="ai-balloons" aria-label="Annotations">
                <div className="ai-balloon" style={{ top: '22%' }}>
                  <span className="ai-leader" />
                  <span className="ai-num">1</span>
                </div>
                <div className={`ai-balloon${flagged('torque') ? ' is-change' : ''}${dim('torque') ? ' is-dim' : ''}`} style={{ top: '48%' }}>
                  <span className="ai-leader" />
                  <span className="ai-num">2</span>
                  {flagged('torque') ? (
                    <button type="button" className="ai-icon-btn" aria-label="Acknowledge annotation" onClick={() => settle('torque')}>
                      <Check size={14} />
                      <span className="ai-tip" role="tooltip">Annotation 2 updated, 8 → 12 N·m.</span>
                    </button>
                  ) : null}
                </div>
                <div className="ai-balloon" style={{ top: '74%' }}>
                  <span className="ai-leader" />
                  <span className="ai-num">3</span>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="ai-object ai-table">
          <table className="parts-table parts-table--bordered">
            <thead>
              <tr>
                <th className="col-name">Part name</th>
                <th className="col-qty">Qty</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                const changed = Boolean(row.changeId) && flagged(row.changeId);
                return (
                  <tr key={row.id} className={changed ? `is-changed${dim(row.changeId) ? ' is-dim' : ''}` : undefined}>
                    <td className="col-name">
                      {row.name}
                      {changed ? (
                        <span className="ai-sym is-remove" tabIndex={0}>
                          −{row.qty}
                          <span className="ai-tip" role="tooltip">
                            Dowel pin P-204 left the parts table.
                            <button type="button" className="ai-icon-btn" aria-label="Acknowledge" onClick={() => settle(row.changeId)}>
                              <Check size={14} />
                            </button>
                          </span>
                        </span>
                      ) : null}
                    </td>
                    <td className="col-qty">{row.qty}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </article>
    </InteractionFrame>
    {prompt ? (
      <div className="ai-detect" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) updateScreenshots(false); }}>
        <div className="ai-detect-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-detect-title">
          <h2 id="ai-detect-title">Changes in CAD detected</h2>
          <p>Do you want to update screenshots?</p>
          <div className="ai-detect-actions">
            <button ref={yesRef} type="button" className="ai-detect-yes" onClick={() => updateScreenshots(true)}>Yes</button>
            <button type="button" className="ai-detect-no" onClick={() => updateScreenshots(false)}>No</button>
          </div>
          <button type="button" className="ai-detect-manual" onClick={reviewManually}>Review manually</button>
        </div>
      </div>
    ) : null}
    </>
  );
}
