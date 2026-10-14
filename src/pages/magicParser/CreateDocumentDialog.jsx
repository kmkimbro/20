import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Link2, Paperclip, Sparkles, Upload, X } from 'lucide-react';
import { sampleForFile } from '../infer/samples.js';
import '../infer/infer.css';

const TEMPLATES = [
  { id: 'blank', label: 'Blank document' },
  { id: 'work_instruction', label: 'Work Instructions' },
  { id: 'quality_checklist', label: 'Quality checklist' },
  { id: 'drawing_release', label: 'Drawing release package' },
];

const PARSE_CHOICES = [
  { id: 'images', label: 'Images' },
  { id: 'text', label: 'Text' },
  { id: 'tables', label: 'Tables' },
  { id: 'headers', label: 'Headers / footers' },
];

const ALL_ON = { images: true, text: true, tables: true, headers: true };
const CAD_ACCEPT = '.step,.stp,.iges,.igs,.stl,.obj,.gz';

function isPdf(file) {
  return Boolean(file) && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
}

function isCad(file) {
  return Boolean(file) && /\.(step|stp|iges|igs|stl|obj)(\.gz)?$/i.test(file.name);
}

function FileChip({ name, onRemove }) {
  return (
    <button type="button" className="mp-file-chip" onClick={onRemove}>
      <Paperclip size={14} />
      <span>{name}</span>
    </button>
  );
}

function UploadZone({ title, hint, accept, hot, onHot, onFile, icon, fileName, onRemove, attachBelow, children }) {
  const chip = fileName ? <FileChip name={fileName} onRemove={onRemove} /> : null;
  const card = (
    <div
      className={`mp-upload-card${hot ? ' is-hot' : ''}`}
      onDragOver={(event) => { event.preventDefault(); onHot(true); }}
      onDragLeave={() => onHot(false)}
      onDrop={(event) => {
        event.preventDefault();
        onHot(false);
        onFile(event.dataTransfer.files?.[0]);
      }}
    >
      <label>
        <span className="mp-upload-icon">{icon || <Upload size={18} />}</span>
        <strong>{title}</strong>
        <span>{hint}</span>
        <input
          type="file"
          accept={accept}
          onChange={(event) => {
            onFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </label>
      {attachBelow ? null : chip}
      {children}
    </div>
  );
  if (!attachBelow) return card;
  return (
    <div className="mp-upload-stack">
      {card}
      {chip}
    </div>
  );
}

const READ_STAGES = [
  'Pulling the pictures out of this section',
  'Writing an operation for each step, keeping the wording',
  'Putting each picture and its callouts back where they were',
  'Attaching the parts from the model and laying out the parts table',
];

const STEP_STAGES = [
  'Reading the STEP',
  'Building an operation for each step in the assembly',
  'Placing a screenshot on each step',
  'Adding the parts from the model',
];

const TEMPLATE_PROMPTS = {
  work_instruction: `This is a work instruction. Keep each photo with its step, and read the table as operations.

Extract the text exactly from each operation step. Add that text to the note and make sure it matches exactly. Rename the operation step to say what is done. Add the image for the step in the same location as in the document. Extract any annotations and add them in the same location so the images match up. Add the appropriate parts to the operation steps. Add a parts table to each operation step. Make sure nothing overlaps on each document page.`,
  quality_checklist: `This is a quality checklist. Keep each photo with its check, and read the table as checks.

Extract the text exactly from each check. Add that text to the note and make sure it matches exactly. Rename the check to say what is verified. Add the image for the check in the same location as in the document. Extract any annotations and add them in the same location so the images match up. Add the appropriate parts to the checks. Add a results table to each check. Make sure nothing overlaps on each document page.`,
  drawing_release: `This is a drawing release package. Keep each view with its sheet, and read the table as the parts list.

Extract the text exactly from each sheet. Add that text to the note and make sure it matches exactly. Rename the sheet to say what is released. Add the view for the sheet in the same location as in the document. Extract any annotations and add them in the same location so the images match up. Add the appropriate parts to the sheets. Add a parts list to each sheet. Make sure nothing overlaps on each document page.`,
  blank: `This is a document. Keep each photo with its section, and read the table as the content.

Extract the text exactly from each section. Add that text to the note and make sure it matches exactly. Rename the section to say what it covers. Add the image for the section in the same location as in the document. Extract any annotations and add them in the same location so the images match up. Add the appropriate parts to the sections. Add a table to each section. Make sure nothing overlaps on each document page.`,
};

function promptForTemplate(templateId) {
  return TEMPLATE_PROMPTS[templateId] || TEMPLATE_PROMPTS.blank;
}
const SAMPLE_CAD_NAME = 'weldment_frame.step';

function ParseRow({ options, onToggle }) {
  return (
    <div className="mp-parse-row">
      {PARSE_CHOICES.map((choice) => (
        <label key={choice.id}>
          <input
            type="checkbox"
            checked={options[choice.id]}
            onChange={() => onToggle(choice.id)}
          />
          <span>{choice.label}</span>
        </label>
      ))}
    </div>
  );
}

export default function CreateDocumentDialog({ creator, cadLibrary = [], onClose, onCreateBlank, onCreateFromPdf, onCreateInfer, embedded = false }) {
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('work_instruction');
  const [pdf, setPdf] = useState(null);
  const [cadFile, setCadFile] = useState(null);
  const [linkedId, setLinkedId] = useState('');
  const [pdfHot, setPdfHot] = useState(false);
  const [cadHot, setCadHot] = useState(false);
  const [options, setOptions] = useState(ALL_ON);
  const [localError, setLocalError] = useState('');
  const [existingOpen, setExistingOpen] = useState(false);
  const [prompt, setPrompt] = useState(() => promptForTemplate('work_instruction'));
  const [readStage, setReadStage] = useState(-1);
  const sentInfer = useRef(false);
  const inferPayload = useRef(null);
  const stageList = useRef(READ_STAGES);

  useEffect(() => {
    if (creator) return;
    setName('');
    setTemplateId('work_instruction');
    setPdf(null);
    setCadFile(null);
    setLinkedId('');
    setPdfHot(false);
    setCadHot(false);
    setOptions(ALL_ON);
    setLocalError('');
    setExistingOpen(false);
    setPrompt(promptForTemplate('work_instruction'));
    setReadStage(-1);
    sentInfer.current = false;
    inferPayload.current = null;
  }, [creator]);

  useEffect(() => {
    if (!onCreateInfer) return;
    setPrompt(promptForTemplate(templateId));
  }, [templateId, onCreateInfer]);

  useEffect(() => {
    if (readStage < 0 || readStage >= stageList.current.length) return undefined;
    const timer = window.setTimeout(() => setReadStage((value) => value + 1), 700);
    return () => window.clearTimeout(timer);
  }, [readStage]);

  useEffect(() => {
    if (readStage !== stageList.current.length || sentInfer.current || !inferPayload.current || !onCreateInfer) return;
    sentInfer.current = true;
    onCreateInfer(inferPayload.current);
  }, [readStage, onCreateInfer]);

  if (!creator) return null;

  const working = creator.phase === 'working';
  const hasLibrary = cadLibrary.length > 0;
  const linked = cadLibrary.find((item) => item.id === linkedId) || null;
  const progress = creator.pageCount
    ? Math.round((creator.page / creator.pageCount) * 100)
    : 8;

  const takePdf = (next) => {
    if (!next || working) return;
    if (!isPdf(next)) {
      setLocalError('Choose a PDF to start the document from.');
      return;
    }
    setLocalError('');
    setPdf(next);
    setName((current) => (current.trim() ? current : next.name.replace(/\.pdf$/i, '')));
  };

  const takeCad = (next) => {
    if (!next || working) return;
    if (!isCad(next)) {
      setLocalError('Upload a STEP, IGES, STL, or OBJ file.');
      return;
    }
    setLocalError('');
    setCadFile(next);
    setLinkedId('');
  };

  const create = () => {
    const cadName = cadFile?.name || linked?.name || '';
    const draft = {
      name: name.trim() || pdf?.name.replace(/\.pdf$/i, '') || cadName.replace(/\.(step|stp|iges|igs|stl|obj)$/i, '') || 'Untitled Document',
      templateId,
      file: pdf,
      options,
      cadName,
      cadLinked: Boolean(cadName),
      cadSource: cadFile ? 'upload' : (linked ? 'library' : null),
    };
    if (onCreateInfer) {
      const resolvedCad = cadName || SAMPLE_CAD_NAME;
      const fromFile = (pdf?.name || (cadName ? resolvedCad : '')).replace(/\.(pdf|step|stp|iges|igs|stl|obj)(\.gz)?$/i, '');
      stageList.current = pdf ? READ_STAGES : STEP_STAGES;
      inferPayload.current = {
        sampleId: sampleForFile(pdf?.name || resolvedCad),
        title: name.trim() || fromFile || 'Frame weldment',
        sourceName: pdf?.name || '',
        cadName: resolvedCad,
        origin: pdf ? 'both' : 'cad',
        templateId,
        adjustments: {
          pictures: true,
          table: true,
          callouts: true,
          note: prompt,
        },
      };
      sentInfer.current = false;
      setReadStage(0);
      return;
    }
    if (pdf) onCreateFromPdf(draft);
    else onCreateBlank(draft);
  };

  const reading = readStage >= 0;

  const dialog = (
      <div
        className={`mp-dialog${embedded ? ' is-embedded' : ''}`}
        role="dialog"
        aria-labelledby="mp-create-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mp-dialog-head">
          <div>
            <h2 id="mp-create-title">Create New Document</h2>
          </div>
          {embedded ? null : (
            <button type="button" className="mp-dialog-x" aria-label="Close" onClick={onClose} disabled={working || reading}>
              <X size={18} />
            </button>
          )}
        </div>
        <div className="mp-dialog-body">
          {reading ? (
            <div className="inf-reading">
              <p>{pdf?.name || inferPayload.current?.cadName}</p>
              <ol>
                {stageList.current.map((line, index) => (
                  <li key={line} className={index < readStage ? 'is-done' : index === readStage ? 'is-now' : ''}>{line}</li>
                ))}
              </ol>
            </div>
          ) : working ? (
            <>
              <p style={{ marginTop: 4, color: '#111827', fontWeight: 600 }}>{creator.fileName}</p>
              <p style={{ marginTop: 4 }}>
                {creator.page ? `Reading page ${creator.page} of ${creator.pageCount}` : 'Opening PDF…'}
              </p>
              <div className="mp-progress" aria-hidden>
                <div style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : (
            <>
              {onCreateInfer || hasLibrary ? <div className="mp-details-title">Document Details</div> : null}
              <label className="mp-field" htmlFor="mp-doc-name">
                Name
                <input
                  id="mp-doc-name"
                  className="mp-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Type name"
                />
              </label>
              <label className="mp-field" htmlFor="mp-doc-template">
                Template
                <select
                  id="mp-doc-template"
                  className="mp-input"
                  value={templateId}
                  onChange={(event) => setTemplateId(event.target.value)}
                >
                  {TEMPLATES.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>

              {onCreateInfer ? (
                <>
                  <div className="mp-section">
                    <div className="mp-section-label">CAD file</div>
                    <div className="mp-cad-choice is-compact">
                      <UploadZone
                        title="Upload new CAD"
                        hint="Click or drag file to this area to upload"
                        accept={CAD_ACCEPT}
                        hot={cadHot}
                        onHot={setCadHot}
                        onFile={takeCad}
                        fileName={cadFile?.name}
                        onRemove={() => setCadFile(null)}
                      />
                      <div className="mp-or">or</div>
                      <div className="mp-link-card">
                        <span className="mp-upload-icon"><Link2 size={18} /></span>
                        <strong>Link existing</strong>
                        <span>Choose from your CAD library</span>
                        <select
                          className="mp-input"
                          aria-label="CAD library"
                          value={linkedId}
                          onChange={(event) => {
                            setLinkedId(event.target.value);
                            setCadFile(null);
                            setLocalError('');
                          }}
                        >
                          <option value="">Drop down</option>
                          {cadLibrary.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="mp-existing">
                      <button
                        type="button"
                        className="mp-expander"
                        aria-expanded={existingOpen}
                        onClick={() => setExistingOpen((open) => !open)}
                      >
                        <ChevronRight size={14} className={existingOpen ? 'is-open' : ''} />
                        <Sparkles size={14} className="mp-expander-magic" aria-hidden />
                        Existing document
                      </button>
                      {existingOpen ? (
                        <div className="mp-existing-body">
                          <UploadZone
                            title={{
                              work_instruction: 'Upload work instruction',
                              quality_checklist: 'Upload quality checklist',
                              drawing_release: 'Upload drawing package',
                            }[templateId] || 'Upload document'}
                            hint="Click or drag a PDF to this area"
                            accept="application/pdf,.pdf"
                            hot={pdfHot}
                            onHot={setPdfHot}
                            onFile={(file) => {
                              takePdf(file);
                              if (file && isPdf(file)) setPrompt(promptForTemplate(templateId));
                            }}
                            fileName={pdf?.name}
                            onRemove={() => { setPdf(null); setLocalError(''); }}
                          />
                          <label className="mp-prompt" htmlFor="mp-premade-prompt">
                            Prompt
                            <textarea
                              id="mp-premade-prompt"
                              className="mp-input"
                              value={prompt}
                              onChange={(event) => setPrompt(event.target.value)}
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                </>
              ) : hasLibrary ? (
                <>
                  <label className="mp-field">
                    PDF
                    <span
                      className={`mp-pdf-line${pdfHot ? ' is-hot' : ''}`}
                      onDragOver={(event) => { event.preventDefault(); setPdfHot(true); }}
                      onDragLeave={() => setPdfHot(false)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setPdfHot(false);
                        takePdf(event.dataTransfer.files?.[0]);
                      }}
                    >
                      {pdf ? (
                        <FileChip name={pdf.name} onRemove={() => { setPdf(null); setLocalError(''); }} />
                      ) : (
                        <label>
                          Click or drag a PDF to upload
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            onChange={(event) => {
                              takePdf(event.target.files?.[0]);
                              event.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </span>
                  </label>
                  {pdf ? (
                    <ParseRow
                      options={options}
                      onToggle={(id) => setOptions((prev) => ({ ...prev, [id]: !prev[id] }))}
                    />
                  ) : null}
                  <div className="mp-section">
                    <div className="mp-section-label">CAD file</div>
                    <div className="mp-cad-choice">
                      <UploadZone
                        title="Upload new CAD"
                        hint="Click or drag file to this area to upload"
                        accept={CAD_ACCEPT}
                        hot={cadHot}
                        onHot={setCadHot}
                        onFile={takeCad}
                        fileName={cadFile?.name}
                        onRemove={() => setCadFile(null)}
                      />
                      <div className="mp-or">or</div>
                      <div className="mp-link-card">
                        <span className="mp-upload-icon"><Link2 size={18} /></span>
                        <strong>Link existing</strong>
                        <span>Choose from your CAD library</span>
                        <select
                          className="mp-input"
                          aria-label="CAD library"
                          value={linkedId}
                          onChange={(event) => {
                            setLinkedId(event.target.value);
                            setCadFile(null);
                            setLocalError('');
                          }}
                        >
                          <option value="">Drop down</option>
                          {cadLibrary.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mp-pair-wrap">
                  <div className="mp-pair">
                    <div>
                      <div className="mp-section-label">Start from PDF</div>
                      <UploadZone
                        title="Upload PDF"
                        hint="Click or drag a PDF to this area"
                        accept="application/pdf,.pdf"
                        hot={pdfHot}
                        onHot={setPdfHot}
                        onFile={takePdf}
                        fileName={pdf?.name}
                        onRemove={() => { setPdf(null); setLocalError(''); }}
                      />
                    </div>
                    <div>
                      <div className="mp-section-label">CAD file</div>
                      <UploadZone
                        title="Upload new CAD"
                        hint="Click or drag STEP to this area to upload"
                        accept={CAD_ACCEPT}
                        hot={cadHot}
                        onHot={setCadHot}
                        onFile={takeCad}
                        fileName={cadFile?.name}
                        onRemove={() => setCadFile(null)}
                      />
                    </div>
                  </div>
                  {pdf ? (
                    <ParseRow
                      options={options}
                      onToggle={(id) => setOptions((prev) => ({ ...prev, [id]: !prev[id] }))}
                    />
                  ) : null}
                </div>
              )}
              {localError || creator?.message ? <div className="mp-error" role="alert">{localError || creator.message}</div> : null}
            </>
          )}
        </div>
        {!working && !reading ? (
          <div className="mp-dialog-actions">
            <button
              type="button"
              className="mp-btn-create"
              onClick={create}
            >
              Create Document
            </button>
          </div>
        ) : null}
      </div>
  );

  if (embedded) return <div className="inf-intake">{dialog}</div>;
  return (
    <div className="mp-overlay" role="presentation">
      {dialog}
    </div>
  );
}
