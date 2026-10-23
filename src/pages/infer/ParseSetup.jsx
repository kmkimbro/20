import { useEffect, useRef, useState } from 'react';
import {
  Camera, Check, ChevronLeft, ClipboardList, File, Hexagon, Layers, ListOrdered, MessageSquare, PenLine, Sparkles, Table, Type,
} from 'lucide-react';
import AssemblyPlanModal from '../magicParser/AssemblyPlanModal.jsx';
import './reference-flow.css';

const DOC_TYPES = [
  { id: 'work_instruction', label: 'Work instruction', detail: 'Operations, notes, images, and parts.', icon: ClipboardList },
  { id: 'quality_checklist', label: 'Quality checklist', detail: 'Checks, notes, images, and results.', icon: Check },
  { id: 'drawing_release', label: 'Drawing package', detail: 'Sheets, views, annotations, and parts.', icon: PenLine },
  { id: 'blank', label: 'Blank document', detail: 'Start empty and add the content yourself.', icon: File },
  { id: 'auto_assembly', label: 'Auto Assembly', detail: 'We will generate preliminary operations for you.', icon: Layers },
  { id: 'import', label: 'Import', detail: 'Upload your own document and make a Quarter20 document.', icon: Sparkles, magic: true },
];

const EXTRACT = [
  { id: 'Operations', label: 'Operations', detail: 'Steps from the document.', icon: ListOrdered },
  { id: 'Images', label: 'Images', detail: 'Pictures from the model.', icon: Camera },
  { id: 'Tables', label: 'Tables', detail: 'Rows of parts and data.', icon: Table },
  { id: 'Text', label: 'Text', detail: 'Notes and descriptions.', icon: Type },
  { id: 'Callouts', label: 'Callouts', detail: 'Labels on the model.', icon: MessageSquare },
  { id: 'Parts', label: 'Parts', detail: 'Components in the assembly.', icon: Hexagon },
];

export default function ParseSetup({ onDone, embedded = false }) {
  const [step, setStep] = useState('type');
  const [docType, setDocType] = useState(null);
  const [picks, setPicks] = useState([]);
  const [planOpen, setPlanOpen] = useState(false);

  const title = step === 'extract'
    ? 'What do you want to import?'
    : 'What kind of document do you want to create?';

  const chooseType = (id) => {
    setDocType(id);
    if (id === 'import') setStep('extract');
    if (id === 'auto_assembly') setPlanOpen(true);
  };

  const finish = (plan) => onDone({
    templateId: docType === 'import' ? 'work_instruction' : (docType || 'work_instruction'),
    picks: step === 'extract' ? picks : [],
    prompt: step === 'extract' ? 'Existing document' : (docType === 'auto_assembly' ? 'Auto Assembly' : 'New document'),
    sourceName: '',
    planSteps: plan?.planSteps,
    planScope: plan?.planScope,
  });

  const next = () => {
    if (step === 'type' && docType === 'import') {
      setStep('extract');
      return;
    }
    if (step === 'type' && docType === 'auto_assembly') {
      setPlanOpen(true);
      return;
    }
    finish();
  };

  const acceptPlan = (steps, scope) => {
    finish({
      planSteps: steps.filter((item) => item.checked),
      planScope: scope,
    });
  };

  const form = (
    <>
      {embedded ? (
        <TitleRow title={title} onBack={step === 'extract' ? () => setStep('type') : null} />
      ) : null}
      {step === 'extract' ? (
        <>
          <p className="rf-lead">Select elements of the document that you want to convert to a Quarter20 document.</p>
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
          <SelectAll
            checked={picks.length === EXTRACT.length}
            indeterminate={picks.length > 0 && picks.length < EXTRACT.length}
            onChange={() => setPicks((current) => (
              current.length === EXTRACT.length ? [] : EXTRACT.map((item) => item.id)
            ))}
          />
        </>
      ) : (
        <div className="rf-choices">
          {DOC_TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={docType === item.id ? 'is-on' : ''}
              aria-pressed={docType === item.id}
              onClick={() => chooseType(item.id)}
            >
              <TileIcon icon={item.icon} magic={item.magic} />
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );

  const actions = (
    <div className="rf-actions">
      <span />
      <button type="button" className="rf-next" disabled={step === 'type' && !docType} onClick={next}>
        Done
      </button>
    </div>
  );

  const plan = planOpen ? (
    <AssemblyPlanModal onClose={() => setPlanOpen(false)} onAccept={acceptPlan} />
  ) : null;

  if (planOpen && !embedded) return plan;

  if (embedded) {
    return (
      <div className="rf-embedded">
        {form}
        {actions}
        {plan}
      </div>
    );
  }

  return (
    <div className="mp-overlay lb-parse-modal" role="presentation">
      <div className="mp-dialog rf-dialog" role="dialog" aria-modal="true" aria-labelledby="lb-parse-ask-title">
        <div className="mp-dialog-head">
          <TitleRow id="lb-parse-ask-title" title={title} onBack={step === 'extract' ? () => setStep('type') : null} />
        </div>
        <div className="mp-dialog-body">{form}</div>
        {actions}
      </div>
    </div>
  );
}

function TitleRow({ title, onBack, id }) {
  return (
    <div className="rf-title-row">
      {onBack ? (
        <button type="button" className="rf-title-back" aria-label="Back" onClick={onBack}>
          <ChevronLeft size={18} />
        </button>
      ) : null}
      <h2 id={id} className={id ? undefined : 'rf-title'}>{title}</h2>
    </div>
  );
}

function SelectAll({ checked, indeterminate, onChange }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className="rf-select-all">
      <input ref={inputRef} type="checkbox" checked={checked} onChange={onChange} />
      Select all
    </label>
  );
}

function TileIcon({ icon: Icon, magic = false }) {
  return (
    <span className={`rf-tile-icon${magic ? ' is-magic' : ''}`} aria-hidden="true">
      <Icon size={16} />
    </span>
  );
}
