import { useState } from 'react';
import { FileText } from 'lucide-react';
import Header from '../../components/Header.jsx';
import CadView from '../../components/CadView.jsx';
import { buildDocument } from './samples.js';
import ModelStage from './ModelStage.jsx';
import PromptPanel from './PromptPanel.jsx';
import './infer.css';

function Figure({ kind, marks }) {
  if (kind === 'plate') {
    return (
      <svg viewBox="0 0 320 180" role="img" aria-label="Mounting plate">
        <rect width="320" height="180" fill="#F3F4F6" />
        <rect x="36" y="28" width="168" height="124" rx="4" fill="#D6D3D1" stroke="#57534E" />
        {[[62, 58], [108, 58], [62, 108], [108, 108]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="14" fill="#E7E5E4" stroke="#44403C" />
        ))}
        <rect x="214" y="48" width="70" height="84" rx="4" fill="#A8A29E" stroke="#44403C" />
        <text x="249" y="78" textAnchor="middle" fontSize="9" fill="#1C1917">DE9</text>
        <text x="249" y="108" textAnchor="middle" fontSize="9" fill="#1C1917">CAMERA</text>
      </svg>
    );
  }
  if (kind === 'fittings') {
    return (
      <svg viewBox="0 0 320 180" role="img" aria-label="Water fittings">
        <rect width="320" height="180" fill="#F8FAFC" />
        <rect x="78" y="36" width="164" height="108" fill="none" stroke="#DC2626" strokeWidth="3" />
        {[[110, 90], [160, 70], [200, 100]].map(([x, y], index) => (
          <g key={x} transform={`translate(${x} ${y})`}>
            <rect x="-16" y="-10" width="32" height="20" rx="3" fill={index === 2 ? '#EAB308' : '#CA8A04'} stroke="#854D0E" />
            <rect x="10" y="-6" width="18" height="12" fill="#A16207" />
          </g>
        ))}
      </svg>
    );
  }
  if (kind === 'mounted') {
    return (
      <svg viewBox="0 0 320 180" role="img" aria-label="Mounted fittings">
        <rect width="320" height="180" fill="#F8FAFC" />
        <path d="M40 130 C80 40 200 50 280 120" fill="none" stroke="#93C5FD" strokeWidth="10" />
        <circle cx="150" cy="78" r="16" fill="#CA8A04" stroke="#854D0E" />
        <path d="M166 78 H230" stroke="#DC2626" strokeWidth="4" />
      </svg>
    );
  }
  if (kind === 'thermal') {
    return (
      <svg viewBox="0 0 320 180" role="img" aria-label="Thermal pads">
        <rect width="320" height="180" fill="#F8FAFC" />
        <rect x="70" y="36" width="180" height="108" fill="none" stroke="#111827" />
        <rect x="92" y="58" width="54" height="28" fill="#E5E7EB" stroke="#111827" />
        {marks ? <text x="86" y="52" fontSize="12" fontWeight="700">1</text> : null}
      </svg>
    );
  }
  if (kind === 'cards') {
    return (
      <svg viewBox="0 0 320 180" role="img" aria-label="Card subassembly">
        <rect width="320" height="180" fill="#F8FAFC" />
        <rect x="48" y="48" width="120" height="84" fill="none" stroke="#111827" />
        <rect x="150" y="36" width="110" height="70" fill="none" stroke="#111827" />
        {marks ? (
          <>
            <text x="40" y="44" fontSize="12" fontWeight="700">2</text>
            <text x="248" y="40" fontSize="12" fontWeight="700">3</text>
          </>
        ) : null}
      </svg>
    );
  }
  if (kind === 'bottom') {
    return (
      <svg viewBox="0 0 320 180" role="img" aria-label="Bottom view">
        <rect width="320" height="180" fill="#F8FAFC" />
        <rect x="64" y="40" width="192" height="100" fill="none" stroke="#111827" />
        {marks ? <text x="52" y="56" fontSize="12" fontWeight="700">4</text> : null}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 320 180" role="img" aria-label="LED assembly">
      <rect width="320" height="180" fill="#E5E7EB" />
      <path d="M40 40 H200 V140 H40 Z" fill="#374151" />
      <path d="M200 70 H280 V120 H200 Z" fill="#4B5563" />
      <circle cx="176" cy="78" r="10" fill="none" stroke="#F59E0B" strokeWidth="3" />
      <circle cx="176" cy="112" r="10" fill="none" stroke="#F59E0B" strokeWidth="3" />
      {marks ? (
        <>
          <text x="192" y="82" fontSize="11" fontWeight="700" fill="#92400E">1</text>
          <text x="192" y="116" fontSize="11" fontWeight="700" fill="#92400E">2</text>
        </>
      ) : null}
    </svg>
  );
}

function StepBody({ step, showTools, onPick, scopeId }) {
  const scoped = (id) => `${scopeId === id ? ' is-prompt-target' : ''} lb-pick`;
  const pick = (id, label) => (event) => {
    event.stopPropagation();
    onPick?.({ id, label });
  };
  return (
    <div className="lb-sheet-body">
      <p className={`inf-action${scoped(`action:${step.id}`)}`} onClick={pick(`action:${step.id}`, 'Step text')}>{step.action}</p>
      {showTools && step.tools?.length ? (
        <p className={`inf-tools${scoped(`tools:${step.id}`)}`} onClick={pick(`tools:${step.id}`, 'Tools')}>Tools · {step.tools.join(', ')}</p>
      ) : null}
      {step.ctq ? <span className="inf-ctq">CTQ</span> : null}
      {step.figure ? (
        <div className={`inf-figure${scoped(`figure:${step.id}`)}`} onClick={pick(`figure:${step.id}`, 'Figure')}>
          <Figure kind={step.figure} marks={step.marks} />
        </div>
      ) : null}
      {step.parts?.length ? (
        <table className="lb-op-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Part</th>
              <th>Name</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {step.parts.map((part) => (
              <tr key={part.pn} className={scoped(`part:${step.id}:${part.pn}`)} onClick={pick(`part:${step.id}:${part.pn}`, part.name)}>
                <td>{part.item}</td>
                <td>{part.pn}</td>
                <td>{part.name}</td>
                <td>{part.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

export default function InferredDocument({ document: doc, onBack }) {
  const [nav, setNav] = useState('cad');
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [promptTarget, setPromptTarget] = useState(null);
  const [askHistory, setAskHistory] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const inference = doc.inference || {};
  const built = buildDocument(inference.sampleId, inference.adjustments);
  const showStepTools = !built.toolsToolkit;
  const modelName = (inference.cadName || doc.name || 'Model').replace(/\.(step|stp|iges|igs|stl|obj)$/i, '');
  const modelParts = built.parts?.length
    ? built.parts.map((row) => row[2])
    : (built.tools.length ? built.tools : built.steps.map((step) => step.title));
  const assemblyTree = [{ id: 'model', label: modelName, children: modelParts }];

  const operations = built.steps.map((step, index) => {
    const share = modelParts.filter((_, partIndex) => partIndex % built.steps.length === index);
    const names = share.length ? share : [modelParts[index % modelParts.length]].filter(Boolean);
    return {
      id: step.id,
      label: `Step ${step.n} — ${step.title}`,
      parts: names.map((name) => ({ name })),
    };
  });
  const shown = built.steps.find((step) => step.id === selectedId) || built.steps[0];

  return (
    <div className="lb-app">
      <Header
        navActive={nav}
        onNavChange={setNav}
        onBack={onBack}
        onPrompts={() => setPromptsOpen((open) => !open)}
        promptsActive={promptsOpen}
      />
      {nav === 'cad' ? (
        <div className="lb-cad-host">
          <CadView
            operations={operations}
            docTitle={modelName}
            subtitle={inference.cadName || 'CAD model'}
            assemblyTree={assemblyTree}
            onOperationSelect={(operation) => setSelectedId(operation.id)}
            onScopePick={promptsOpen ? setPromptTarget : null}
            scopeId={promptTarget?.id || null}
            viewer={(
              <ModelStage
                title={modelName}
                parts={modelParts}
                active={(operations.find((operation) => operation.id === shown?.id)?.parts || []).map((part) => part.name)}
              />
            )}
          />
          {promptsOpen ? (
            <PromptPanel
              target={promptTarget}
              onClearTarget={() => setPromptTarget(null)}
              history={askHistory}
              onSend={(entry) => setAskHistory((items) => [...items, entry])}
              onClose={() => setPromptsOpen(false)}
            />
          ) : null}
        </div>
      ) : (
        <div className="lb-doc">
          <aside className="lb-doc-tree">
            <div className="lb-tree-title">{doc.name}</div>
            {built.toolsToolkit ? (
              <button type="button" className="lb-tree-item" onClick={() => document.getElementById('inf-tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                <FileText size={14} />
                Toolkit
              </button>
            ) : null}
            {built.steps.map((step) => (
              <button
                key={step.id}
                type="button"
                className="lb-tree-item"
                onClick={() => document.getElementById(`inf-${step.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                <FileText size={14} />
                {`Step ${step.n}`}
              </button>
            ))}
          </aside>
          <div className="lb-doc-stage">
            <div className="lb-doc-canvas">
              {built.toolsToolkit ? (
                <article id="inf-tools" className="lb-sheet">
                  <div className="lb-sheet-head">
                    <h2>Toolkit</h2>
                    <span>Pulled from the steps</span>
                  </div>
                  <div className="lb-sheet-body">
                    <ul className="inf-kit">
                      {built.tools.map((tool) => <li key={tool}>{tool}</li>)}
                    </ul>
                  </div>
                </article>
              ) : null}
              {built.references.length ? (
                <article className="lb-sheet">
                  <div className="lb-sheet-head">
                    <h2>{built.title}</h2>
                    <span>{built.source}</span>
                  </div>
                  <div className="lb-sheet-body">
                    <p className="inf-tools">Reference documents</p>
                    <ul className="inf-kit">
                      {built.references.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </article>
              ) : null}
              {built.asTable ? (
                <article className="lb-sheet">
                  <div className="lb-sheet-head">
                    <h2>{built.title}</h2>
                    <span>Kept as a table</span>
                  </div>
                  <div className="lb-sheet-body">
                    <table className="inf-source-table">
                      <thead>
                        <tr>
                          <th>Step</th>
                          <th>Action</th>
                          <th>Tools</th>
                          <th>Visual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {built.steps.map((step) => (
                          <tr key={step.id}>
                            <td>{step.n}</td>
                            <td>
                              {step.action}
                              {step.ctq ? <span className="inf-ctq">CTQ</span> : null}
                            </td>
                            <td>{step.tools.join(', ')}</td>
                            <td>{step.figure ? <Figure kind={step.figure} marks={step.marks} /> : null}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ) : built.steps.map((step) => (
                <article key={step.id} id={`inf-${step.id}`} className="lb-sheet">
                  <div
                    className={`lb-sheet-head lb-pick${promptTarget?.id === step.id ? ' is-prompt-target' : ''}`}
                    onClick={() => { setPromptTarget({ id: step.id, label: step.title }); setPromptsOpen(true); }}
                  >
                    <h2>{`Step ${step.n} — ${step.title}`}</h2>
                    <span>Operation</span>
                  </div>
                  <StepBody
                    step={step}
                    showTools={showStepTools}
                    scopeId={promptTarget?.id}
                    onPick={(item) => { setPromptTarget(item); setPromptsOpen(true); }}
                  />
                </article>
              ))}
              {built.parts.length ? (
                <article className="lb-sheet">
                  <div className="lb-sheet-head">
                    <h2>Parts</h2>
                    <span>Read from the drawing table</span>
                  </div>
                  <div className="lb-sheet-body">
                    <table className="inf-source-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Part</th>
                          <th>Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {built.parts.map((row) => (
                          <tr key={row[1]}>
                            <td>{row[0]}</td>
                            <td>{row[1]}</td>
                            <td>{row[2]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ) : null}
            </div>
          </div>
          {promptsOpen ? (
            <PromptPanel
              target={promptTarget}
              onClearTarget={() => setPromptTarget(null)}
              history={askHistory}
              onSend={(entry) => setAskHistory((items) => [...items, entry])}
              onClose={() => setPromptsOpen(false)}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
