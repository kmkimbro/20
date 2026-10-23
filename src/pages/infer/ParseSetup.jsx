import { useRef, useState } from 'react';
import {
  Camera, Check, ClipboardList, File, Hexagon, Layers, MessageSquare, PenLine, Sparkles, Table, Type,
} from 'lucide-react';
import './reference-flow.css';

const DOC_TYPES = [
  { id: 'work_instruction', label: 'Work instruction', detail: 'Operations, notes, images, and parts.', icon: ClipboardList },
  { id: 'quality_checklist', label: 'Quality checklist', detail: 'Checks, notes, images, and results.', icon: Check },
  { id: 'drawing_release', label: 'Drawing package', detail: 'Sheets, views, annotations, and parts.', icon: PenLine },
  { id: 'blank', label: 'Blank document', detail: 'Start empty and add the content yourself.', icon: File },
  { id: 'auto_assembly', label: 'Auto Assembly', detail: 'We will generate preliminary operations for you.', icon: Layers },
];

const EXTRACT = [
  { id: 'Images', label: 'Images', detail: 'Pictures from the model.', icon: Camera },
  { id: 'Tables', label: 'Tables', detail: 'Rows of parts and data.', icon: Table },
  { id: 'Text', label: 'Text', detail: 'Notes and descriptions.', icon: Type },
  { id: 'Callouts', label: 'Callouts', detail: 'Labels on the model.', icon: MessageSquare },
  { id: 'Parts', label: 'Parts', detail: 'Components in the assembly.', icon: Hexagon },
];

function isPdf(file) {
  return Boolean(file) && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
}

export default function ParseSetup({ onDone, embedded = false }) {
  const fileRef = useRef(null);
  const [step, setStep] = useState('type');
  const [docType, setDocType] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [picks, setPicks] = useState(['Images', 'Tables', 'Text']);

  const title = step === 'extract'
    ? 'What do you want to extract from this?'
    : 'What kind of document do you want to create?';

  const takeFile = (file) => {
    if (!isPdf(file)) return;
    setPdf(file);
    setStep('extract');
  };

  const finish = () => onDone({
    templateId: docType || 'work_instruction',
    picks: step === 'extract' ? picks : [],
    prompt: step === 'extract' ? 'Existing document' : (docType === 'auto_assembly' ? 'Auto Assembly' : 'New document'),
    sourceName: step === 'extract' && pdf ? pdf.name : '',
  });

  const form = (
    <>
      {embedded ? <h2 className="rf-title">{title}</h2> : null}
      {step === 'extract' ? (
        <>
          <p className="rf-lead">{pdf?.name}</p>
          <div className="rf-choices">
            {EXTRACT.map((item) => (
              <button
                key={item.id}
                type="button"
                className={picks.includes(item.id) ? 'is-on' : ''}
                aria-pressed={picks.includes(item.id)}
                onClick={() => setPicks((current) => (
                  current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]
                ))}
              >
                <TileIcon icon={item.icon} />
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="rf-choices">
          {DOC_TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={docType === item.id ? 'is-on' : ''}
              aria-pressed={docType === item.id}
              onClick={() => setDocType(item.id)}
            >
              <TileIcon icon={item.icon} />
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </button>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()}>
            <TileIcon icon={Sparkles} magic />
            <strong>Import</strong>
            <span>Upload your own document and make a Quarter20 document.</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              takeFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
      )}
    </>
  );

  const actions = (
    <div className="rf-actions">
      {step === 'extract' ? (
        <button type="button" className="rf-back" onClick={() => setStep('type')}>Back</button>
      ) : <span />}
      <button type="button" className="rf-next" disabled={step === 'type' && !docType} onClick={finish}>
        Done
      </button>
    </div>
  );

  if (embedded) {
    return (
      <div className="rf-embedded">
        {form}
        {actions}
      </div>
    );
  }

  return (
    <div className="mp-overlay lb-parse-modal" role="presentation">
      <div className="mp-dialog rf-dialog" role="dialog" aria-modal="true" aria-labelledby="lb-parse-ask-title">
        <div className="mp-dialog-head">
          <h2 id="lb-parse-ask-title">{title}</h2>
        </div>
        <div className="mp-dialog-body">{form}</div>
        {actions}
      </div>
    </div>
  );
}

function TileIcon({ icon: Icon, magic = false }) {
  return (
    <span className={`rf-tile-icon${magic ? ' is-magic' : ''}`} aria-hidden="true">
      <Icon size={16} />
    </span>
  );
}
