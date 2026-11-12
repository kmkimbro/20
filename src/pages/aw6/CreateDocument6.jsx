import { useEffect, useState } from 'react';
import {
  File, FileUp, Link2, Paperclip, Upload, X,
} from 'lucide-react';
import { Button, Field, Input, Modal } from '../../design-system/index.js';
import {
  ONSHAPE_DOCS, SAMPLE_CAD, SAMPLE_PDF, bareName,
} from './model.js';

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

function StartStep({ start, setStart, source, setSource, error }) {
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
            </button>
          );
        })}
      </div>
      {start === 'import' ? <ImportDrop source={source} setSource={setSource} error={error} /> : null}
    </div>
  );
}

/* ---------- Inline upload shown when Import is selected ---------- */

function ImportDrop({ source, setSource, error }) {
  const [hot, setHot] = useState(false);

  const take = (file) => {
    if (!isPdf(file)) return;
    setSource({ name: file.name, file });
  };

  return (
    <div className="aw6-import is-inline">
      <div
        className={`aw6-drop${hot ? ' is-hot' : ''}${source ? ' is-filled' : ''}`}
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
            <span>Click or drag your work instruction here. Every page comes in as an operation step.</span>
            <input type="file" accept=".pdf,application/pdf" onChange={(event) => { take(event.target.files?.[0]); event.target.value = ''; }} />
          </label>
        )}
      </div>
      {error ? <p className="aw6-error">{error}</p> : null}
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

  useEffect(() => {
    if (open) return;
    setStep('cad');
    setDraft({ name: '', cad: null });
    setStart(null);
    setSource(null);
    setError('');
  }, [open]);

  if (!open) return null;

  const cadName = draft.cad?.name || SAMPLE_CAD;
  const docName = draft.name.trim() || bareName(cadName) || 'Untitled document';
  // Both paths close the modal right away. An import keeps running in a status layer on the project page.
  const finish = (kind) => {
    const src = kind === 'import' ? (source || { name: SAMPLE_PDF, sample: true }) : null;
    onCreate({
      name: docName,
      cadName,
      cadSource: draft.cad?.source || 'upload',
      start: kind,
      sourceName: src ? src.name : '',
      source: src,
    });
  };

  let title = 'Create a document';
  let eyebrow = null;
  let onBack = null;
  let body = null;
  let footer = null;

  if (step === 'cad') {
    body = <CadStep draft={draft} setDraft={setDraft} cadLibrary={cadLibrary} />;
    footer = (
      <Button onClick={() => setStep('start')}>Next</Button>
    );
  } else if (step === 'start') {
    title = 'How do you want to start?';
    eyebrow = cadName;
    onBack = () => setStep('cad');
    body = (
      <StartStep
        start={start}
        setStart={setStart}
        source={source}
        setSource={(s) => { setError(''); setSource(s); }}
        error={error}
      />
    );
    footer = start === 'import'
      ? <Button onClick={() => finish('import')}>Import</Button>
      : <Button onClick={() => finish('blank')}>Create document</Button>;
  }

  return (
    <Modal
      open
      size="md"
      title={title}
      eyebrow={eyebrow}
      onBack={onBack}
      onClose={onClose}
      footer={footer}
      className="aw6-modal"
    >
      {body}
    </Modal>
  );
}
