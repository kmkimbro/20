import { useEffect, useMemo, useRef, useState } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import {
  X, Plus, Minus, ChevronLeft, ChevronDown, Calendar, Hash, Type, User, Image as ImageIcon, Check, FileText, Upload,
} from 'lucide-react';
import {
  C, AURORA_LOGO, CURRENT_USER, GRID_COLS, cloneLayout, emptyLayout, gridRowCount, itemsToRows, layoutItems, resolveToken,
  tokenLabel, uid, DATE_FORMATS, PAGE_FORMATS, formatDate, REF_DATE,
} from './model.js';
import { placePop } from './shared.jsx';
import 'react-grid-layout/css/styles.css';

const DragGrid = WidthProvider(GridLayout);

const PREVIEW_CTX = {
  date: REF_DATE,
  pageIndex: 1,
  pageCount: 2,
  user: CURRENT_USER,
  docName: 'Test Document 1',
  values: {
    date_format: 'us',
    page_format: 'pageNofM',
    logo: AURORA_LOGO,
    revision: 'Rev C',
    nda: 'Confidential — NDA applies',
  },
};

function cellAlign(item) {
  if (item.x > 0 && item.x + item.w >= GRID_COLS) return 'flex-end';
  if (item.x > 0) return 'center';
  return 'flex-start';
}

function gridPlaceholder(token) {
  if (!token) return 'Add content';
  if (token.type === 'builtin' && token.id === 'page') return 'PAGE';
  if (token.type === 'builtin' && token.id === 'date') return 'DATE';
  if (token.type === 'builtin' && token.id === 'author') return 'AUTHOR';
  if (token.type === 'placeholder' && (token.isImage || token.id === 'logo')) return 'LOGO';
  return token.label || tokenLabel(token) || 'Value';
}

function previewCtxFor(token) {
  const values = { ...PREVIEW_CTX.values };
  if (token?.id === 'page') values.page_format = token.format || values.page_format;
  if (token?.id === 'date') values.date_format = token.format || values.date_format;
  if ((token?.isImage || token?.id === 'logo') && token.src) values[token.id] = token.src;
  return { ...PREVIEW_CTX, values };
}

function previewOf(token) {
  if (!token) return { empty: true, text: 'Add content' };
  const resolved = resolveToken(token, previewCtxFor(token));
  if (resolved.kind === 'image') {
    return {
      image: resolved.filled ? resolved.src : null,
      text: resolved.label || 'Logo',
      unfilled: !resolved.filled,
    };
  }
  if (!resolved.filled) {
    return { text: resolved.label || tokenLabel(token) || 'Add content', unfilled: true };
  }
  return { text: resolved.text, kind: resolved.kind };
}

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
  savedLogos = [],
  onPick,
  onCreatePlaceholder,
  onCreateConst,
  onCreateLogo,
  onClose,
}) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const logoFileRef = useRef(null);
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
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
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
                  else if (item.mode === 'logo') setView('logo');
                  else {
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
              icon={p.isImage ? <ImageIcon size={14} color={C.sub} /> : <FileText size={14} color={C.sub} />}
              label={p.label}
              sub={p.defaultVal || (p.isImage ? 'Image' : null)}
              onClick={() => onPick({
                type: 'placeholder',
                id: p.id,
                label: p.label,
                defaultVal: p.defaultVal,
                isImage: p.isImage,
                src: p.src,
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

      {view === 'logo' && (
        <>
          <button type="button" className="lb-pop-back" onClick={() => setView('root')}>
            <ChevronLeft size={14} /> Logo
          </button>
          {savedLogos.length ? (
            <div className="lb-logo-grid">
              {savedLogos.map((src) => (
                <button
                  key={src.slice(0, 64)}
                  type="button"
                  className={`lb-logo-opt${current?.src === src ? ' is-selected' : ''}`}
                  onClick={() => onPick({ type: 'placeholder', id: 'logo', label: 'Logo', isImage: true, src })}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          ) : null}
          <div className="lb-form">
            <button type="button" className="lb-dropzone" onClick={() => logoFileRef.current?.click()}>
              <Upload size={14} style={{ marginBottom: 4 }} />
              <div>Upload new logo</div>
            </button>
            <input
              ref={logoFileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => onCreateLogo?.(String(reader.result));
                reader.readAsDataURL(file);
              }}
            />
          </div>
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
                const token = {
                  type: 'placeholder',
                  id: uid('ph'),
                  label: phName.trim() || 'Logo',
                  isImage: true,
                  src: phImage,
                };
                onCreateLogo?.(phImage);
                onCreatePlaceholder(token, phSave);
                onPick(token);
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

function GridCanvas({ items, onLayoutChange, onOpen, onClose, onRemove, onAdd, menuOpen }) {
  const press = useRef(null);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const menuOpenRef = useRef(menuOpen);
  onOpenRef.current = onOpen;
  onCloseRef.current = onClose;
  menuOpenRef.current = menuOpen;
  const layout = items.map((item) => ({
    i: item.id,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: 2,
    minH: 1,
  }));

  useEffect(() => {
    const onMove = (e) => {
      const current = press.current;
      if (!current) return;
      if (Math.abs(e.clientX - current.x) > 4 || Math.abs(e.clientY - current.y) > 4) {
        current.moved = true;
      }
    };
    const onUp = () => {
      const current = press.current;
      press.current = null;
      if (!current || current.moved) return;
      if (current.menuWasOpen) onCloseRef.current();
      else onOpenRef.current(current.id, current.el);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  return (
    <div className="lb-rgl-wrap">
      <DragGrid
        className="lb-rgl lb-rgl-band"
        cols={12}
        rowHeight={48}
        margin={[10, 10]}
        containerPadding={[10, 10]}
        layout={layout}
        onLayoutChange={onLayoutChange}
        draggableCancel=".lb-rgl-remove"
        compactType="vertical"
      >
        {items.map((item) => (
          <div key={item.id} className={item.token ? '' : 'is-unfilled'}>
            <button
              type="button"
              className={`lb-editor-cell${item.token ? ' has-token' : ' is-empty'}`}
              style={{ justifyContent: 'center' }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                press.current = {
                  id: item.id,
                  el: e.currentTarget,
                  x: e.clientX,
                  y: e.clientY,
                  moved: false,
                  menuWasOpen: menuOpenRef.current,
                };
              }}
            >
              {gridPlaceholder(item.token)}
            </button>
              <button
                type="button"
                className="lb-rgl-remove"
                aria-label="Remove cell"
                onClick={() => onRemove(item.id)}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <X size={12} />
              </button>
            </div>
        ))}
      </DragGrid>
      <button type="button" className="lb-add-cell" onClick={onAdd}>
        <Plus size={14} />
        Add cell
      </button>
    </div>
  );
}

function PreviewFormatMenu({ kind, current, onSelect, onClose, anchorEl }) {
  const ref = useRef(null);
  const pos = placePop(anchorEl);
  const options = kind === 'date'
    ? DATE_FORMATS.map((f) => ({ id: f.id, label: formatDate(REF_DATE, f.id) }))
    : PAGE_FORMATS.map((f) => ({
      id: f.id,
      label: f.id === 'n' ? '1'
        : f.id === 'nOfM' ? '1 of 2'
          : f.id === 'pageN' ? 'Page 1'
            : 'Page 1 of 2',
    }));

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchorEl, onClose]);

  return (
    <div ref={ref} className="lb-pop" style={{ top: pos.top, left: pos.left, width: 180 }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <div className="lb-pop-section">{kind === 'date' ? 'Date' : 'Page'}</div>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`lb-pop-item${current === option.id ? ' is-active' : ''}`}
          onClick={() => onSelect(option.id)}
        >
          <span className="label">{option.label}</span>
          {current === option.id ? <Check size={14} className="lb-pop-check" /> : null}
        </button>
      ))}
    </div>
  );
}

function PreviewValue({ item, onFormat }) {
  const elRef = useRef(null);
  const [open, setOpen] = useState(false);
  const preview = previewOf(item.token);
  const kind = preview.kind;
  const canFormat = kind === 'page' || kind === 'date';
  const current = item.token?.format || (kind === 'page' ? 'pageNofM' : 'us');

  return (
    <div
      ref={elRef}
      className={`lb-cell${preview.unfilled ? ' is-unfilled' : ''}${canFormat ? ` is-interactive is-${kind}${open ? ' is-open' : ''}` : ''}`}
      style={{ justifyContent: cellAlign(item) }}
      role={canFormat ? 'button' : undefined}
      tabIndex={canFormat ? 0 : undefined}
      onClick={canFormat ? () => setOpen(true) : undefined}
      onKeyDown={canFormat ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen(true);
        }
      } : undefined}
    >
      {preview.image ? <img className="lb-logo" src={preview.image} alt="" /> : null}
      {!preview.image && canFormat ? (
        <>
          <span className="lb-cell-plain">{preview.text}</span>
          <span className="lb-cell-affordance">
            {preview.text}
            <ChevronDown size={12} />
          </span>
        </>
      ) : null}
      {!preview.image && !canFormat && !preview.empty ? preview.text : null}
      {open && canFormat ? (
        <PreviewFormatMenu
          kind={kind}
          current={current}
          anchorEl={elRef.current}
          onSelect={(format) => {
            onFormat(item.id, format);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function PreviewBand({ items, onFormat }) {
  const rows = Math.max(gridRowCount(items), 1);
  return (
    <div
      className="lb-band lb-band-grid lb-preview-band"
      style={{
        gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(36px, auto))`,
      }}
    >
      {items.map((item) => (
          <div
            key={item.id}
            className="lb-band-slot"
            style={{
              gridColumn: `${item.x + 1} / span ${item.w}`,
              gridRow: `${item.y + 1} / span ${item.h}`,
            }}
          >
            <PreviewValue item={item} onFormat={onFormat} />
          </div>
      ))}
    </div>
  );
}

function LivePreview({ items, layoutType, onFormat }) {
  const isFooter = layoutType === 'footer';
  return (
    <div className="lb-live-preview">
      <div className="lb-live-preview-label">Preview</div>
      <div className="lb-live-preview-stage">
        <article className="lb-sheet is-live">
          <div className="lb-sheet-head">
            <h2>Operation 2</h2>
            <span>Created Dec 21, 2024</span>
          </div>
          {isFooter ? null : <PreviewBand items={items} onFormat={onFormat} />}
          <div className="lb-sheet-body">
            <div className="lb-body-row">
              <div className="lb-parts">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Part Name</th>
                      <th>QTY</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="lb-id">A</span></td>
                      <td>Screw</td>
                      <td>4</td>
                    </tr>
                    <tr>
                      <td><span className="lb-id">B</span></td>
                      <td>Loctite 222</td>
                      <td>1</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="lb-tools">
                <strong>Tools</strong>
                3.5mm driver
              </div>
            </div>
          </div>
          <div style={{ marginTop: 'auto', paddingBottom: 16 }}>
            {isFooter ? <PreviewBand items={items} onFormat={onFormat} /> : null}
          </div>
        </article>
      </div>
    </div>
  );
}

export default function LayoutEditor({
  initial,
  presetType = '',
  grid = false,
  savedConsts,
  savedPlaceholders,
  savedLogos,
  onSave,
  onCreatePlaceholder,
  onCreateConst,
  onCreateLogo,
  onClose,
}) {
  const [draft, setDraft] = useState(() => {
    const base = initial ? cloneLayout(initial) : emptyLayout(presetType);
    if (!grid && Array.isArray(base.items) && base.items.length) {
      base.rows = itemsToRows(base.items);
      delete base.items;
    }
    return base;
  });
  const [items, setItems] = useState(() => (grid ? layoutItems(initial || emptyLayout(presetType)) : []));
  const [picker, setPicker] = useState(null);

  useEffect(() => {
    if (!picker) return undefined;
    const onPointerDown = (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.lb-pop') || target.closest('.lb-editor-cell')) return;
      setPicker(null);
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => window.removeEventListener('pointerdown', onPointerDown, true);
  }, [picker]);

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

  const syncItems = (next) => {
    setItems((prev) => {
      let changed = false;
      const mapped = prev.map((item) => {
        const hit = next.find((entry) => entry.i === item.id);
        if (!hit) return item;
        if (hit.x === item.x && hit.y === item.y && hit.w === item.w && hit.h === item.h) return item;
        changed = true;
        return { ...item, x: hit.x, y: hit.y, w: hit.w, h: hit.h };
      });
      return changed ? mapped : prev;
    });
  };

  const addGridCell = () => {
    setItems((prev) => {
      const y = prev.reduce((max, item) => Math.max(max, item.y + item.h), 0);
      return [...prev, { id: uid('cell'), x: 0, y, w: 4, h: 1, token: null }];
    });
  };

  const removeGridCell = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setPicker((current) => (current?.id === id ? null : current));
  };

  const setGridToken = (id, token) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, token } : item)));
  };

  const setItemFormat = (id, format) => {
    setItems((prev) => prev.map((item) => (
      item.id === id && item.token ? { ...item, token: { ...item.token, format } } : item
    )));
  };

  return (
    <div className="lb-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} role="presentation">
      <div
        className={`lb-modal${grid ? ' is-grid' : ''}`}
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
          <div className={grid ? 'lb-editor-split' : undefined}>
            <div>
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
            {grid ? (
              <GridCanvas
                items={items}
                onLayoutChange={syncItems}
                onOpen={(id, el) => setPicker({ id, el })}
                onClose={() => setPicker(null)}
                onRemove={removeGridCell}
                onAdd={addGridCell}
                menuOpen={!!picker}
              />
            ) : (
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
            )}
          </div>
            </div>
            {grid ? <LivePreview items={items} layoutType={draft.type} onFormat={setItemFormat} /> : null}
          </div>
        </div>
        <div className="lb-modal-foot">
          <button
            type="button"
            className="lb-btn-primary"
            onClick={() => onSave({
              ...draft,
              name: draft.name.trim() || 'Untitled Layout',
              ...(grid ? { items } : {}),
            })}
          >
            Save Layout
          </button>
        </div>
      </div>
      {picker && (
        <CellPicker
          anchorEl={picker.el}
          current={grid ? items.find((item) => item.id === picker.id)?.token : draft.rows[picker.ri][picker.ci]}
          savedConsts={savedConsts}
          savedPlaceholders={savedPlaceholders}
          savedLogos={savedLogos}
          onPick={(token) => {
            if (grid) setGridToken(picker.id, token);
            else setCell(picker.ri, picker.ci, token);
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
