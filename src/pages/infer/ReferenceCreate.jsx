import { useState } from 'react';
import { Link2, Paperclip, Upload, X } from 'lucide-react';
import { sampleForFile } from './samples.js';
import './reference-flow.css';

function isCad(file) {
  return Boolean(file) && /\.(step|stp|iges|igs|stl|obj)(\.gz)?$/i.test(file.name);
}

const SAMPLE_CAD = 'weldment_frame.step';

function bareName(fileName) {
  return fileName.replace(/\.(step|stp|iges|igs|stl|obj)(\.gz)?$/i, '');
}

export default function ReferenceCreate({ creator, onClose, onCreate, presetCad = '', embedded = false, cadLibrary = [] }) {
  const [cadFile, setCadFile] = useState(null);
  const [linkedId, setLinkedId] = useState('');
  const [cadHot, setCadHot] = useState(false);
  const [name, setName] = useState('');

  if (!creator) return null;

  const linked = cadLibrary.find((item) => item.id === linkedId);
  const cadName = cadFile?.name || linked?.name || presetCad || SAMPLE_CAD;

  const takeCad = (file) => {
    if (!file || !isCad(file)) return;
    setCadFile(file);
    setLinkedId('');
    setName((current) => current || bareName(file.name));
  };

  const create = () => {
    onCreate({
      sampleId: sampleForFile(cadName),
      title: name.trim() || bareName(cadName) || 'Untitled Document',
      sourceName: '',
      cadName,
      origin: 'cad',
      templateId: 'work_instruction',
      adjustments: { pictures: true, table: true, callouts: true, note: '' },
    });
  };

  const body = presetCad ? null : (
    <div className="mp-section">
      <div className="mp-section-label">CAD file</div>
      <div className="mp-cad-choice is-compact">
        <div
          className={`mp-upload-card${cadHot ? ' is-hot' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setCadHot(true); }}
          onDragLeave={() => setCadHot(false)}
          onDrop={(event) => {
            event.preventDefault();
            setCadHot(false);
            takeCad(event.dataTransfer.files?.[0]);
          }}
        >
          <label>
            <span className="mp-upload-icon"><Upload size={18} /></span>
            <strong>Upload new CAD</strong>
            <span>Click or drag file to this area to upload</span>
            <input
              type="file"
              accept=".step,.stp,.iges,.igs,.stl,.obj,.gz"
              onChange={(event) => {
                takeCad(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
          {cadFile ? (
            <button type="button" className="mp-file-chip" onClick={() => setCadFile(null)}>
              <Paperclip size={14} />
              <span>{cadFile.name}</span>
            </button>
          ) : null}
        </div>
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
              const nextId = event.target.value;
              setLinkedId(nextId);
              setCadFile(null);
              const item = cadLibrary.find((entry) => entry.id === nextId);
              if (item) setName((current) => current || bareName(item.name));
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
  );

  const actions = (
    <div className="rf-actions">
      <span />
      <button type="button" className="rf-next" onClick={create}>
        Create Document
      </button>
    </div>
  );

  if (embedded) {
    return (
      <div className="rf-embedded">
        {body}
        {actions}
      </div>
    );
  }

  return (
    <div className="mp-overlay" role="presentation">
      <div className="mp-dialog rf-dialog" role="dialog" aria-modal="true" aria-labelledby="rf-create-title">
        <div className="mp-dialog-head">
          <h2 id="rf-create-title">Create New Document</h2>
          <button type="button" className="mp-dialog-x" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="mp-dialog-body">{body}</div>
        {actions}
      </div>
    </div>
  );
}
