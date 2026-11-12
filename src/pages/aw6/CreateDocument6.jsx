import { useEffect, useRef, useState } from 'react';
import {
  Check, File, FileUp, Link2, Loader2, Paperclip, Upload, X,
} from 'lucide-react';
import { Button, Field, Input, Modal } from '../../design-system/index.js';
import {
  ONSHAPE_DOCS, SAMPLE_CAD, SAMPLE_PDF, bareName, samplePages,
} from './model.js';
import { renderPdfPages } from './pdfPages.js';
import SamplePage from './SamplePage.jsx';

function isCad(file) {
  return Boolean(file) && /\.(step|stp|iges|igs|stl|obj)(\.gz)?$/i.test(file.name);
}

function isPdf(file) {
  return Boolean(file) && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
}

/* ---------- Step 1: name and CAD ---------- */

function CadStep({ draft, setDraft, cadLibrary }) {
  const [hot, setHot] = useState(false);
  const [onshapeOpen, setOnshapeOpen] = useState(false);

  const takeFile = (file) => {
    if (!isCad(file)) return;
    setDraft((d) => ({ ...d, cad: { source: 'upload', name: file.name }, name: d.name || bareName(file.name) }));
  };

  const cad = draft.cad;
  const uploaded = cad && (cad.source === 'upload' || cad.source === 'onshape');

  return (
    <div className="aw6-cad-step">
      <Field label="Document name">
        <Input
          value={draft.name}
          placeholder="Untitled document"
          onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
        />
      </Field>

      <div className="aw6-label">CAD file</div>
      <p className="aw6-help">Every Quarter20 document is built on a CAD model. Screenshots and parts in the document come from it.</p>
      <div className="aw6-cad-choice">
        <div
          className={`aw6-drop${hot ? ' is-hot' : ''}${uploaded ? ' is-filled' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setHot(true); }}
          onDragLeave={() => setHot(false)}
          onDrop={(event) => {
            event.preventDefault();
            setHot(false);
            takeFile(event.dataTransfer.files?.[0]);
          }}
        >
          {uploaded ? (
            <div className="aw6-file-chip">
              <Paperclip size={14} />
              <span>{cad.name}</span>
              {cad.source === 'onshape' ? <em>from Onshape</em> : null}
              <button type="button" aria-label="Remove CAD" onClick={() => setDraft((d) => ({ ...d, cad: null }))}>
                <X size={12} />
              </button>
            </div>
          ) : (
            <>
              <label className="aw6-drop-main">
                <Upload size={18} />
                <strong>Upload new CAD</strong>
                <span>Click or drag a STEP file here</span>
                <input
                  type="file"
                  accept=".step,.stp,.iges,.igs,.stl,.obj,.gz"
                  onChange={(event) => { takeFile(event.target.files?.[0]); event.target.value = ''; }}
                />
              </label>
              <button type="button" className="aw6-onshape-link" onClick={() => setOnshapeOpen((v) => !v)}>
                or bring it in from Onshape
              </button>
              {onshapeOpen ? (
                <div className="aw6-onshape-list" role="listbox" aria-label="Onshape documents">
                  {ONSHAPE_DOCS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => {
                        setOnshapeOpen(false);
                        setDraft((d) => ({ ...d, cad: { source: 'onshape', name: item.file }, name: d.name || item.name }));
                      }}
                    >
                      <span className="aw6-onshape-mark" aria-hidden="true">O</span>
                      {item.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
        <div className="aw6-or">or</div>
        <div className={`aw6-link-card${cad?.source === 'library' ? ' is-filled' : ''}`}>
          <Link2 size={18} />
          <strong>Link existing</strong>
          <span>Choose CAD already in Quarter20</span>
          <select
            className="q20-input"
            aria-label="CAD library"
            value={cad?.source === 'library' ? cad.name : ''}
            onChange={(event) => {
              const name = event.target.value;
              setDraft((d) => ({ ...d, cad: name ? { source: 'library', name } : null, name: d.name || bareName(name) }));
            }}
          >
            <option value="">Choose a model</option>
            {cadLibrary.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

/* ---------- Step 2: blank or import ---------- */

const STARTS = [
  {
    id: 'blank',
    icon: File,
    title: 'Blank document',
    detail: 'An empty document on your CAD, like a blank canvas. Add operations yourself, or ask the assistant in the editor to build them from the CAD.',
    fit: 'Best when you are writing a new process.',
  },
  {
    id: 'import',
    icon: FileUp,
    title: 'Import a document',
    detail: 'Bring in a work instruction you already have. We bring in every page and make each one an operation step.',
    fit: 'Best when the instructions already exist as a PDF.',
  },
];

function StartStep({ start, setStart }) {
  return (
    <div className="aw6-start">
      <p className="aw6-help">
        Choose how to begin. Either way you end up in the document editor, where you can keep building from your CAD.
      </p>
      <div className="aw6-start-list" role="radiogroup" aria-label="How to start">
        {STARTS.map((item) => {
          const Icon = item.icon;
          const on = start === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`aw6-start-row${on ? ' is-on' : ''}`}
              onClick={() => setStart(item.id)}
            >
              <span className="aw6-start-icon" aria-hidden="true"><Icon size={18} /></span>
              <span className="aw6-start-text">
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
                <em>{item.fit}</em>
              </span>
              <span className={`aw6-radio${on ? ' is-on' : ''}`} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Step 3: choose the document to import ---------- */

function ImportFileStep({ source, setSource, error }) {
  const [hot, setHot] = useState(false);

  const take = (file) => {
    if (!isPdf(file)) return;
    setSource({ name: file.name, file });
  };

  return (
    <div className="aw6-import">
      <p className="aw6-help">
        Upload the work instruction as a PDF. The whole document comes in, so there is nothing to pick or set up.
      </p>
      <div
        className={`aw6-drop is-tall${hot ? ' is-hot' : ''}${source ? ' is-filled' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setHot(true); }}
        onDragLeave={() => setHot(false)}
        onDrop={(event) => { event.preventDefault(); setHot(false); take(event.dataTransfer.files?.[0]); }}
      >
        {source ? (
          <div className="aw6-file-chip">
            <Paperclip size={14} />
            <span>{source.name}</span>
            <button type="button" aria-label="Remove document" onClick={() => setSource(null)}>
              <X size={12} />
            </button>
          </div>
        ) : (
          <label className="aw6-drop-main">
            <Upload size={18} />
            <strong>Upload a PDF</strong>
            <span>Click or drag your work instruction here</span>
            <input type="file" accept=".pdf,application/pdf" onChange={(event) => { take(event.target.files?.[0]); event.target.value = ''; }} />
          </label>
        )}
      </div>
      {error ? <p className="aw6-error">{error}</p> : null}
    </div>
  );
}

/* ---------- Step 4: guided walkthrough while the import runs ---------- */

function Walkthrough({ source, cadName, progress, pages }) {
  const lines = [
    { id: 'upload', label: `Uploading ${source.name}` },
    { id: 'pages', label: progress.total ? `Bringing in all ${progress.total} pages` : 'Bringing in every page' },
    { id: 'ops', label: 'Creating an operation step for each page' },
    { id: 'cad', label: `Putting the steps on ${cadName}` },
  ];
  return (
    <div className="aw6-walk">
      <p className="aw6-help">
        Here is what happens to your document. Each page becomes one operation step in Quarter20, and the page is kept
        exactly as it looks, so nothing is lost or reworded.
      </p>
      <ol className="aw6-walk-lines">
        {lines.map((line, index) => {
          const state = index < progress.stage ? 'done' : index === progress.stage ? 'now' : 'todo';
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
      <div className="aw6-walk-pages" aria-label="Pages brought in">
        {pages.map((page, index) => (
          <figure key={index} className={index < progress.made ? 'is-op' : ''}>
            <div className="aw6-walk-thumb">
              {page.image ? <img src={page.image} alt="" /> : <SamplePage page={page} index={index} mini />}
            </div>
            <figcaption>{index < progress.made ? `Operation ${index + 1}` : `Page ${index + 1}`}</figcaption>
          </figure>
        ))}
      </div>
      {progress.stage >= lines.length ? (
        <div className="aw6-walk-next">
          <strong>Next: CAD View</strong>
          <span>
            Your steps have the pages, but no screenshots or parts from the model yet. In CAD View you pick parts and take
            screenshots for each step, which keeps the document linked to the CAD when it changes.
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- The modal ---------- */

export default function CreateDocument6({ open, cadLibrary, onClose, onCreate }) {
  const [step, setStep] = useState('cad');
  const [draft, setDraft] = useState({ name: '', cad: null });
  const [start, setStart] = useState(null);
  const [source, setSource] = useState(null);
  const [error, setError] = useState('');
  const [pages, setPages] = useState([]);
  const [progress, setProgress] = useState({ stage: 0, total: 0, made: 0 });
  const runRef = useRef(0);

  useEffect(() => {
    if (open) return;
    runRef.current += 1;
    setStep('cad');
    setDraft({ name: '', cad: null });
    setStart(null);
    setSource(null);
    setError('');
    setPages([]);
    setProgress({ stage: 0, total: 0, made: 0 });
  }, [open]);

  if (!open) return null;

  const cadName = draft.cad?.name || SAMPLE_CAD;
  const docName = draft.name.trim() || bareName(cadName) || 'Untitled document';
  const wait = (ms) => new Promise((resolve) => { window.setTimeout(resolve, ms); });

  const runImport = async (src = source) => {
    const run = runRef.current + 1;
    runRef.current = run;
    const alive = () => runRef.current === run;
    setStep('walk');
    setProgress({ stage: 0, total: 0, made: 0 });
    let list = [];
    await wait(900);
    if (!alive()) return;
    setProgress((p) => ({ ...p, stage: 1 }));
    if (src.file) {
      try {
        const { images, total } = await renderPdfPages(src.file, (n, count) => {
          if (alive()) setProgress((p) => ({ ...p, total: count }));
        });
        list = images.map((image) => ({ image }));
        if (alive()) setProgress((p) => ({ ...p, total: Math.min(total, images.length) }));
      } catch {
        if (!alive()) return;
        setError('That PDF could not be opened. Try another file or use the sample.');
        setStep('file');
        return;
      }
    } else {
      list = samplePages();
      setProgress((p) => ({ ...p, total: list.length }));
    }
    if (!alive()) return;
    setPages([]);
    for (let i = 0; i < list.length; i += 1) {
      await wait(180);
      if (!alive()) return;
      setPages(list.slice(0, i + 1));
    }
    setProgress((p) => ({ ...p, stage: 2 }));
    for (let i = 0; i < list.length; i += 1) {
      await wait(260);
      if (!alive()) return;
      setProgress((p) => ({ ...p, made: i + 1 }));
    }
    setProgress((p) => ({ ...p, stage: 3 }));
    await wait(1000);
    if (!alive()) return;
    setProgress((p) => ({ ...p, stage: 4 }));
  };

  const finish = (kind) => {
    onCreate({
      name: docName,
      cadName,
      cadSource: draft.cad?.source || 'upload',
      start: kind,
      sourceName: kind === 'import' ? source?.name : '',
      pages: kind === 'import' ? pages : [],
    });
  };

  let title = 'Create a document';
  let eyebrow = null;
  let onBack = null;
  let body = null;
  let footer = null;
  const closable = step !== 'walk' || progress.stage >= 4;

  if (step === 'cad') {
    body = <CadStep draft={draft} setDraft={setDraft} cadLibrary={cadLibrary} />;
    footer = (
      <Button onClick={() => setStep('start')}>Next</Button>
    );
  } else if (step === 'start') {
    title = 'How do you want to start?';
    eyebrow = cadName;
    onBack = () => setStep('cad');
    body = <StartStep start={start} setStart={setStart} />;
    footer = start === 'import'
      ? <Button onClick={() => setStep('file')}>Next</Button>
      : <Button onClick={() => finish('blank')}>Create document</Button>;
  } else if (step === 'file') {
    title = 'Import a document';
    eyebrow = cadName;
    onBack = () => setStep('start');
    body = <ImportFileStep source={source} setSource={(s) => { setError(''); setSource(s); }} error={error} />;
    footer = <Button onClick={() => { if (!source) setSource({ name: SAMPLE_PDF, sample: true }); runImport(source || { name: SAMPLE_PDF, sample: true }); }}>Import</Button>;
  } else {
    title = progress.stage >= 4 ? 'Your operation steps are ready' : 'Creating your operation steps';
    eyebrow = source?.name;
    body = <Walkthrough source={source} cadName={cadName} progress={progress} pages={pages} />;
    footer = <Button disabled={progress.stage < 4} onClick={() => finish('import')}>Open document</Button>;
  }

  return (
    <Modal
      open
      size="md"
      title={title}
      eyebrow={eyebrow}
      onBack={onBack}
      onClose={closable ? onClose : undefined}
      footer={footer}
      className="aw6-modal"
    >
      {body}
    </Modal>
  );
}
