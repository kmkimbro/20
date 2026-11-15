import { Fragment, useEffect, useState } from 'react';
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

/* ---------- CAD model (optional) ---------- */

function CadPicker({ draft, setDraft, cadLibrary }) {
  const [hot, setHot] = useState(false);
  const [onshapeOpen, setOnshapeOpen] = useState(false);

  const takeFile = (file) => {
    if (!isCad(file)) return;
    setDraft((d) => ({ ...d, cad: { source: 'upload', name: file.name }, name: d.name || bareName(file.name) }));
  };

  const cad = draft.cad;
  const uploaded = cad && (cad.source === 'upload' || cad.source === 'onshape');

  if (draft.skipCad) {
    return (
      <div className="aw6-cad-step">
        <div className="aw6-label-row">
          <span className="aw6-label">CAD model</span>
          <span className="aw6-optional">Optional</span>
        </div>
        <div className="aw6-cad-skipped">
          <span>No CAD for now. You can add it any time from CAD View, and screenshots and parts will come from it.</span>
          <button type="button" className="aw6-text-btn" onClick={() => setDraft((d) => ({ ...d, skipCad: false }))}>Add CAD now</button>
        </div>
      </div>
    );
  }

  return (
    <div className="aw6-cad-step">
      <div className="aw6-label-row">
        <span className="aw6-label">CAD model</span>
        <span className="aw6-optional">Optional</span>
      </div>
      <p className="aw6-help">Screenshots and parts in the document come from the CAD. It processes in the background once the document opens.</p>
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
      <button
        type="button"
        className="aw6-text-btn aw6-skip-cad"
        onClick={() => setDraft((d) => ({ ...d, cad: null, skipCad: true }))}
      >
        Skip for now
      </button>
    </div>
  );
}

/* ---------- Blank or import ---------- */

const STARTS = [
  {
    id: 'blank',
    icon: File,
    title: 'Blank document',
    detail: 'Start empty and build your operations',
  },
  {
    id: 'import',
    icon: FileUp,
    title: 'Import a document',
    detail: 'Turn an existing PDF into operation steps',
  },
];

function StartStep({ start, setStart, source, setSource, error }) {
  return (
    <div className="aw6-start">
      <div className="aw6-label">How do you want to start?</div>
      <div className="aw6-start-list" role="radiogroup" aria-label="How to start">
        {STARTS.map((item, index) => {
          const Icon = item.icon;
          const on = start === item.id;
          return (
            <Fragment key={item.id}>
            {index > 0 ? <div className="aw6-or" aria-hidden="true">or</div> : null}
            <button
              type="button"
              role="radio"
              aria-checked={on}
              className={`aw6-start-row${on ? ' is-on' : ''}`}
              onClick={() => setStart(item.id)}
            >
              <Icon size={18} aria-hidden="true" />
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </button>
            </Fragment>
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
  const [draft, setDraft] = useState({ name: '', cad: null, skipCad: false });
  const [start, setStart] = useState(null);
  const [source, setSource] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) return;
    setDraft({ name: '', cad: null, skipCad: false });
    setStart(null);
    setSource(null);
    setError('');
  }, [open]);

  if (!open) return null;

  // With nothing picked the prototype falls back to the sample CAD so it can be clicked through;
  // Skip for now creates the document with no CAD at all.
  const cadName = draft.skipCad ? null : (draft.cad?.name || SAMPLE_CAD);
  const docName = draft.name.trim() || (cadName ? bareName(cadName) : '') || 'Untitled document';
  const kind = start === 'import' ? 'import' : 'blank';

  // One step: the modal closes right away and any CAD processing or import runs in the editor.
  const finish = () => {
    const src = kind === 'import' ? (source || { name: SAMPLE_PDF, sample: true }) : null;
    onCreate({
      name: docName,
      cadName,
      cadSource: cadName ? (draft.cad?.source || 'upload') : null,
      start: kind,
      sourceName: src ? src.name : '',
      source: src,
    });
  };

  return (
    <Modal
      open
      size="md"
      title="Create a document"
      onClose={onClose}
      footer={<Button onClick={finish}>{kind === 'import' ? 'Import' : 'Create document'}</Button>}
      className="aw6-modal"
    >
      <div className="aw6-create">
        <Field label="Document name">
          <Input
            value={draft.name}
            placeholder="Untitled document"
            onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
          />
        </Field>
        <StartStep
          start={start}
          setStart={setStart}
          source={source}
          setSource={(s) => { setError(''); setSource(s); }}
          error={error}
        />
        <CadPicker draft={draft} setDraft={setDraft} cadLibrary={cadLibrary} />
      </div>
    </Modal>
  );
}
