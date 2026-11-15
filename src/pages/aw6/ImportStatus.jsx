import { Box, Check, Loader2, X } from 'lucide-react';

/**
 * The import walkthrough, shown at the top of the assistant panel while an imported document is being built.
 * The document behind it stays empty until the CAD is processed and the steps are made.
 */
export default function ImportStatus({ job, cadName, cadReady, progress, onOpenCad, onDismiss }) {
  const done = job.stage >= 4;
  const hasCad = Boolean(cadName);
  // Each line has the stage it belongs to: 0 upload, 1 CAD, 2 steps, 3 put on the CAD.
  const lines = [
    { id: 'pages', stage: 0, label: job.total ? `Uploading ${job.sourceName} (${job.total} pages)` : `Uploading ${job.sourceName}` },
    hasCad && { id: 'cad', stage: 1, label: cadReady ? `${cadName} is processed` : `Processing ${cadName} (${progress}%)` },
    {
      id: 'ops',
      stage: 2,
      label: job.stage === 2 && job.total
        ? `Creating operation steps (${job.made} of ${job.total})`
        : 'Creating an operation step for each page',
    },
    hasCad && { id: 'link', stage: 3, label: `Putting the steps on ${cadName}` },
  ].filter(Boolean);

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
        {job.stage <= 1 && hasCad
          ? `Your document stays empty while ${cadName} processes. Once the CAD is ready, each page becomes one operation step, kept exactly as it looks.`
          : `Each page of ${job.sourceName} becomes one operation step, kept exactly as it looks, so nothing is lost or reworded.`}
      </p>
      <ol className="aw6-walk-lines">
        {lines.map((line) => {
          // The CAD processes alongside the upload, so its line tracks the CAD itself.
          const state = line.id === 'cad'
            ? (cadReady ? 'done' : 'now')
            : line.stage < job.stage ? 'done' : line.stage === job.stage ? 'now' : 'todo';
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
      {done ? (
        <div className="aw6-walk-next">
          <strong>{hasCad ? 'Next: CAD View' : 'Next: add a CAD model'}</strong>
          <span>
            {hasCad
              ? 'Your steps have the pages, but no screenshots or parts from the model yet. In CAD View you pick parts and take screenshots for each step, which keeps the document linked to the CAD when it changes.'
              : 'Your steps have the pages. Add a CAD model in CAD View to take screenshots and pick parts for each step.'}
          </span>
          <button type="button" className="q20-btn q20-btn--secondary q20-btn--sm aw6-import-cad" onClick={onOpenCad}>
            <Box size={14} /> {hasCad ? 'Open CAD View' : 'Add CAD'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
