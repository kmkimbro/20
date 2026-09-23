import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Plus, Minus, ChevronLeft, Calendar, Hash, Type, User, Image as ImageIcon, Check, FileText, Upload,
} from 'lucide-react';
import {
  C, cloneLayout, emptyLayout, tokenLabel, uid, DATE_FORMATS, PAGE_FORMATS, formatDate, REF_DATE,
} from './model.js';
import { placePop } from './shared.jsx';

const PLACEHOLDER_BUILTINS = [
  { id: 'date', label: 'Date', Icon: Calendar, mode: 'date' },
  { id: 'page', label: 'Page', Icon: Hash, mode: 'page' },
  { id: 'docname', label: 'Document name', Icon: Type, mode: 'docname' },
  { id: 'revision', label: 'Revision', Icon: FileText, mode: 'ph' },
  { id: 'lot', label: 'Lot Number', Icon: Hash, mode: 'ph' },
  { id: 'logo', label: 'Logo', Icon: ImageIcon, mode: 'logo' },
];

function PopItem({ icon, label, sub, active, onClick }) {
  return (
    <button type="button" className={`lb-pop-item${active ? ' is-active' : ''}`} onClick={onClick}>
      {icon}
      <span>
        <span className="label">{label}</span>
        {sub ? <span className="muted">{sub}</span> : null}
      </span>
      {active ? <Check size={14} className="lb-pop-check" /> : null}
    </button>
  );
}

export function CellPicker({
  anchorEl,
  current,
  savedConsts,
  savedPlaceholders,
  onPick,
  onCreatePlaceholder,
  onCreateConst,
  onCreateLogo,
  onClose,
}) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const [view, setView] = useState('root');
  const [phName, setPhName] = useState('');
  const [phDefault, setPhDefault] = useState('');
  const [phSave, setPhSave] = useState(true);
  const [phImage, setPhImage] = useState(null);
  const [phImageName, setPhImageName] = useState('');
  const [docName, setDocName] = useState('');

  const pos = useMemo(() => placePop(anchorEl), [anchorEl]);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !anchorEl?.contains?.(e.target)) onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchorEl, onClose]);

  const pickDate = (format) => {
    onPick({ type: 'builtin', id: 'date', format });
  };
  const pickPage = (format) => {
    onPick({ type: 'builtin', id: 'page', format });
  };

  return (
    <div
      ref={ref}
      className={`lb-pop${view === 'customPh' || view === 'docname' ? ' is-form' : ''}`}
      style={{
        top: pos.top,
        left: pos.left,
        maxHeight: `calc(100vh - ${pos.top + 8}px)`,
      }}
      role="menu"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {view === 'root' && (
        <>
          <div className="lb-pop-title">Add variable</div>
          <div className="lb-pop-section">Placeholders</div>
          {PLACEHOLDER_BUILTINS.map((item) => {
            const Icon = item.Icon;
            return (
              <PopItem
                key={item.id}
                icon={<Icon size={14} color={C.sub} />}
                label={item.label}
                onClick={() => {
                  if (item.mode === 'date') setView('date');
                  else if (item.mode === 'page') setView('page');
                  else if (item.mode === 'docname') setView('docname');
                  else if (item.mode === 'logo') {
                    onPick({ type: 'placeholder', id: 'logo', label: 'Logo', isImage: true });
                  } else {
                    onPick({ type: 'placeholder', id: item.id, label: item.label });
                  }
                }}
              />
            );
          })}
          <div className="lb-pop-section">Custom</div>
          {savedPlaceholders.filter((p) => !['revision', 'lot', 'logo', 'docname'].includes(p.id)).map((p) => (
            <PopItem
              key={p.id}
              icon={<FileText size={14} color={C.sub} />}
              label={p.label}
              sub={p.defaultVal || (p.isImage ? 'Image' : null)}
              onClick={() => onPick({
                type: 'placeholder',
                id: p.id,
                label: p.label,
                defaultVal: p.defaultVal,
                isImage: p.isImage,
                savedValues: p.savedValues,
              })}
            />
          ))}
          <PopItem
            icon={<User size={14} color={C.sub} />}
            label="Author"
            sub="Jane Smith"
            onClick={() => onPick({ type: 'builtin', id: 'author' })}
          />
          {savedConsts.map((c) => (
            <PopItem
              key={c.id}
              icon={<Type size={14} color={C.sub} />}
              label={c.label}
              sub={c.text}
              onClick={() => onPick({ type: 'text', text: c.text })}
            />
          ))}
          <button type="button" className="lb-pop-item" onClick={() => setView('customPh')} style={{ color: C.blue }}>
            <Plus size={14} />
            <span className="label">Custom placeholder…</span>
          </button>
        </>
      )}

      {view === 'date' && (
        <>
          <button type="button" className="lb-pop-back" onClick={() => setView('root')}>
            <ChevronLeft size={14} /> Date format
          </button>
          {DATE_FORMATS.map((f) => (
            <PopItem
              key={f.id}
              label={formatDate(REF_DATE, f.id)}
              active={current?.type === 'builtin' && current.id === 'date' && current.format === f.id}
              onClick={() => pickDate(f.id)}
            />
          ))}
        </>
      )}

      {view === 'page' && (
        <>
          <button type="button" className="lb-pop-back" onClick={() => setView('root')}>
            <ChevronLeft size={14} /> Page format
          </button>
          {PAGE_FORMATS.map((f) => (
            <PopItem
              key={f.id}
              label={f.preview}
              active={current?.type === 'builtin' && current.id === 'page' && current.format === f.id}
              onClick={() => pickPage(f.id)}
            />
          ))}
        </>
      )}

      {view === 'docname' && (
        <div className="lb-form">
          <button type="button" className="lb-pop-back" onClick={() => setView('root')}>
            <ChevronLeft size={14} /> Document name
          </button>
          <div className="lb-field">
            <label htmlFor="lb-docname">Default name</label>
            <input
              id="lb-docname"
              className="lb-input"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Test Document 1"
            />
          </div>
          <button
            type="button"
            className="lb-btn-primary"
            style={{ width: '100%' }}
            onClick={() => onPick({
              type: 'placeholder',
              id: 'docname',
              label: 'Document name',
              defaultVal: docName.trim() || undefined,
            })}
          >
            Insert
          </button>
        </div>
      )}

      {view === 'customPh' && (
        <div className="lb-form">
          <button type="button" className="lb-pop-back" onClick={() => setView('root')}>
            <ChevronLeft size={14} /> Custom placeholder
          </button>
          <div className="lb-field">
            <label htmlFor="lb-ph-name">Name</label>
            <input id="lb-ph-name" className="lb-input" value={phName} onChange={(e) => setPhName(e.target.value)} placeholder="Variable name" />
          </div>
          <div className="lb-field">
            <label htmlFor="lb-ph-def">Default value (optional)</label>
            <input id="lb-ph-def" className="lb-input" value={phDefault} onChange={(e) => setPhDefault(e.target.value)} placeholder="Value or text" />
          </div>
          <div className="lb-field">
            <label>Upload image</label>
            <button
              type="button"
              className="lb-dropzone"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith('image/')) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    setPhImage(String(reader.result));
                    setPhImageName(file.name);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            >
              {phImage ? (
                <>
                  <img src={phImage} alt="" className="lb-dropzone-preview" />
                  <div>{phImageName || 'Image selected'}</div>
                </>
              ) : (
                <>
                  <Upload size={22} />
                  <div>Click or drag a file to upload</div>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setPhImage(String(reader.result));
                  setPhImageName(file.name);
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>
          <label className="lb-check">
            <input type="checkbox" checked={phSave} onChange={(e) => setPhSave(e.target.checked)} />
            Save to library
          </label>
          <button
            type="button"
            className="lb-btn-primary"
            style={{ width: '100%', marginTop: 12 }}
            disabled={!phName.trim() && !phImage}
            onClick={() => {
              if (phImage) {
                onCreateLogo?.(phImage);
                onPick({ type: 'placeholder', id: 'logo', label: phName.trim() || 'Logo', isImage: true });
                return;
              }
              const token = {
                type: 'placeholder',
                id: uid('ph'),
                label: phName.trim(),
                defaultVal: phDefault.trim() || undefined,
              };
              onCreatePlaceholder(token, phSave);
              onPick(token);
            }}
          >
            Create variable
          </button>
        </div>
      )}
    </div>
  );
}

export default function LayoutEditor({
  initial,
  presetType = '',
  savedConsts,
  savedPlaceholders,
  onSave,
  onCreatePlaceholder,
  onCreateConst,
  onCreateLogo,
  onClose,
}) {
  const [draft, setDraft] = useState(() => (
    initial ? cloneLayout(initial) : emptyLayout(presetType)
  ));
  const [picker, setPicker] = useState(null);

  const setCell = (ri, ci, token) => {
    setDraft((prev) => {
      const rows = prev.rows.map((row, i) => (
        i === ri ? row.map((cell, j) => (j === ci ? token : cell)) : row
      ));
      return { ...prev, rows };
    });
  };

  const addCell = (ri) => {
    setDraft((prev) => {
      const rows = prev.rows.map((row, i) => (i === ri ? [...row, null] : row));
      return { ...prev, rows };
    });
  };

  const removeCell = (ri) => {
    setDraft((prev) => {
      const rows = prev.rows.map((row, i) => {
        if (i !== ri || row.length <= 1) return row;
        return row.slice(0, -1);
      });
      return { ...prev, rows };
    });
  };

  const addRow = () => {
    setDraft((prev) => ({ ...prev, rows: [...prev.rows, [null]] }));
  };

  const removeRow = (ri) => {
    setDraft((prev) => {
      if (prev.rows.length <= 1) return prev;
      return { ...prev, rows: prev.rows.filter((_, i) => i !== ri) };
    });
  };

  return (
    <div className="lb-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} role="presentation">
      <div
        className="lb-modal"
        role="dialog"
        aria-label={initial ? 'Edit layout' : 'Create New Layout'}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="lb-modal-head">
          <h2>{initial ? 'Edit Layout' : 'Create New Layout'}</h2>
          <button type="button" className="lb-icon-btn" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="lb-modal-body">
          <div className="lb-field">
            <label htmlFor="lb-lay-name">Name</label>
            <input
              id="lb-lay-name"
              className="lb-input"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div className="lb-field">
            <label htmlFor="lb-lay-type">Type</label>
            <select
              id="lb-lay-type"
              className="lb-select"
              value={draft.type || ''}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
            >
              <option value="header">Header</option>
              <option value="footer">Footer</option>
              <option value="">Unassigned</option>
            </select>
          </div>
          <div className="lb-field">
            <label>Rows &amp; Columns</label>
            <div className="lb-editor-grid">
              {draft.rows.map((row, ri) => (
                <div key={ri} className="lb-editor-row">
                  <div
                    className="lb-editor-cells"
                    style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}
                  >
                    {row.map((cell, ci) => (
                      <button
                        key={ci}
                        type="button"
                        className={`lb-editor-cell${cell ? ' has-token' : ''}`}
                        onClick={(e) => setPicker({ ri, ci, el: e.currentTarget })}
                      >
                        {cell ? tokenLabel(cell) : 'Add Content'}
                      </button>
                    ))}
                  </div>
                  <div className="lb-row-ctrls">
                    <button type="button" aria-label="Add cell" onClick={() => addCell(ri)}>
                      <Plus size={14} />
                    </button>
                    <button type="button" aria-label="Remove cell" onClick={() => removeCell(ri)}>
                      <Minus size={14} />
                    </button>
                    <button type="button" aria-label="Remove row" onClick={() => removeRow(ri)}>
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className="lb-add-row" aria-label="Add row" onClick={addRow}>
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
        <div className="lb-modal-foot">
          <button
            type="button"
            className="lb-btn-primary"
            onClick={() => onSave({ ...draft, name: draft.name.trim() || 'Untitled Layout' })}
          >
            Save Layout
          </button>
        </div>
      </div>
      {picker && (
        <CellPicker
          anchorEl={picker.el}
          current={draft.rows[picker.ri][picker.ci]}
          savedConsts={savedConsts}
          savedPlaceholders={savedPlaceholders}
          onPick={(token) => {
            setCell(picker.ri, picker.ci, token);
            setPicker(null);
          }}
          onCreatePlaceholder={(token, save) => {
            if (save) onCreatePlaceholder?.(token);
          }}
          onCreateConst={(c) => onCreateConst?.(c)}
          onCreateLogo={(src) => onCreateLogo?.(src)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
