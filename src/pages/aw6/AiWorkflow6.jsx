import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen, ChevronDown, ChevronRight, ClipboardList, FileText, Hexagon, Home, LayoutTemplate, Plug, Plus, Puzzle,
  Search, Wrench,
} from 'lucide-react';
import Header from '../../components/Header.jsx';
import PrototypeSwitcher from '../../components/PrototypeSwitcher.jsx';
import CreateDocument6 from './CreateDocument6.jsx';
import Editor6 from './Editor6.jsx';
import { pageImages } from './pdfPages.js';
import {
  CAD_READY_MS, createdLabel, emptyOperation, importedOperations, loadState, resetState, saveState, uid,
} from './model.js';
import '../layoutBuilder/layout-builder.css';
import '../../design-system/tokens.css';
import '../../design-system/components.css';
import './aw6.css';

function NavItem({ icon, label, active, nested, onClick }) {
  return (
    <button type="button" className={`lb-nav-item${active ? ' is-active' : ''}${nested ? ' is-nested' : ''}`} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function DocTile({ doc, project, onOpen }) {
  return (
    <button type="button" className="lb-doc-tile" onClick={() => onOpen(doc.id)}>
      <div className="lb-doc-tile-thumb"><FileText size={28} /></div>
      <div className="lb-doc-tile-body">
        <div className="lb-doc-tile-name">{doc.name}</div>
        <div className="lb-doc-tile-sub">
          {doc.start === 'import' ? 'Imported · ' : ''}
          {project ? `${project} · ` : ''}
          {`Created ${doc.created}`}
        </div>
      </div>
    </button>
  );
}

export default function AiWorkflow6() {
  const [state, setState] = useState(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('reset')) resetState();
    return loadState();
  });
  const [view, setView] = useState('home');
  const [activeDocId, setActiveDocId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [projectId, setProjectId] = useState('proj-1');
  const [librariesOpen, setLibrariesOpen] = useState(true);
  const [pluginsOpen, setPluginsOpen] = useState(false);

  useEffect(() => { saveState(state); }, [state]);

  const updateDoc = useCallback((id, patch) => {
    setState((prev) => ({
      ...prev,
      documents: prev.documents.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc)),
    }));
  }, []);

  const openDoc = (id) => {
    setActiveDocId(id);
    setView('document');
  };

  const createDoc = (draft) => {
    const id = uid('doc');
    const pageCount = draft.pages.length;
    if (draft.start === 'import' && draft.pages.some((page) => page.image)) {
      pageImages.set(id, draft.pages.map((page) => page.image));
    }
    // A CAD that is already in Quarter20 is processed; a new upload takes a while.
    const totalMs = draft.cadSource === 'library' ? 0 : CAD_READY_MS;
    const doc = {
      id,
      name: draft.name,
      projectId,
      created: createdLabel(),
      cadName: draft.cadName,
      cadReadyAt: Date.now() + totalMs,
      cadTotalMs: Math.max(totalMs, 1),
      cadVisited: false,
      start: draft.start,
      sourceName: draft.sourceName,
      pageCount,
      operations: draft.start === 'import' ? importedOperations(pageCount) : [emptyOperation(1)],
      bom: false,
      messages: [],
    };
    setState((prev) => ({
      ...prev,
      cadLibrary: prev.cadLibrary.some((item) => item.name === draft.cadName)
        ? prev.cadLibrary
        : [...prev.cadLibrary, { id: uid('cad'), name: draft.cadName }],
      documents: [...prev.documents, doc],
    }));
    setCreating(false);
    openDoc(id);
  };

  const activeDoc = state.documents.find((doc) => doc.id === activeDocId);

  if (view === 'document' && activeDoc) {
    return (
      <>
        <Editor6
          key={activeDoc.id}
          document={activeDoc}
          onBack={() => { setView('home'); setActiveDocId(null); }}
          onUpdate={(patch) => updateDoc(activeDoc.id, patch)}
        />
        <PrototypeSwitcher />
      </>
    );
  }

  const projectName = (id) => state.projects.find((p) => p.id === id)?.name;
  const projectDocs = state.documents.filter((doc) => doc.projectId === projectId);

  return (
    <div className="lb-app aw6-shell">
      <Header minimal />
      <div className="lb-shell">
        <aside className="lb-sidebar">
          <div className="lb-search">
            <div className="lb-search-box"><Search size={13} /> Search</div>
          </div>
          <nav className="lb-nav">
            <NavItem icon={<Home size={14} />} label="Home" active={view === 'home'} onClick={() => setView('home')} />
            <button type="button" className="lb-nav-group" onClick={() => setLibrariesOpen((v) => !v)}>
              {librariesOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <BookOpen size={14} /> Libraries
            </button>
            {librariesOpen ? (
              <>
                <NavItem icon={<Wrench size={14} />} label="Tools" nested active={view === 'tools'} onClick={() => setView('tools')} />
                <NavItem icon={<ClipboardList size={14} />} label="Procedures" nested active={view === 'procedures'} onClick={() => setView('procedures')} />
                <NavItem icon={<Hexagon size={14} />} label="Parts" nested active={view === 'parts'} onClick={() => setView('parts')} />
                <NavItem icon={<LayoutTemplate size={14} />} label="Layouts" nested active={view === 'layouts'} onClick={() => setView('layouts')} />
              </>
            ) : null}
            <button type="button" className="lb-nav-group" onClick={() => setPluginsOpen((v) => !v)}>
              {pluginsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Puzzle size={14} /> Plugins
            </button>
            {pluginsOpen ? (
              <div className="lb-nav-item is-nested" style={{ cursor: 'default' }}>
                <Plug size={14} /> Onshape
              </div>
            ) : null}
          </nav>
          <div className="lb-divider" />
          <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
            <div className="lb-section-btn"><ChevronDown size={12} /> Projects</div>
            {state.projects.map((p) => (
              <div key={p.id}>
                <button
                  type="button"
                  className={`lb-project-item${projectId === p.id && view === 'project' ? ' is-active' : ''}`}
                  onClick={() => { setProjectId(p.id); setView('project'); }}
                >
                  <ChevronDown size={12} /> {p.name}
                </button>
                {state.documents.filter((d) => d.projectId === p.id).map((d) => (
                  <button key={d.id} type="button" className="lb-doc-item" onClick={() => openDoc(d.id)}>
                    <FileText size={13} /> {d.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="lb-sidebar-foot">
            <button
              type="button"
              className="lb-btn-primary"
              style={{ width: '100%' }}
              onClick={() => {
                const n = state.projects.length + 1;
                const project = { id: uid('proj'), name: `Untitled Project ${n}` };
                setState((prev) => ({ ...prev, projects: [...prev.projects, project] }));
                setProjectId(project.id);
                setView('project');
              }}
            >
              <Plus size={14} /> New Project
            </button>
          </div>
        </aside>

        <main className="lb-main">
          {view === 'home' || view === 'project' ? (
            <div className="lb-page">
              <div className="lb-page-head">
                <h1 className="lb-page-title">{view === 'home' ? 'Home' : projectName(projectId)}</h1>
                <button type="button" className="lb-btn-primary" onClick={() => setCreating(true)}>
                  <Plus size={14} /> New document
                </button>
              </div>
              {view === 'home' ? <div className="lb-page-sub">Recent documents</div> : null}
              {(view === 'home' ? state.documents : projectDocs).length ? (
                <div className="lb-doc-home-grid">
                  {(view === 'home' ? state.documents : projectDocs).map((doc) => (
                    <DocTile key={doc.id} doc={doc} project={view === 'home' ? projectName(doc.projectId) : ''} onOpen={openDoc} />
                  ))}
                </div>
              ) : (
                <p className="aw6-muted">No documents yet.</p>
              )}
            </div>
          ) : (
            <div className="lb-page lb-lib-placeholder">
              <h1 className="lb-page-title">{view[0].toUpperCase() + view.slice(1)}</h1>
              <p>This prototype focuses on creating a document.</p>
            </div>
          )}
        </main>
      </div>
      <CreateDocument6
        open={creating}
        cadLibrary={state.cadLibrary}
        onClose={() => setCreating(false)}
        onCreate={createDoc}
      />
      <PrototypeSwitcher />
    </div>
  );
}
