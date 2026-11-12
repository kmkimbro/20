import { Check, ChevronDown, ChevronUp, FileUp, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../design-system/index.js';

/**
 * A small layer in the corner of the project page that shows an import running in the background,
 * so the modal can close as soon as the person picks Import.
 */
export default function ImportStatus({ job, doc, now, onOpen, onDismiss }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!job || !doc) return null;

  const done = job.stage >= 3;
  const cadReady = now >= (doc.cadReadyAt || 0);
  const cadProgress = Math.min(100, Math.max(0, Math.round(100 - ((doc.cadReadyAt - now) / doc.cadTotalMs) * 100)));

  const lines = [
    { id: 'pages', label: job.total ? `Bringing in all ${job.total} pages` : 'Bringing in the pages' },
    {
      id: 'ops',
      label: job.stage >= 2 || job.made
        ? `Creating operation steps (${job.made} of ${job.total})`
        : 'Creating an operation step for each page',
    },
    { id: 'cad', label: `Putting the steps on ${doc.cadName}` },
  ];

  if (job.error) {
    return (
      <section className="aw6-layer is-error" role="status" aria-live="polite">
        <header className="aw6-layer-head">
          <FileUp size={15} />
          <strong>Import failed</strong>
          <button type="button" className="aw6-icon-btn" aria-label="Dismiss" onClick={onDismiss}><X size={14} /></button>
        </header>
        <p className="aw6-layer-text">{job.error}</p>
      </section>
    );
  }

  return (
    <section className="aw6-layer" role="status" aria-live="polite">
      <header className="aw6-layer-head">
        {done ? <span className="aw6-layer-ok"><Check size={12} strokeWidth={3} /></span> : <Loader2 size={15} className="aw6-spin" />}
        <div className="aw6-layer-title">
          <strong>{done ? 'Your operation steps are ready' : 'Creating your operation steps'}</strong>
          <span>{job.sourceName}</span>
        </div>
        <button
          type="button"
          className="aw6-icon-btn"
          aria-label={collapsed ? 'Show details' : 'Hide details'}
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {done ? (
          <button type="button" className="aw6-icon-btn" aria-label="Dismiss" onClick={onDismiss}><X size={14} /></button>
        ) : null}
      </header>
      {collapsed ? null : (
        <>
          <p className="aw6-layer-text">
            {done
              ? 'Each page is now one operation step, kept exactly as it looked.'
              : 'Each page becomes one operation step, kept exactly as it looks. You can keep working while this runs.'}
          </p>
          <ol className="aw6-walk-lines aw6-layer-lines">
            {lines.map((line, index) => {
              const state = index < job.stage ? 'done' : index === job.stage ? 'now' : 'todo';
              return (
                <li key={line.id} className={`is-${state}`}>
                  <span className="aw6-walk-dot" aria-hidden="true">
                    {state === 'done' ? <Check size={12} strokeWidth={3} /> : null}
                    {state === 'now' ? <Loader2 size={12} className="aw6-spin" /> : null}
                  </span>
                  {line.label}
                </li>
              );
            })}
            <li className={cadReady ? 'is-done' : 'is-now'}>
              <span className="aw6-walk-dot" aria-hidden="true">
                {cadReady ? <Check size={12} strokeWidth={3} /> : <Loader2 size={12} className="aw6-spin" />}
              </span>
              {cadReady ? `${doc.cadName} is ready` : `Processing ${doc.cadName} (${cadProgress}%)`}
            </li>
          </ol>
          {done ? (
            <p className="aw6-layer-text aw6-layer-next">
              <strong>Next: CAD View.</strong> Add screenshots and parts from the model to each step, so the document stays
              linked to the CAD when it changes.
            </p>
          ) : null}
        </>
      )}
      {done ? (
        <div className="aw6-layer-foot">
          <Button size="sm" onClick={onOpen}>Open document</Button>
        </div>
      ) : null}
    </section>
  );
}
