import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, Home, ChevronRight, ChevronDown, Plus, LayoutTemplate,
  Wrench, ClipboardList, Hexagon, Plug, FileText, LayoutGrid, List, Trash2,
  BookOpen, Puzzle,
} from 'lucide-react';
import Header from '../components/Header.jsx';
import PrototypeSwitcher from '../components/PrototypeSwitcher.jsx';
import {
  C, STORAGE_KEY, loadState, saveState, uid, cellCount, layoutDocCount, DOC_TEMPLATES,
} from './layoutBuilder/model.js';
import { LayoutSwatches, typeTag } from './layoutBuilder/shared.jsx';
import LayoutEditor from './layoutBuilder/LayoutEditor.jsx';
import DocumentView from './layoutBuilder/DocumentView.jsx';
import './layoutBuilder/layout-builder.css';

function NavItem({ icon, label, active, nested, onClick }) {
  return (
    <button
      type="button"
      className={`lb-nav-item${active ? ' is-active' : ''}${nested ? ' is-nested' : ''}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function LibraryPlaceholder({ title, body }) {
  return (
    <div className="lb-page lb-lib-placeholder">
      <h1 className="lb-page-title">{title}</h1>
      <p>{body}</p>
    </div>
  );
}

export default function LayoutBuilder({ storageKey = STORAGE_KEY, gridEditor = false } = {}) {
  const [state, setState] = useState(() => loadState(storageKey));
  const [view, setView] = useState('home');
  const [activeDocId, setActiveDocId] = useState(null);
  const [librariesOpen, setLibrariesOpen] = useState(true);
  const [pluginsOpen, setPluginsOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState('proj-1');
  const [galleryMode, setGalleryMode] = useState('grid');
  const [editor, setEditor] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [placeholderHistory, setPlaceholderHistory] = useState({});

  useEffect(() => { saveState(state, storageKey); }, [state, storageKey]);

  const update = useCallback((patch) => {
    setState((prev) => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }));
  }, []);

  const openDoc = (id) => {
    setActiveDocId(id);
    setView('document');
    setPanelOpen(true);
  };

  const activeDoc = state.documents.find((d) => d.id === activeDocId);
  const docMeta = (activeDocId && state.docState[activeDocId]) || { headerId: null, footerId: null, values: {} };
  const headerLayout = state.layouts.find((l) => l.id === docMeta.headerId) || null;
  const footerLayout = state.layouts.find((l) => l.id === docMeta.footerId) || null;

  const patchDoc = (docId, fn) => {
    update((prev) => {
      const cur = prev.docState[docId] || { headerId: null, footerId: null, values: {} };
      return { ...prev, docState: { ...prev.docState, [docId]: fn(cur) } };
    });
  };

  const saveLayout = (layout, applyType) => {
    update((prev) => {
      const exists = prev.layouts.some((l) => l.id === layout.id);
      const layouts = exists
        ? prev.layouts.map((l) => (l.id === layout.id ? layout : l))
        : [...prev.layouts, layout];
      let docState = prev.docState;
      if (!exists && activeDocId && (applyType === 'header' || applyType === 'footer')) {
        const cur = docState[activeDocId] || { headerId: null, footerId: null, values: {} };
        docState = {
          ...docState,
          [activeDocId]: applyType === 'header'
            ? { ...cur, headerId: layout.id }
            : { ...cur, footerId: layout.id },
        };
      }
      return { ...prev, layouts, docState };
    });
    setEditor(null);
  };

  const deleteLayout = (id, e) => {
    e?.stopPropagation();
    update((prev) => {
      const docState = Object.fromEntries(
        Object.entries(prev.docState).map(([k, v]) => [
          k,
          {
            ...v,
            headerId: v.headerId === id ? null : v.headerId,
            footerId: v.footerId === id ? null : v.footerId,
          },
        ]),
      );
      return { ...prev, layouts: prev.layouts.filter((l) => l.id !== id), docState };
    });
  };

  const toggleLayout = (kind, id) => {
    if (!activeDocId) return;
    patchDoc(activeDocId, (cur) => {
      if (kind === 'header') return { ...cur, headerId: cur.headerId === id ? null : id };
      return { ...cur, footerId: cur.footerId === id ? null : id };
    });
  };

  const applyTemplate = (templateId) => {
    const t = DOC_TEMPLATES.find((x) => x.id === templateId);
    if (!t || !activeDocId) return;
    patchDoc(activeDocId, (cur) => ({ ...cur, headerId: t.headerId, footerId: t.footerId }));
  };

  const changeValue = (key, val, opts = {}) => {
    if (!activeDocId) return;
    patchDoc(activeDocId, (cur) => ({ ...cur, values: { ...cur.values, [key]: val } }));
    if (opts.remember && val) {
      setPlaceholderHistory((prev) => {
        const list = prev[key] || [];
        if (list.includes(val)) return prev;
        return { ...prev, [key]: [...list, val] };
      });
    }
  };

  const uploadLogo = (dataUrl) => {
    update((prev) => (
      prev.savedLogos.includes(dataUrl)
        ? prev
        : { ...prev, savedLogos: [...prev.savedLogos, dataUrl] }
    ));
  };

  const addProject = () => {
    const n = state.projects.length + 1;
    const project = { id: uid('proj'), name: n === 1 ? 'Untitled Project' : `Untitled Project ${n}` };
    update((prev) => ({ ...prev, projects: [...prev.projects, project] }));
    setSelectedProjectId(project.id);
    setView('project');
  };

  const addDocument = (projectId) => {
    const doc = {
      id: uid('doc'),
      name: 'Untitled Document',
      projectId,
      created: 'Sep 17, 2026',
    };
    update((prev) => ({
      ...prev,
      documents: [...prev.documents, doc],
      docState: {
        ...prev.docState,
        [doc.id]: { headerId: null, footerId: null, values: { date_format: 'us', page_format: 'pageN' } },
      },
    }));
    openDoc(doc.id);
  };

  const docsFor = (projectId) => state.documents.filter((d) => d.projectId === projectId);

  const layoutCards = useMemo(
    () => state.layouts.map((l) => ({ ...l, docCount: layoutDocCount(l.id, state.docState) })),
    [state.layouts, state.docState],
  );

  if (view === 'document' && activeDoc) {
    return (
      <>
        <DocumentView
          document={activeDoc}
          layouts={state.layouts}
          headerLayout={headerLayout}
          footerLayout={footerLayout}
          headerId={docMeta.headerId}
          footerId={docMeta.footerId}
          values={docMeta.values || {}}
          savedLogos={state.savedLogos}
          placeholderHistory={placeholderHistory}
          panelOpen={panelOpen}
          onBack={() => { setView('home'); setActiveDocId(null); }}
          onChangeValue={changeValue}
          onUploadLogo={uploadLogo}
          onToggleLayout={toggleLayout}
          onApplyTemplate={applyTemplate}
          onNewLayout={(type) => setEditor({ type, layout: null })}
          onTogglePanel={() => setPanelOpen((v) => !v)}
        />
        {editor && (
          <LayoutEditor
            initial={editor.layout}
            presetType={editor.type}
            grid={gridEditor}
            savedConsts={state.savedConsts}
            savedPlaceholders={state.savedPlaceholders}
            savedLogos={state.savedLogos}
            onSave={(layout) => saveLayout(layout, editor.type)}
            onCreatePlaceholder={(token) => {
              update((prev) => ({
                ...prev,
                savedPlaceholders: [...prev.savedPlaceholders, {
                  id: token.id,
                  label: token.label,
                  defaultVal: token.defaultVal,
                  isImage: token.isImage,
                  src: token.src,
                }],
              }));
            }}
            onCreateConst={(c) => {
              update((prev) => ({ ...prev, savedConsts: [...prev.savedConsts, c] }));
            }}
            onCreateLogo={uploadLogo}
            onClose={() => setEditor(null)}
          />
        )}
        <PrototypeSwitcher />
      </>
    );
  }

  return (
    <div className="lb-app">
      <Header minimal />
      <div className="lb-shell">
        <aside className="lb-sidebar">
          <div className="lb-search">
            <div className="lb-search-box">
              <Search size={13} />
              Search
            </div>
          </div>
          <nav className="lb-nav">
            <NavItem
              icon={<Home size={14} />}
              label="Home"
              active={view === 'home'}
              onClick={() => setView('home')}
            />
            <button type="button" className="lb-nav-group" onClick={() => setLibrariesOpen((v) => !v)}>
              {librariesOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <BookOpen size={14} />
              Libraries
            </button>
            {librariesOpen && (
              <>
                <NavItem icon={<Wrench size={14} />} label="Tools" nested active={view === 'tools'} onClick={() => setView('tools')} />
                <NavItem icon={<ClipboardList size={14} />} label="Procedures" nested active={view === 'procedures'} onClick={() => setView('procedures')} />
                <NavItem icon={<Hexagon size={14} />} label="Parts" nested active={view === 'parts'} onClick={() => setView('parts')} />
                <NavItem icon={<LayoutTemplate size={14} />} label="Layouts" nested active={view === 'layouts'} onClick={() => setView('layouts')} />
              </>
            )}
            <button type="button" className="lb-nav-group" onClick={() => setPluginsOpen((v) => !v)}>
              {pluginsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Puzzle size={14} />
              Plugins
            </button>
            {pluginsOpen && (
              <div className="lb-nav-item is-nested" style={{ color: C.muted, cursor: 'default' }}>
                <Plug size={14} />
                No plugins connected
              </div>
            )}
          </nav>
          <div className="lb-divider" />
          <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
            <button type="button" className="lb-section-btn" onClick={() => setProjectsOpen((v) => !v)}>
              {projectsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Projects
            </button>
            {projectsOpen && state.projects.map((p) => (
              <div key={p.id}>
                <button
                  type="button"
                  className={`lb-project-item${selectedProjectId === p.id && view === 'project' ? ' is-active' : ''}`}
                  onClick={() => { setSelectedProjectId(p.id); setView('project'); }}
                >
                  <ChevronDown size={12} />
                  {p.name}
                </button>
                {docsFor(p.id).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className="lb-doc-item"
                    onClick={() => openDoc(d.id)}
                  >
                    <FileText size={13} />
                    {d.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="lb-sidebar-foot">
            <button type="button" className="lb-btn-primary" style={{ width: '100%' }} onClick={addProject}>
              <Plus size={14} /> New Project
            </button>
          </div>
        </aside>

        <main className="lb-main">
          {view === 'home' && (
            <div className="lb-page">
              <div className="lb-page-head">
                <h1 className="lb-page-title">Home</h1>
              </div>
              <div className="lb-page-sub">Recent documents</div>
              <div className="lb-doc-home-grid">
                {state.documents.map((d) => (
                  <button key={d.id} type="button" className="lb-doc-tile" onClick={() => openDoc(d.id)}>
                    <div className="lb-doc-tile-thumb"><FileText size={28} /></div>
                    <div className="lb-doc-tile-body">
                      <div className="lb-doc-tile-name">{d.name}</div>
                      <div className="lb-doc-tile-sub">{state.projects.find((p) => p.id === d.projectId)?.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === 'layouts' && (
            <div className="lb-page">
              <div className="lb-page-head">
                <h1 className="lb-page-title">Layouts</h1>
                <div className="lb-head-actions">
                  <button type="button" className="lb-btn-primary" onClick={() => setEditor({ type: 'header', layout: null })}>
                    <Plus size={14} /> New Layout
                  </button>
                  <div className="lb-segment">
                    <button type="button" className={galleryMode === 'grid' ? 'is-active' : ''} aria-label="Grid" onClick={() => setGalleryMode('grid')}>
                      <LayoutGrid size={14} />
                    </button>
                    <button type="button" className={galleryMode === 'list' ? 'is-active' : ''} aria-label="List" onClick={() => setGalleryMode('list')}>
                      <List size={14} />
                    </button>
                  </div>
                </div>
              </div>
              {layoutCards.length === 0 ? (
                <div className="lb-empty">
                  <div className="lb-empty-icon"><LayoutTemplate size={18} /></div>
                  <h3>No layouts currently</h3>
                  <p>Create a new layout header or footer that can be used for all documents.</p>
                  <button type="button" className="lb-btn-primary" onClick={() => setEditor({ type: 'header', layout: null })}>
                    <Plus size={14} /> New Layout
                  </button>
                </div>
              ) : (
                <>
                  <div className={`lb-gallery${galleryMode === 'list' ? ' is-list' : ''}`}>
                    {layoutCards.map((l) => {
                      const tag = typeTag(l.type);
                      return (
                        <div
                          key={l.id}
                          className={`lb-card${galleryMode === 'list' ? ' is-list' : ''}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => setEditor({ type: l.type || 'header', layout: l })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setEditor({ type: l.type || 'header', layout: l });
                            }
                          }}
                        >
                          <div className="lb-card-thumb">
                            <LayoutSwatches layout={l} />
                          </div>
                          <div className="lb-card-body">
                            <div className="lb-card-name">{l.name}</div>
                            <div className="lb-card-meta">
                              <span className={`lb-tag ${tag.cls}`}>{tag.label}</span>
                              <span style={{ fontSize: 11, color: C.muted }}>{cellCount(l)} cells</span>
                              <span className="lb-badge">
                                <FileText size={11} /> {l.docCount} {l.docCount === 1 ? 'doc' : 'docs'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="lb-card-delete"
                            aria-label={`Delete ${l.name}`}
                            onClick={(e) => deleteLayout(l.id, e)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {view === 'project' && (() => {
            const project = state.projects.find((p) => p.id === selectedProjectId);
            const docs = docsFor(selectedProjectId);
            return (
              <div className="lb-page">
                <div className="lb-page-head">
                  <h1 className="lb-page-title">{project?.name || 'Project'}</h1>
                  <button type="button" className="lb-btn-primary" onClick={() => addDocument(selectedProjectId)}>
                    <Plus size={14} /> New document
                  </button>
                </div>
                <div className="lb-doc-home-grid">
                  {docs.map((d) => (
                    <button key={d.id} type="button" className="lb-doc-tile" onClick={() => openDoc(d.id)}>
                      <div className="lb-doc-tile-thumb"><FileText size={28} /></div>
                      <div className="lb-doc-tile-body">
                        <div className="lb-doc-tile-name">{d.name}</div>
                        <div className="lb-doc-tile-sub">Created {d.created}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {view === 'tools' && (
            <LibraryPlaceholder title="Tools Library" body="Tool catalog for this workspace. Header and footer layouts can reference tools from documents, but this prototype focuses on the layout builder." />
          )}
          {view === 'procedures' && (
            <LibraryPlaceholder title="Procedures" body="Reusable procedure snippets live here in the full product. This prototype focuses on header and footer layouts." />
          )}
          {view === 'parts' && (
            <LibraryPlaceholder title="Parts" body="Parts library for this workspace. Open a document to apply header and footer layouts." />
          )}
        </main>
      </div>

      {editor && view !== 'document' && (
        <LayoutEditor
          initial={editor.layout}
          presetType={editor.type}
          grid={gridEditor}
          savedConsts={state.savedConsts}
          savedPlaceholders={state.savedPlaceholders}
          savedLogos={state.savedLogos}
          onSave={(layout) => saveLayout(layout, editor.type)}
          onCreatePlaceholder={(token) => {
            update((prev) => ({
              ...prev,
              savedPlaceholders: [...prev.savedPlaceholders, {
                id: token.id,
                label: token.label,
                defaultVal: token.defaultVal,
                isImage: token.isImage,
                src: token.src,
              }],
            }));
          }}
          onCreateConst={(c) => {
            update((prev) => ({ ...prev, savedConsts: [...prev.savedConsts, c] }));
          }}
          onCreateLogo={uploadLogo}
          onClose={() => setEditor(null)}
        />
      )}
      <PrototypeSwitcher />
    </div>
  );
}
