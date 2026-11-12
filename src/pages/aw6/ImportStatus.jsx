import { Box, Check, Loader2, X } from 'lucide-react';
import SamplePage from './SamplePage.jsx';

/**
 * The import walkthrough, shown at the top of the assistant panel while an imported document is being built.
 * The document behind it stays empty until the CAD is processed and the steps are made.
 */
export default function ImportStatus({ job, cadName, cadReady, progress, onOpenCad, onDismiss }) {
  const done = job.stage >= 4;
  const lines = [
    { id: 'pages', label: job.total ? `Uploading ${job.sourceName} (${job.total} pages)` : `Uploading ${job.sourceName}` },
    { id: 'cad', label: cadReady ? `${cadName} is processed` : `Processing ${cadName} (${progress}%)` },
    { id: 'ops', label: 'Creating an operation step for each page' },
    { id: 'link', label: `Putting the steps on ${cadName}` },
  ];

  return (
    <section className="aw6-guide aw6-import-status" role="status" aria-live="polite">
      <header>
        <strong>{done ? 'Your operation steps are ready' : 'Creating your operation steps'}</strong>
        {done ? (
          <button type="button" className="aw6-icon-btn" aria-label="Dismiss" onClick={onDismiss}>
            <X size={14} />
          </button>
        ) : null}
      </header>
      <p className="aw6-guide-why">
        {job.stage <= 1
          ? `Your document stays empty while ${cadName} processes. Once the CAD is ready, each page becomes one operation step, kept exactly as it looks.`
          : `Each page of ${job.sourceName} becomes one operation step, kept exactly as it looks, so nothing is lost or reworded.`}
      </p>
      <ol className="aw6-walk-lines">
        {lines.map((line, index) => {
          // The CAD processes alongside the upload, so its line tracks the CAD itself.
          const state = line.id === 'cad'
            ? (cadReady ? 'done' : 'now')
            : index < job.stage ? 'done' : index === job.stage ? 'now' : 'todo';
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
      </ol>
      {job.pages.length ? (
        <div className="aw6-walk-pages" aria-label="Pages brought in">
          {job.pages.map((page, index) => (
            <figure key={index} className={index < job.made ? 'is-op' : ''}>
              <div className="aw6-walk-thumb">
                {page.image ? <img src={page.image} alt="" /> : <SamplePage page={page} index={index} mini />}
              </div>
              <figcaption>{index < job.made ? `Operation ${index + 1}` : `Page ${index + 1}`}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}
      {done ? (
        <div className="aw6-walk-next">
          <strong>Next: CAD View</strong>
          <span>
            Your steps have the pages, but no screenshots or parts from the model yet. In CAD View you pick parts and take
            screenshots for each step, which keeps the document linked to the CAD when it changes.
          </span>
          <button type="button" className="q20-btn q20-btn--secondary q20-btn--sm aw6-import-cad" onClick={onOpenCad}>
            <Box size={14} /> Open CAD View
          </button>
        </div>
      ) : null}
    </section>
  );
}
