import { useEffect, useState } from 'react';
import {
  File, FileUp, Link2, Paperclip, Upload, X,
} from 'lucide-react';
import { Button, Field, Input, Modal } from '../../design-system/index.js';
import {
  ONSHAPE_DOCS, SAMPLE_PDF, bareName,
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
    </div>
  );
}

/* ---------- Blank or import ---------- */

export function StartStep({ start, setStart, source, setSource, error, hideLabel = false }) {
  const [hot, setHot] = useState(false);
  const take = (file) => {
    if (!isPdf(file)) return;
    setSource({ name: file.name, file });
    setStart('import');
  };
  const importOn = start === 'import';

  return (
    <div className="aw6-start">
      {hideLabel ? null : <div className="aw6-label">How do you want to start?</div>}
      <div className="aw6-start-list">
        <button
          type="button"
          aria-pressed={start === 'blank'}
          className={`aw6-start-row${start === 'blank' ? ' is-on' : ''}`}
          onClick={() => setStart('blank')}
        >
          <File size={18} aria-hidden="true" />
          <strong>Blank document</strong>
          <span>Start empty and build your document</span>
        </button>
        <div className="aw6-or" aria-hidden="true">or</div>
        {/* Import works like the CAD upload: click or drop a PDF straight onto the tile. */}
        <div
          className={`aw6-drop aw6-start-drop${hot ? ' is-hot' : ''}${importOn ? ' is-filled' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setHot(true); }}
          onDragLeave={() => setHot(false)}
          onDrop={(event) => { event.preventDefault(); setHot(false); take(event.dataTransfer.files?.[0]); }}
        >
          {importOn && source ? (
            <>
              <FileUp size={18} aria-hidden="true" />
              <strong>Import a document</strong>
              <div className="aw6-file-chip">
                <Paperclip size={14} />
                <span>{source.name}</span>
                <button type="button" aria-label="Remove document" onClick={() => { setSource(null); setStart(null); }}>
                  <X size={12} />
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="aw6-drop-main">
                <Upload size={18} />
                <strong>Import a document</strong>
                <span>Click and drag an existing PDF</span>
                <input type="file" accept=".pdf,application/pdf" onChange={(event) => { take(event.target.files?.[0]); event.target.value = ''; }} />
              </label>
            </>
          )}
        </div>
      </div>
      {error ? <p className="aw6-error">{error}</p> : null}
    </div>
  );
}

/* ---------- The modal ---------- */

export default function CreateDocument6({ open, cadLibrary, onClose, onCreate }) {
  const [draft, setDraft] = useState({ name: '', cad: null });
  const [start, setStart] = useState(null);
  const [source, setSource] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (open) return;
    setStep(1);
    setDraft({ name: '', cad: null });
    setStart(null);
    setSource(null);
    setError('');
  }, [open]);

  if (!open) return null;

  // CAD is optional: with nothing picked the document starts with no CAD, and it can be added later in CAD View.
  const cadName = draft.cad?.name || null;
  const docName = draft.name.trim() || (cadName ? bareName(cadName) : '') || 'Untitled document';
  const kind = start === 'import' ? 'import' : 'blank';

  // On Create the modal closes right away and any CAD processing or import runs in the editor.
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
      footer={step === 1 ? (
        <Button onClick={() => setStep(2)}>Next</Button>
      ) : (
        <>
          <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
          <Button onClick={finish}>{kind === 'import' ? 'Import' : 'Create document'}</Button>
        </>
      )}
      className="aw6-modal"
    >
      {/* Two steps: name and CAD first, then how to start. */}
      {step === 1 ? (
      <div className="aw6-create">
        <Field label="Document name">
          <Input
            value={draft.name}
            placeholder="Untitled document"
            onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
          />
        </Field>
        <CadPicker draft={draft} setDraft={setDraft} cadLibrary={cadLibrary} />
      </div>
      ) : (
      <div className="aw6-create">
        <StartStep
          start={start}
          setStart={setStart}
          source={source}
          setSource={(s) => { setError(''); setSource(s); }}
          error={error}
        />
      </div>
      )}
    </Modal>
  );
}

/* ---------- The same "How do you want to start?" step, inside the Onshape panel ---------- */

export function OnshapeStart({ title, cadName, onCreate }) {
  const [start, setStart] = useState(null);
  const [source, setSource] = useState(null);
  const kind = start === 'import' ? 'import' : 'blank';
  // Same layout as the AI workflow 5 panel: a heading, the choices, then Done on the right.
  return (
    <div className="aw6-os-start">
      <div className="rf-title-row"><h2 className="rf-title">How do you want to make this document?</h2></div>
      <StartStep start={start} setStart={setStart} source={source} setSource={setSource} error="" hideLabel />
      <div className="rf-actions">
        <span />
        <button
          type="button"
          className="rf-next"
          onClick={() => onCreate({
            name: title,
            cadName,
            cadSource: 'onshape',
            start: kind,
            sourceName: kind === 'import' && source ? source.name : '',
            source: kind === 'import' ? source : null,
          })}
        >
          Done
        </button>
      </div>
    </div>
  );
}
