import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight, BookOpen, Box, Camera, Circle, ClipboardList, FileText, History, MessageSquare,
  Pencil, Plus, Send, Table, Type, Upload, Users,
} from 'lucide-react';
import Header from '../../components/Header.jsx';
import CadView from '../../components/CadView.jsx';
import ModelStage from '../infer/ModelStage.jsx';
import AssistPanel from './AssistPanel.jsx';
import SamplePage from './SamplePage.jsx';
import { pageImages } from './pdfPages.js';
import { bareName, modelParts, samplePages, samplePlan } from './model.js';

function PlanShot({ index }) {
  const scenes = [
    { body: 'M70 118 L150 78 L230 118 L150 158 Z', accent: 'M150 78 L150 118 L230 158' },
    { body: 'M64 130 L160 82 L248 126 L152 174 Z', accent: 'M160 82 L196 100 L248 126 M196 100 L196 148' },
    { body: 'M90 150 L170 108 L250 150 L170 192 Z', accent: 'M170 48 L170 108' },
    { body: 'M58 124 L150 76 L242 124 L150 172 Z', accent: 'M58 124 L242 124' },
  ];
  const scene = scenes[index % scenes.length];
  return (
    <svg viewBox="0 0 320 220" role="img" aria-label="CAD screenshot">
      <rect width="320" height="220" fill="#F4F6FB" />
      <path d={scene.body} fill="#E8EEFF" stroke="#3F50DB" strokeWidth="1.6" />
      <path d={scene.accent} fill="none" stroke="#3F50DB" strokeWidth="1.6" />
      <circle cx="150" cy="118" r="3" fill="#3F50DB" />
    </svg>
  );
}

function Toolbar() {
  const tools = [
    { title: 'Screenshot', icon: Camera },
    { title: 'Upload', icon: Upload },
    { title: 'Text', icon: Type },
    { title: 'Table', icon: Table },
    { title: 'Shape', icon: Circle },
    { title: 'Arrow', icon: ArrowUpRight },
    { title: 'Draw', icon: Pencil },
    { title: 'People', icon: Users },
    { title: 'Comments', icon: MessageSquare },
  ];
  return (
    <div className="toolbar">
      {tools.map(({ title, icon: Icon }) => (
        <button key={title} type="button" className="toolbar-btn" title={title}>
          <Icon className="toolbar-icon" size={18} />
        </button>
      ))}
      <button type="button" className="toolbar-btn" title="Technician view">
        <img src="/technician-icon.png" alt="" className="toolbar-icon toolbar-icon--emoji" width={20} height={20} />
      </button>
      <button type="button" className="toolbar-btn" title="Publish"><Send className="toolbar-icon" size={18} /></button>
    </div>
  );
}

function PartsTable({ parts }) {
  return (
    <table className="lb-op-table">
      <thead>
        <tr><th>Item</th><th>Part</th><th>Name</th><th>Qty</th></tr>
      </thead>
      <tbody>
        {parts.map((part, i) => (
          <tr key={`${part.pn}-${i}`}>
            <td>{part.item}</td><td>{part.pn}</td><td>{part.name}</td><td>{part.qty}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OperationSheet({ op, index, doc, onOpenCad }) {
  const pages = pageImages.get(doc.id);
  const sample = samplePages();
  return (
    <article id={`aw6-sheet-${op.id}`} className="lb-sheet aw6-sheet">
      <div className="lb-sheet-head">
        <h2>{op.title}</h2>
        <span>{`Operation ${index + 1}`}</span>
      </div>
      <div className="lb-sheet-body">
        {op.kind === 'imported' ? (
          <figure className="aw6-source-page">
            {pages?.[op.page]
              ? <img src={pages[op.page]} alt={`Page ${op.page + 1} of ${doc.sourceName}`} />
              : <SamplePage page={sample[op.page]} index={op.page} />}
            <figcaption>{`Page ${op.page + 1} of ${doc.sourceName}, kept as it is`}</figcaption>
          </figure>
        ) : null}
        {op.note ? <p className="lb-op-note">{op.note}</p> : null}
        {op.shot != null ? (
          <>
            <div className="lb-op-figure">
              <PlanShot index={op.shot} />
              {(op.marks || []).map((mark) => (
                <span key={mark.n} className="lb-op-mark" style={{ left: mark.x, top: mark.y }}>{mark.n}</span>
              ))}
            </div>
            <div className="lb-op-image-name">{`${index + 1}.1 · from ${doc.cadName}`}</div>
          </>
        ) : null}
        {op.parts?.length ? <PartsTable parts={op.parts} /> : null}
        {op.checks?.length ? (
          <ul className="aw6-checks">
            {op.checks.map((check) => <li key={check}><span aria-hidden="true" />{check}</li>)}
          </ul>
        ) : null}
        {op.shot == null && !op.parts?.length ? (
          <div className="aw6-empty-slot">
            <Box size={16} />
            <span>
              {op.kind === 'imported'
                ? 'No screenshots or parts from the CAD yet.'
                : 'This operation is empty. Type here, use the toolbar, or add a screenshot and parts from CAD View.'}
            </span>
            <button type="button" className="aw6-text-btn" onClick={onOpenCad}>Open CAD View</button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function Editor6({ document: doc, onBack, onUpdate, importJob, onDismissImport }) {
  const blank = doc.start === 'blank';
  const emptyDoc = blank && doc.operations.length === 0 && !doc.bom;
  // Blank documents open on the CAD side with the assistant closed; imports open on the document.
  const [nav, setNav] = useState(blank ? 'cad' : 'doc');
  const [panelOpen, setPanelOpen] = useState(!blank);
  const [now, setNow] = useState(Date.now());
  const [cadOpId, setCadOpId] = useState(doc.operations[0]?.id || null);
  const canvasRef = useRef(null);

  const cadReady = now >= (doc.cadReadyAt || 0);
  useEffect(() => {
    if (cadReady) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [cadReady]);

  const goCad = () => {
    setNav('cad');
    if (!doc.cadVisited) onUpdate({ cadVisited: true });
  };

  // Landing on the Document tab always brings up the assistant with its prompts.
  const goDoc = () => {
    setNav('doc');
    setPanelOpen(true);
  };

  const scrollTo = (id) => {
    if (nav !== 'doc') setNav('doc');
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  };

  const parts = useMemo(() => modelParts(), []);
  const cadOps = doc.operations.map((op, index) => ({
    id: op.id,
    label: `${index + 1}. ${op.title}`,
    parts: (op.parts || []).map((part) => ({ name: part.name })),
    noPlaceholderParts: true,
  }));
  const activeCadOp = doc.operations.find((op) => op.id === cadOpId) || doc.operations[0];
  const progress = Math.min(100, Math.round(100 - ((doc.cadReadyAt - now) / doc.cadTotalMs) * 100));

  const addOperation = () => {
    const n = doc.operations.length + 1;
    onUpdate({ operations: [...doc.operations, { id: `op-${Date.now()}`, title: `Operation ${n}`, kind: 'empty' }] });
  };

  const captureFor = (opId) => {
    const plan = samplePlan();
    onUpdate({
      operations: doc.operations.map((op, index) => {
        if (op.id !== opId) return op;
        const sample = plan[index % plan.length];
        return { ...op, shot: index, marks: sample.marks, parts: op.parts?.length ? op.parts : sample.parts };
      }),
    });
  };

  const panel = panelOpen ? (
    <AssistPanel
      doc={doc}
      importJob={importJob}
      onDismissImport={onDismissImport}
      nav={nav}
      cadReady={cadReady}
      progress={progress}
      activeCadOp={activeCadOp}
      activeCadIndex={doc.operations.indexOf(activeCadOp)}
      onOpenCad={goCad}
      onOpenDoc={goDoc}
      onCapture={captureFor}
      onUpdate={onUpdate}
      onClose={() => setPanelOpen(false)}
      onShowPage={scrollTo}
    />
  ) : null;

  return (
    <div className="lb-app aw6-editor">
      <Header
        navActive={nav}
        onNavChange={(next) => (next === 'cad' ? goCad() : next === 'doc' ? goDoc() : setNav(next))}
        onBack={onBack}
        onPrompts={() => setPanelOpen((open) => !open)}
        promptsActive={panelOpen}
      />
      {nav === 'cad' ? (
        <div className="lb-cad-host">
          {cadReady ? (
            <CadView
              key={doc.operations.length}
              operations={cadOps}
              initialSelectedOperationId={activeCadOp?.id}
              docTitle={doc.name}
              subtitle={doc.cadName}
              assemblyTree={[{ id: 'model', label: bareName(doc.cadName), children: parts }]}
              onOperationSelect={(operation) => setCadOpId(operation.id)}
              onAddStep={addOperation}
              viewer={<ModelStage active={(activeCadOp?.parts || []).map((part) => part.name)} />}
            />
          ) : (
            <div className="aw6-cad-wait">
              <Box size={28} />
              <h2>{`Processing ${doc.cadName}`}</h2>
              <p>Large assemblies take a few minutes. You can keep working in the document, and the model opens here as soon as it is ready.</p>
              <div className="aw6-bar" aria-label="CAD processing"><span style={{ width: `${Math.max(4, progress)}%` }} /></div>
            </div>
          )}
          {panel}
        </div>
      ) : (
        <div className="lb-doc">
          <aside className="lb-doc-tree">
            <div className="lb-tree-title">{doc.name}</div>
            {emptyDoc ? null : (<>
            <button type="button" className="lb-tree-item" onClick={() => scrollTo('aw6-sheet-cover')}>
              <BookOpen size={14} /> Cover
            </button>
            <button type="button" className="lb-tree-item" onClick={() => scrollTo('aw6-sheet-history')}>
              <History size={14} /> Document Version History
            </button>
            <button type="button" className="lb-tree-item" onClick={() => scrollTo('aw6-sheet-bom')}>
              <ClipboardList size={14} /> Bill of Materials
            </button>
            {doc.operations.map((op, index) => (
              <button key={op.id} type="button" className="lb-tree-item" onClick={() => scrollTo(`aw6-sheet-${op.id}`)}>
                <FileText size={14} />
                {op.kind === 'empty' || op.kind === 'imported' ? op.title : `${index + 1}. ${op.title}`}
              </button>
            ))}
            <button type="button" className="lb-tree-item aw6-tree-add" onClick={addOperation}>
              <Plus size={14} /> Add operation
            </button>
            </>)}
          </aside>
          <div className="lb-doc-stage">
            <Toolbar />
            <div className="lb-doc-canvas" ref={canvasRef}>
              {emptyDoc ? <article className="lb-sheet aw6-sheet aw6-blank-page" aria-label="Empty page" /> : (<>
              <article id="aw6-sheet-cover" className="lb-sheet aw6-sheet aw6-cover">
                <div className="lb-sheet-body">
                  <span className="aw6-cover-eyebrow">Work instruction</span>
                  <h1>{doc.name}</h1>
                  <dl>
                    <div><dt>CAD</dt><dd>{doc.cadName}</dd></div>
                    <div><dt>Created</dt><dd>{doc.created}</dd></div>
                    {doc.sourceName ? <div><dt>Imported from</dt><dd>{doc.sourceName}</dd></div> : null}
                  </dl>
                </div>
              </article>
              <article id="aw6-sheet-history" className="lb-sheet aw6-sheet aw6-short">
                <div className="lb-sheet-head"><h2>Document Version History</h2></div>
                <div className="lb-sheet-body">
                  <table className="lb-op-table">
                    <thead><tr><th>Version</th><th>Date</th><th>By</th><th>Change</th></tr></thead>
                    <tbody>
                      <tr>
                        <td>0.1</td>
                        <td>{doc.created}</td>
                        <td>F</td>
                        <td>{doc.sourceName ? `Imported ${doc.sourceName}` : 'Created from a blank document'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </article>
              <article id="aw6-sheet-bom" className="lb-sheet aw6-sheet aw6-short">
                <div className="lb-sheet-head"><h2>Bill of Materials</h2></div>
                <div className="lb-sheet-body">
                  {doc.bom ? (
                    <PartsTable parts={[...new Map(samplePlan().flatMap((step) => step.parts).map((part) => [part.pn, part])).values()]} />
                  ) : (
                    <p className="aw6-muted">Parts you add to operations from CAD View are listed here.</p>
                  )}
                </div>
              </article>
              {doc.operations.map((op, index) => (
                <OperationSheet key={op.id} op={op} index={index} doc={doc} onOpenCad={goCad} />
              ))}
              </>)}
            </div>
          </div>
          {panel}
        </div>
      )}
    </div>
  );
}
