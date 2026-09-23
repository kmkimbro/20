import { useEffect, useRef, useState } from 'react';
import {
  BookOpen, History, ClipboardList, FileText, ChevronRight, LayoutTemplate,
  Circle, MessageSquare, Pencil, ChevronDown, Check, Upload, Box, Plus,
  Camera, Type, Table, ArrowUpRight, Users, Star, Send,
} from 'lucide-react';
import Header from '../../components/Header.jsx';
import {
  C, CURRENT_USER, DATE_FORMATS, PAGE_FORMATS, DOC_PAGES, PRINT_PAGES, DOC_TEMPLATES,
  REF_DATE, formatDate, resolveToken, cellCount,
} from './model.js';
import { LayoutThumb, placePop } from './shared.jsx';

function CubeShot() {
  return (
    <svg width="88" height="80" viewBox="0 0 88 80" fill="none" aria-hidden>
      <path d="M44 8 L76 26 L76 58 L44 76 L12 58 L12 26 Z" stroke="#4F6EF7" strokeWidth="1.5" />
      <path d="M44 8 L44 40 L76 58 M44 40 L12 58" stroke="#4F6EF7" strokeWidth="1.5" />
    </svg>
  );
}

function CameraPlusIcon({ className, size = 18 }) {
  return (
    <span className={className} style={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
      <Camera size={size} />
      <Plus size={9} strokeWidth={2.75} style={{ position: 'absolute', right: -3, top: -2 }} />
    </span>
  );
}

function UsersStarIcon({ className, size = 18 }) {
  return (
    <span className={className} style={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
      <Users size={size} />
      <Star size={8} fill="currentColor" style={{ position: 'absolute', right: -3, top: -1 }} />
    </span>
  );
}

function CircleAIcon({ className, size = 18 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="Inter, sans-serif">A</text>
    </svg>
  );
}

function LayoutDocToolbar({ panelOpen, onTogglePanel }) {
  const [openMenu, setOpenMenu] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener('click', onDown);
    return () => document.removeEventListener('click', onDown);
  }, []);

  const Split = ({ id, title, icon: Icon, items }) => (
    <div className={`split-btn${openMenu === id ? ' open' : ''}`}>
      <button type="button" className="split-btn-action" title={title}>
        <Icon className="toolbar-icon" size={18} />
      </button>
      <button
        type="button"
        className="split-btn-caret"
        title={`${title} options`}
        onClick={(e) => { e.stopPropagation(); setOpenMenu((m) => (m === id ? null : id)); }}
      >
        <ChevronDown className="caret-icon" size={16} />
      </button>
      <div className={`split-menu${openMenu === id ? ' open' : ''}`}>
        {items.map((item) => (
          <button key={item} type="button" className="split-menu-item" onClick={() => setOpenMenu(null)}>
            {item}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="toolbar" ref={ref}>
      <button type="button" className="toolbar-btn" title="Screenshot">
        <CameraPlusIcon className="toolbar-icon" />
      </button>
      <Split id="upload" title="Upload" icon={Upload} items={['Upload from computer', 'Placeholder image', 'Video']} />
      <Split id="text" title="Text" icon={Type} items={['Text box', 'Heading']} />
      <Split id="table" title="Table" icon={Table} items={['Parts table', 'Tools table', 'Custom table']} />
      <button type="button" className="toolbar-btn" title="Shape"><Circle className="toolbar-icon" size={18} /></button>
      <button type="button" className="toolbar-btn" title="Arrow"><ArrowUpRight className="toolbar-icon" size={18} /></button>
      <button type="button" className="toolbar-btn" title="Draw"><Pencil className="toolbar-icon" size={18} /></button>
      <button type="button" className="toolbar-btn" title="People"><UsersStarIcon className="toolbar-icon" /></button>
      <button type="button" className="toolbar-btn" title="Annotation"><CircleAIcon className="toolbar-icon" /></button>
      <button type="button" className="toolbar-btn" title="Comments"><MessageSquare className="toolbar-icon" size={18} /></button>
      <button
        type="button"
        className={`toolbar-btn${panelOpen ? ' toolbar-active' : ''}`}
        title="Layouts"
        onClick={onTogglePanel}
      >
        <LayoutTemplate className="toolbar-icon" size={18} />
      </button>
      <button type="button" className="toolbar-btn" title="Technician view">
        <img src="/technician-icon.png" alt="" className="toolbar-icon toolbar-icon--emoji" width={20} height={20} />
      </button>
      <button type="button" className="toolbar-btn" title="Publish">
        <Send className="toolbar-icon" size={18} />
      </button>
    </div>
  );
}

function FormatMenu({ kind, current, pageCount, onSelect, onClose, anchorEl }) {
  const ref = useRef(null);
  const pos = placePop(anchorEl);
  const items = kind === 'date'
    ? DATE_FORMATS.map((f) => ({ id: f.id, label: formatDate(REF_DATE, f.id) }))
    : PAGE_FORMATS.map((f) => ({
      id: f.id,
      label: f.id === 'n' ? '1'
        : f.id === 'nOfM' ? `1 of ${pageCount}`
          : f.id === 'pageN' ? 'Page 1'
            : `Page 1 of ${pageCount}`,
    }));

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

  return (
    <div ref={ref} className="lb-pop" style={{ top: pos.top, left: pos.left, width: 180 }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <div className="lb-pop-section">{kind === 'date' ? 'Date' : 'Page'}</div>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`lb-pop-item${current === item.id ? ' is-active' : ''}`}
          onClick={() => onSelect(item.id)}
        >
          <span className="label">{item.label}</span>
          {current === item.id ? <Check size={14} className="lb-pop-check" /> : null}
        </button>
      ))}
    </div>
  );
}

function PlaceholderMenu({ resolved, savedValues, onSet, onClose, anchorEl }) {
  const ref = useRef(null);
  const [text, setText] = useState(resolved.text || '');
  const pos = placePop(anchorEl);
  const options = [...new Set([
    resolved.text,
    ...(savedValues || []),
    ...(resolved.savedValues || []),
  ].filter(Boolean))];

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

  return (
    <div ref={ref} className="lb-pop" style={{ top: pos.top, left: pos.left }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <div className="lb-pop-section">{resolved.label}</div>
      {options.map((v) => (
        <button
          key={v}
          type="button"
          className={`lb-pop-item${v === resolved.text ? ' is-active' : ''}`}
          onClick={() => onSet(v)}
        >
          <span className="label">{v}</span>
          {v === resolved.text ? <Check size={14} className="lb-pop-check" /> : null}
        </button>
      ))}
      <div className="lb-form">
        <input
          className="lb-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a value"
          autoFocus
        />
        <button
          type="button"
          className="lb-btn-primary"
          style={{ width: '100%', marginTop: 8 }}
          onClick={() => onSet(text.trim())}
        >
          Set
        </button>
      </div>
    </div>
  );
}

function LogoMenu({ savedLogos, current, onSet, onUpload, onClose, anchorEl }) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const pos = placePop(anchorEl);

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

  return (
    <div ref={ref} className="lb-pop" style={{ top: pos.top, left: pos.left, width: 260 }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <div className="lb-pop-title">Logo</div>
      <div className="lb-logo-grid">
        {savedLogos.map((src) => (
          <button
            key={src.slice(0, 48)}
            type="button"
            className={`lb-logo-opt${current === src ? ' is-selected' : ''}`}
            onClick={() => onSet(src)}
          >
            <img src={src} alt="" />
          </button>
        ))}
      </div>
      <div className="lb-form">
        <button type="button" className="lb-dropzone" onClick={() => fileRef.current?.click()}>
          <Upload size={14} style={{ marginBottom: 4 }} />
          <div>Upload new logo</div>
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
            reader.onload = () => onUpload(String(reader.result));
            reader.readAsDataURL(file);
          }}
        />
      </div>
    </div>
  );
}

function DocCell({
  token,
  ctx,
  align,
  values,
  savedLogos,
  placeholderHistory,
  onChangeValue,
  onUploadLogo,
}) {
  const resolved = resolveToken(token, ctx);
  const elRef = useRef(null);
  const [menu, setMenu] = useState(null);

  if (!token) {
    return <div className="lb-cell" />;
  }

  const interactive = token.type === 'builtin' || token.type === 'placeholder';
  const isFormat = resolved.kind === 'date' || resolved.kind === 'page';
  const isPhText = resolved.kind === 'placeholder';
  const isLogo = resolved.kind === 'image';
  const kindClass = isFormat ? ` is-${resolved.kind}` : isPhText ? ' is-ph' : isLogo ? ' is-logo' : '';
  const ariaName = isLogo
    ? (resolved.filled ? 'Logo' : (resolved.label || 'Logo'))
    : (resolved.filled ? resolved.text : (resolved.label || 'Value'));
  const hint = isFormat ? 'Click to change format' : interactive ? 'Click to edit' : undefined;

  const openForToken = () => {
    if (resolved.kind === 'date' || resolved.kind === 'page') setMenu(resolved.kind);
    else if (isLogo) setMenu('logo');
    else if (token.type === 'placeholder') setMenu('ph');
  };

  const onClick = (e) => {
    if (!interactive) return;
    e.stopPropagation();
    openForToken();
  };

  const displayText = resolved.filled ? resolved.text : (resolved.label || tokenLabelFallback(token));
  const renderLogo = () => (
    resolved.filled
      ? <img className="lb-logo" src={resolved.src} alt="" />
      : (resolved.label || 'Logo')
  );

  let content;
  if (isLogo) {
    content = (
      <>
        <span className="lb-cell-plain">{renderLogo()}</span>
        <span className="lb-cell-affordance">
          {renderLogo()}
          <ChevronDown size={12} />
        </span>
      </>
    );
  } else if (isFormat || isPhText) {
    content = (
      <>
        <span className="lb-cell-plain">{displayText}</span>
        <span className="lb-cell-affordance">
          {displayText}
          <ChevronDown size={12} />
        </span>
      </>
    );
  } else {
    content = displayText;
  }

  return (
    <div
      ref={elRef}
      className={`lb-cell${interactive ? ' is-interactive' : ''}${kindClass}${menu ? ' is-open' : ''}${resolved.filled ? '' : ' is-unfilled'}`}
      style={align ? { justifyContent: align } : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? ariaName : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openForToken();
        }
      } : undefined}
      title={interactive ? hint : undefined}
    >
      {content}
      {menu === 'date' && (
        <FormatMenu
          kind="date"
          current={values.date_format || token.format || 'us'}
          pageCount={ctx.pageCount}
          anchorEl={elRef.current}
          onSelect={(id) => { onChangeValue('date_format', id); setMenu(null); }}
          onClose={() => setMenu(null)}
        />
      )}
      {menu === 'page' && (
        <FormatMenu
          kind="page"
          current={values.page_format || token.format || 'pageN'}
          pageCount={ctx.pageCount}
          anchorEl={elRef.current}
          onSelect={(id) => { onChangeValue('page_format', id); setMenu(null); }}
          onClose={() => setMenu(null)}
        />
      )}
      {menu === 'ph' && (
        <PlaceholderMenu
          resolved={resolved}
          savedValues={placeholderHistory[token.id] || []}
          anchorEl={elRef.current}
          onSet={(val) => { onChangeValue(token.id, val, { remember: true }); setMenu(null); }}
          onClose={() => setMenu(null)}
        />
      )}
      {menu === 'logo' && (
        <LogoMenu
          savedLogos={savedLogos}
          current={resolved.src}
          anchorEl={elRef.current}
          onSet={(src) => { onChangeValue(token.id, src); setMenu(null); }}
          onUpload={(src) => { onUploadLogo(src); onChangeValue(token.id, src); setMenu(null); }}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

function tokenLabelFallback(token) {
  if (token?.label) return token.label;
  if (token?.id === 'revision') return 'Revision';
  if (token?.id === 'lot') return 'Lot Number';
  return 'Value';
}

function LayoutBand({
  layout,
  ctx,
  values,
  savedLogos,
  placeholderHistory,
  onChangeValue,
  onUploadLogo,
}) {
  if (!layout) return null;
  return (
    <div className="lb-band">
      {layout.rows.map((row, ri) => (
        <div
          key={ri}
          className="lb-band-row"
          style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}
        >
          {row.map((cell, ci) => (
            <DocCell
              key={ci}
              token={cell}
              ctx={ctx}
              values={values}
              savedLogos={savedLogos}
              placeholderHistory={placeholderHistory}
              onChangeValue={onChangeValue}
              onUploadLogo={onUploadLogo}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function SampleBody({ page }) {
  if (page.isSub) {
    return (
      <div className="lb-sheet-body">
        <p style={{ fontSize: 13, color: C.sub }}>Continuation of Operation 2.</p>
      </div>
    );
  }
  if (!page.sample) {
    return (
      <div className="lb-sheet-body">
        <p style={{ fontSize: 13, color: C.muted }}>Page content</p>
      </div>
    );
  }
  return (
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
              {[
                ['A', 'Screw', 4],
                ['B', 'Loctite 222', 1],
                ['C', 'Loctite 202', 1],
              ].map((row) => (
                <tr key={row[0]}>
                  <td><span className="lb-id">{row[0]}</span></td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="lb-tools">
          <strong>Tools</strong>
          3.5mm driver
        </div>
      </div>
      <div className="lb-shot">
        <CubeShot />
        Screen shot
      </div>
    </div>
  );
}

function LayoutsPanel({
  layouts,
  headerId,
  footerId,
  tab,
  onTab,
  onToggle,
  onNew,
}) {
  const headers = layouts.filter((l) => l.type === 'header');
  const footers = layouts.filter((l) => l.type === 'footer');

  return (
    <aside className="lb-panel">
      <div className="lb-tabs">
        <button type="button" className={`lb-tab${tab === 'templates' ? ' is-active' : ''}`} onClick={() => onTab('templates')}>
          Templates
        </button>
        <button type="button" className={`lb-tab${tab === 'layouts' ? ' is-active' : ''}`} onClick={() => onTab('layouts')}>
          Layouts
        </button>
      </div>
      {tab === 'layouts' ? (
        <>
          <div className="lb-panel-section">
            <div className="lb-panel-label">Headers</div>
            {headers.map((l) => (
              <button
                key={l.id}
                type="button"
                className={`lb-layout-mini${headerId === l.id ? ' is-selected' : ''}`}
                onClick={() => onToggle('header', l.id)}
              >
                <div className="lb-layout-mini-name">{l.name}</div>
                <LayoutThumb layout={l} compact />
              </button>
            ))}
            <button type="button" className="lb-btn-ghost" onClick={() => onNew('header')}>
              <Plus size={14} /> Add new header
            </button>
          </div>
          <div className="lb-panel-section">
            <div className="lb-panel-label">Footers</div>
            {footers.map((l) => (
              <button
                key={l.id}
                type="button"
                className={`lb-layout-mini${footerId === l.id ? ' is-selected' : ''}`}
                onClick={() => onToggle('footer', l.id)}
              >
                <div className="lb-layout-mini-name">{l.name}</div>
                <LayoutThumb layout={l} compact />
              </button>
            ))}
            <button type="button" className="lb-btn-ghost" onClick={() => onNew('footer')}>
              <Plus size={14} /> Add new footer
            </button>
          </div>
        </>
      ) : (
        <div className="lb-panel-section">
          <div className="lb-panel-label">Document templates</div>
          {DOC_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="lb-layout-mini"
              onClick={() => onToggle('template', t.id)}
            >
              <div className="lb-layout-mini-name">{t.name}</div>
              <div style={{ fontSize: 11, color: C.muted }}>
                {cellCount(layouts.find((l) => l.id === t.headerId) || { rows: [] })} cells · starter
              </div>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

const TREE_ICONS = {
  cover: BookOpen,
  history: History,
  bom: ClipboardList,
};

export default function DocumentView({
  document: doc,
  layouts,
  headerLayout,
  footerLayout,
  headerId,
  footerId,
  values,
  savedLogos,
  placeholderHistory,
  panelOpen,
  onBack,
  onChangeValue,
  onUploadLogo,
  onToggleLayout,
  onApplyTemplate,
  onNewLayout,
  onTogglePanel,
}) {
  const [nav, setNav] = useState('doc');
  const [activePage, setActivePage] = useState('op2');
  const [panelTab, setPanelTab] = useState('layouts');
  const pageCount = PRINT_PAGES.length;

  const ctxFor = (pageIndex) => ({
    values,
    pageIndex,
    pageCount,
    docName: values.docname || doc.name,
    user: CURRENT_USER,
    date: REF_DATE,
  });

  const visibleSheets = activePage === 'op2' || activePage === 'op2-sub'
    ? PRINT_PAGES
    : [{ id: activePage, title: DOC_PAGES.find((p) => p.id === activePage)?.title || 'Page', pageIndex: 1 }];

  return (
    <div className="lb-app">
      <Header
        navActive={nav}
        onNavChange={setNav}
        onBack={onBack}
      />
      {nav === 'cad' ? (
        <div className="lb-cad-placeholder">
          <div style={{ textAlign: 'center' }}>
            <Box size={28} color={C.blue} style={{ marginBottom: 8 }} />
            <div>CAD View</div>
            <button type="button" className="lb-btn-ghost" onClick={() => setNav('doc')}>Back to document</button>
          </div>
        </div>
      ) : (
        <div className="lb-doc">
          <aside className="lb-doc-tree">
            <div className="lb-tree-title">{doc.name}</div>
            {DOC_PAGES.map((page) => {
              if (page.kind === 'sub') return null;
              const Icon = TREE_ICONS[page.id] || FileText;
              const child = DOC_PAGES.find((p) => p.parent === page.id);
              return (
                <div key={page.id}>
                  <button
                    type="button"
                    className={`lb-tree-item${page.kind === 'meta' ? ' is-nested' : ''}${activePage === page.id ? ' is-active' : ''}`}
                    onClick={() => setActivePage(page.id)}
                  >
                    {page.kind === 'operation' ? <ChevronRight size={12} /> : null}
                    <Icon size={14} />
                    {page.title}
                  </button>
                  {child && page.id === 'op2' ? (
                    <button
                      type="button"
                      className={`lb-tree-item is-sub${activePage === child.id ? ' is-active' : ''}`}
                      onClick={() => setActivePage(child.id)}
                    >
                      {child.title}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </aside>
          <div className="lb-doc-stage">
            <LayoutDocToolbar panelOpen={panelOpen} onTogglePanel={onTogglePanel} />
            <div className="lb-doc-canvas">
              {visibleSheets.map((page) => (
                <article key={page.id} className={`lb-sheet${page.isSub ? ' is-sub' : ''}`}>
                  {page.isSub ? <div className="lb-sheet-label">Sub-page 1</div> : null}
                  <div className="lb-sheet-head">
                    <h2>{page.title}</h2>
                    <span>Created {doc.created}</span>
                  </div>
                  <LayoutBand
                    layout={headerLayout}
                    ctx={ctxFor(page.pageIndex || 1)}
                    values={values}
                    savedLogos={savedLogos}
                    placeholderHistory={placeholderHistory}
                    onChangeValue={onChangeValue}
                    onUploadLogo={onUploadLogo}
                  />
                  <SampleBody page={page} />
                  <div style={{ marginTop: 'auto', paddingBottom: 16 }}>
                    <LayoutBand
                      layout={footerLayout}
                      ctx={ctxFor(page.pageIndex || 1)}
                      values={values}
                      savedLogos={savedLogos}
                      placeholderHistory={placeholderHistory}
                      onChangeValue={onChangeValue}
                      onUploadLogo={onUploadLogo}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
          {panelOpen ? (
            <LayoutsPanel
              layouts={layouts}
              headerId={headerId}
              footerId={footerId}
              tab={panelTab}
              onTab={setPanelTab}
              onToggle={(kind, id) => {
                if (kind === 'template') onApplyTemplate(id);
                else onToggleLayout(kind, id);
              }}
              onNew={onNewLayout}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
