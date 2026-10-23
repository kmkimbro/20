import { useState } from 'react';
import './reference-flow.css';

const DOC_TYPES = [
  { id: 'work_instruction', label: 'Work instruction', detail: 'Operations, notes, images, and parts.' },
  { id: 'quality_checklist', label: 'Quality checklist', detail: 'Checks, notes, images, and results.' },
  { id: 'drawing_release', label: 'Drawing package', detail: 'Sheets, views, annotations, and parts.' },
  { id: 'blank', label: 'Blank document', detail: 'Start empty and add the content yourself.' },
];

const AI_UPLOADS = ['Images', 'Tables', 'Text', 'Callouts', 'Parts'];

export default function ParseSetup({ onDone }) {
  const [docType, setDocType] = useState('work_instruction');
  const [source, setSource] = useState(null);
  const [picks, setPicks] = useState(['Images', 'Tables', 'Text']);

  return (
    <div className="mp-overlay lb-parse-modal" role="presentation">
      <div className="mp-dialog rf-dialog" role="dialog" aria-modal="true" aria-labelledby="lb-parse-ask-title">
        <div className="mp-dialog-head">
          <h2 id="lb-parse-ask-title">What type of document do you want?</h2>
        </div>
        <div className="mp-dialog-body">
          <ChoiceGrid value={docType} onChange={setDocType} items={DOC_TYPES} />
          <h3 className="rf-ask">Existing document or new document?</h3>
          <div className="rf-choices">
            <button
              type="button"
              className={source === 'existing' ? 'is-on' : ''}
              aria-pressed={source === 'existing'}
              onClick={() => setSource('existing')}
            >
              <strong>Existing document</strong>
              <span>Use a document you already have.</span>
            </button>
            <button
              type="button"
              className={source === 'new' ? 'is-on' : ''}
              aria-pressed={source === 'new'}
              onClick={() => setSource('new')}
            >
              <strong>New document</strong>
              <span>Build it from the CAD.</span>
            </button>
          </div>
          {source === 'existing' ? (
            <>
              <h3 className="rf-ask">What do you want it to extract?</h3>
              <div className="mp-parse-chips">
                {AI_UPLOADS.map((label) => (
                  <button
                    key={label}
                    type="button"
                    className={picks.includes(label) ? 'is-on' : ''}
                    aria-pressed={picks.includes(label)}
                    onClick={() => setPicks((current) => (
                      current.includes(label) ? current.filter((item) => item !== label) : [...current, label]
                    ))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
        <div className="mp-dialog-actions">
          <button
            type="button"
            className="mp-btn-create"
            disabled={!source}
            onClick={() => onDone({
              templateId: docType,
              picks: source === 'existing' ? picks : [],
              prompt: source === 'existing' ? 'Existing document' : 'New document',
            })}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ChoiceGrid({ items, value, onChange }) {
  return (
    <div className="rf-choices">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={value === item.id ? 'is-on' : ''}
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
        >
          <strong>{item.label}</strong>
          <span>{item.detail}</span>
        </button>
      ))}
    </div>
  );
}
