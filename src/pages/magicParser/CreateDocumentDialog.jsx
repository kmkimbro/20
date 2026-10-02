import { useEffect, useState } from 'react';
import { Link2, Paperclip, Upload, X } from 'lucide-react';

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
const CAD_ACCEPT = '.step,.stp,.iges,.igs,.stl,.obj';

function isPdf(file) {
  return Boolean(file) && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
}

function isCad(file) {
  return Boolean(file) && /\.(step|stp|iges|igs|stl|obj)$/i.test(file.name);
}

function FileChip({ name, onRemove }) {
  return (
    <button type="button" className="mp-file-chip" onClick={onRemove}>
      <Paperclip size={14} />
      <span>{name}</span>
    </button>
  );
}

function UploadZone({ title, hint, accept, hot, onHot, onFile, icon, fileName, onRemove, children }) {
  return (
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
      {fileName ? <FileChip name={fileName} onRemove={onRemove} /> : null}
      {children}
    </div>
  );
}

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

export default function CreateDocumentDialog({ creator, cadLibrary = [], onClose, onCreateBlank, onCreateFromPdf }) {
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('work_instruction');
  const [pdf, setPdf] = useState(null);
  const [cadFile, setCadFile] = useState(null);
  const [linkedId, setLinkedId] = useState('');
  const [pdfHot, setPdfHot] = useState(false);
  const [cadHot, setCadHot] = useState(false);
  const [options, setOptions] = useState(ALL_ON);
  const [localError, setLocalError] = useState('');

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
  }, [creator]);

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
      name: name.trim() || pdf?.name.replace(/\.pdf$/i, '') || 'Untitled Document',
      templateId,
      file: pdf,
      options,
      cadName,
      cadLinked: Boolean(cadName),
      cadSource: cadFile ? 'upload' : (linked ? 'library' : null),
    };
    if (pdf) onCreateFromPdf(draft);
    else onCreateBlank(draft);
  };

  return (
    <div className="mp-overlay" role="presentation">
      <div
        className="mp-dialog is-wide"
        role="dialog"
        aria-labelledby="mp-create-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mp-dialog-head">
          <h2 id="mp-create-title">Create New Document</h2>
          <button type="button" className="mp-dialog-x" aria-label="Close" onClick={onClose} disabled={working}>
            <X size={18} />
          </button>
        </div>
        <div className="mp-dialog-body">
          {working ? (
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
              {hasLibrary ? <div className="mp-details-title">Document Details</div> : null}
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

              {hasLibrary ? (
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
                      <FileChip name={pdf.name} onRemove={() => setPdf(null)} />
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
              ) : null}
              {hasLibrary && pdf ? (
                <ParseRow
                  options={options}
                  onToggle={(id) => setOptions((prev) => ({ ...prev, [id]: !prev[id] }))}
                />
              ) : null}

              {hasLibrary ? (
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
                        onRemove={() => setPdf(null)}
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
              {localError || creator.message ? <div className="mp-error">{localError || creator.message}</div> : null}
            </>
          )}
        </div>
        {!working ? (
          <div className="mp-dialog-actions">
            <button type="button" className="mp-btn-create" onClick={create}>Create Document</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
