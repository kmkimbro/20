import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen, ChevronDown, ChevronRight, ClipboardList, FileText, Hexagon, Home, LayoutTemplate, Plug, Plus, Puzzle,
  Search, Wrench,
} from 'lucide-react';
import Header from '../../components/Header.jsx';
import PrototypeSwitcher from '../../components/PrototypeSwitcher.jsx';
import OnshapeWorkspace from '../infer/OnshapeWorkspace.jsx';
import '../infer/infer.css';
import CreateDocument6, { OnshapeStart } from './CreateDocument6.jsx';
import Editor6 from './Editor6.jsx';
import { pageImages, renderPdfPages } from './pdfPages.js';
import {
  CAD_READY_MS, createdLabel, importedOperations, loadState, resetState, samplePages, saveState, uid,
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

function DocTile({ doc, project, onOpen, now }) {
  // An import moves through three card states on its own: Processing CAD, then Parsing document, then Complete.
  const cadProcessing = now < (doc.cadReadyAt || 0);
  const processing = cadProcessing || doc.importing;
  return (
    <button type="button" className={`lb-doc-tile${processing ? ' is-uploading' : ''}`} onClick={() => onOpen(doc.id)}>
      <div className="lb-doc-tile-thumb">
        {processing ? <span className="lb-upload-track" aria-hidden="true"><span /></span> : <FileText size={28} />}
      </div>
      <div className="lb-doc-tile-body">
        <div className="lb-doc-tile-name">{doc.name}</div>
        <div className="lb-doc-tile-sub">
          {cadProcessing ? 'Processing CAD · ' : doc.importing ? 'Parsing document · ' : doc.start === 'import' ? 'Complete · ' : ''}
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
    const loaded = loadState();
    // An import cannot survive a reload, so finish any that were cut off.
    return {
      ...loaded,
      // A document cannot exist without a CAD, so drop any saved by an earlier build without one.
      documents: loaded.documents
        .filter((doc) => doc.cadName)
        .map((doc) => (doc.importing ? { ...doc, importing: false } : doc)),
    };
  });
  const [view, setView] = useState('home');
  const [activeDocId, setActiveDocId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [projectId, setProjectId] = useState('proj-1');
  const [librariesOpen, setLibrariesOpen] = useState(true);
  const [pluginsOpen, setPluginsOpen] = useState(false);
  // The welcome screen picks where the person starts: in Onshape/SolidWorks or in Quarter20.
  const [entry, setEntry] = useState(null);

  useEffect(() => { saveState(state); }, [state]);

  // Re-render while a CAD is processing so the document tiles update when it is ready.
  const [now, setNow] = useState(Date.now());
  const [importJob, setImportJob] = useState(null);
  const jobRef = useRef(0);
  const anyProcessing = state.documents.some((doc) => (doc.cadReadyAt || 0) > now);
  useEffect(() => {
    if (!anyProcessing) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [anyProcessing]);

  const updateDoc = useCallback((id, patch) => {
    setState((prev) => ({
      ...prev,
      documents: prev.documents.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc)),
    }));
  }, []);

  // Runs an import after the modal closes, in the order it would really happen:
  // 0 upload the PDF pages, 1 wait for the CAD to finish processing, 2 make an operation step per page,
  // 3 put the steps on the CAD, 4 done. The document stays empty until the end.
  const runImport = async (docId, source, cadReadyAt, hasCad) => {
    const run = jobRef.current + 1;
    jobRef.current = run;
    const alive = () => jobRef.current === run;
    const wait = (ms) => new Promise((resolve) => { window.setTimeout(resolve, ms); });
    const patchJob = (patch) => { if (alive()) setImportJob((job) => (job ? { ...job, ...patch } : job)); };
    // 0 the CAD finishes processing, 1 upload the PDF pages, 2 make an operation step per page, 3 put the steps on the CAD, 4 done.
    setImportJob({ docId, sourceName: source.name, stage: 0, total: 0, made: 0, pages: [] });
    const left = cadReadyAt - Date.now();
    if (left > 0) await wait(left);
    if (!alive()) return;
    patchJob({ stage: 1 });
    let list = [];
    await wait(800);
    if (source.file) {
      try {
        const { images } = await renderPdfPages(source.file, (n, count) => patchJob({ total: count }));
        list = images.map((image) => ({ image }));
      } catch {
        if (!alive()) return;
        setState((prev) => ({ ...prev, documents: prev.documents.filter((doc) => doc.id !== docId) }));
        patchJob({ error: `${source.name} could not be opened. Try another PDF.` });
        return;
      }
    } else {
      list = samplePages();
    }
    if (!alive()) return;
    if (list.some((page) => page.image)) pageImages.set(docId, list.map((page) => page.image));
    updateDoc(docId, { pageCount: list.length });
    for (let i = 0; i < list.length; i += 1) {
      await wait(300);
      patchJob({ total: list.length, pages: list.slice(0, i + 1) });
    }
    if (!alive()) return;
    patchJob({ stage: 2 });
    const ops = importedOperations(list.length);
    for (let i = 0; i < list.length; i += 1) {
      await wait(700);
      patchJob({ made: i + 1 });
    }
    if (!alive()) return;
    patchJob({ stage: 3 });
    if (hasCad) await wait(1500);
    if (!alive()) return;
    updateDoc(docId, { importing: false, operations: ops });
    patchJob({ stage: 4 });
  };

  const openDoc = (id) => {
    setActiveDocId(id);
    setView('document');
  };

  const createDoc = (draft, { openNow = true } = {}) => {
    const id = uid('doc');
    // A CAD that is already in Quarter20 is processed; a new upload takes a while. No CAD means nothing to process.
    const totalMs = !draft.cadName || draft.cadSource === 'library' ? 0 : CAD_READY_MS;
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
      pageCount: 0,
      importing: draft.start === 'import',
      operations: [],
      bom: false,
      messages: [],
    };
    setState((prev) => ({
      ...prev,
      cadLibrary: !draft.cadName || prev.cadLibrary.some((item) => item.name === draft.cadName)
        ? prev.cadLibrary
        : [...prev.cadLibrary, { id: uid('cad'), name: draft.cadName }],
      documents: [...prev.documents, doc],
    }));
    setCreating(false);
    // The document opens right away. CAD processing and any import run in the background,
    // with their progress in the assistant panel.
    setNow(Date.now());
    if (draft.start === 'import') runImport(id, draft.source, doc.cadReadyAt, Boolean(draft.cadName));
    if (openNow) openDoc(id);
  };

  // Both paths land on the project page while the CAD processes (and, for an import, while the PDF is brought in).
  const createFromModal = (draft) => {
    createDoc(draft, { openNow: false });
    setView('project');
  };

  // From the Onshape panel, Done hands off to Quarter20: the project page shows the new document
  // tile with its upload bar while the CAD is read, and the person opens it from there.
  const createFromOnshape = (draft) => {
    createDoc(draft, { openNow: false });
    setEntry('q20');
    setView('project');
  };

  const activeDoc = state.documents.find((doc) => doc.id === activeDocId);

  if (!entry) {
    return (
      <div className="aw3-start">
        <div className="aw3-start-card">
          <h1>Start</h1>
          <div className="aw3-start-actions">
            <button type="button" onClick={() => setEntry('onshape')}>from onshape/SW</button>
            {/* From Quarter20 lands on Home with the new Create a document modal open. */}
            <button type="button" onClick={() => setEntry('q20')}>from q20</button>
          </div>
        </div>
        <PrototypeSwitcher />
      </div>
    );
  }

  if (entry === 'onshape' && view !== 'document') {
    return (
      <>
        <OnshapeWorkspace
          parseSetup
          uploadStep
          renderStart={({ title, cadName }) => (
            <OnshapeStart key={title} title={title} cadName={cadName} onCreate={createFromOnshape} />
          )}
          onOpenDocument={() => {}}
        />
        <PrototypeSwitcher />
      </>
    );
  }

  if (view === 'document' && activeDoc) {
    return (
      <>
        <Editor6
          key={activeDoc.id}
          document={activeDoc}
          onBack={() => { setView('home'); setActiveDocId(null); }}
          onUpdate={(patch) => updateDoc(activeDoc.id, patch)}
          importJob={importJob?.docId === activeDoc.id ? importJob : null}
          onDismissImport={() => setImportJob(null)}
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
                    <DocTile key={doc.id} doc={doc} project={view === 'home' ? projectName(doc.projectId) : ''} onOpen={openDoc} now={now} />
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
        onCreate={createFromModal}
      />
      <PrototypeSwitcher />
    </div>
  );
}
