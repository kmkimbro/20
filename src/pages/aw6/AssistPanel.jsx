import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp, Box, Camera, Check, ChevronDown, ChevronUp, ClipboardCheck, Hexagon, Layers, Loader2, Sparkles, X,
} from 'lucide-react';
import { generatedOperations, modelParts, samplePlan } from './model.js';

const BLANK_STARTERS = [
  {
    id: 'wi',
    icon: Layers,
    title: 'Work instructions',
    detail: 'Work out the assembly order and build an operation for each step, with a screenshot and parts.',
    prompt: 'Build work instructions from the CAD. Work out the assembly order and make an operation for each step with a screenshot and a parts table.',
  },
  {
    id: 'parts',
    icon: Hexagon,
    title: 'Parts list',
    detail: 'Fill the Bill of Materials with every part, its number and quantity.',
    prompt: 'List every part in the CAD with its item number, part number, name, and quantity in the Bill of Materials.',
  },
  {
    id: 'qc',
    icon: ClipboardCheck,
    title: 'Quality checklist',
    detail: 'Add inspection checks for the parts in the model.',
    prompt: 'Add a quality checklist with inspection checks for the parts in the model.',
  },
];

const IMPORT_STARTERS = [
  {
    id: 'shots',
    icon: Camera,
    title: 'Screenshots and parts from the CAD',
    detail: 'Add a matching CAD screenshot and parts table to each imported step.',
    prompt: 'Add a CAD screenshot and the parts table to each operation step, matched to its page.',
  },
  {
    id: 'parts',
    icon: Hexagon,
    title: 'Parts list',
    detail: 'Fill the Bill of Materials from the CAD.',
    prompt: 'List every part in the CAD with its item number, part number, name, and quantity in the Bill of Materials.',
  },
  {
    id: 'qc',
    icon: ClipboardCheck,
    title: 'Quality checklist',
    detail: 'Add inspection checks for the parts in the model.',
    prompt: 'Add a quality checklist with inspection checks for the parts in the model.',
  },
];

function intentOf(text) {
  const value = text.toLowerCase();
  if (/work instruction/.test(value)) return 'wi';
  if (/screenshot|picture|image|photo/.test(value)) return 'shots';
  if (/check|quality|inspect/.test(value)) return 'qc';
  if (/parts? list|bill of materials|bom|every part/.test(value)) return 'parts';
  if (/work instruction|assembl|operation|steps?/.test(value)) return 'wi';
  return null;
}

function GuideStep({ state, title, children }) {
  return (
    <li className={`aw6-guide-step is-${state}`}>
      <span className="aw6-guide-dot" aria-hidden="true">
        {state === 'done' ? <Check size={11} strokeWidth={3} /> : null}
      </span>
      <div>
        <strong>{title}</strong>
        {children}
      </div>
    </li>
  );
}

export default function AssistPanel({
  doc, nav, cadReady, progress, activeCadOp, activeCadIndex,
  onOpenCad, onOpenDoc, onCapture, onUpdate, onClose, onShowPage,
}) {
  const [text, setText] = useState('');
  const [starter, setStarter] = useState(null);
  const [busy, setBusy] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const inputRef = useRef(null);
  const endRef = useRef(null);
  const messages = doc.messages || [];
  const imported = doc.start === 'import';
  const starters = imported ? IMPORT_STARTERS : BLANK_STARTERS;
  const hasCadContent = doc.operations.some((op) => op.shot != null);
  const opCount = doc.operations.length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, busy]);

  const apply = (intent) => {
    const ops = doc.operations;
    if (intent === 'wi') {
      const allEmpty = ops.every((op) => op.kind === 'empty');
      const made = generatedOperations();
      return {
        patch: { operations: allEmpty ? made : [...ops, ...made] },
        reply: `Built ${made.length} operations from ${doc.cadName} in assembly order. Each one has a screenshot and its parts. If the order needs changing, drag the operations in CAD View.`,
        target: `aw6-sheet-${made[0].id}`,
      };
    }
    if (intent === 'parts') {
      return {
        patch: { bom: true },
        reply: `Filled the Bill of Materials with ${modelParts().length} parts from ${doc.cadName}.`,
        target: 'aw6-sheet-bom',
      };
    }
    if (intent === 'qc') {
      const op = {
        id: `op-qc-${Date.now()}`,
        title: 'Quality checks',
        kind: 'generated',
        checks: [
          'Frame seated on all four datum pads',
          'Base plate locating pins fully engaged',
          'Fasteners torqued to spec and marked',
          'No weld spatter on mating faces',
        ],
      };
      return {
        patch: { operations: [...ops, op] },
        reply: 'Added a Quality checks operation with four inspection checks at the end of the document.',
        target: `aw6-sheet-${op.id}`,
      };
    }
    if (intent === 'shots') {
      const plan = samplePlan();
      return {
        patch: {
          operations: ops.map((op, index) => {
            const sample = plan[index % plan.length];
            return { ...op, shot: index, marks: sample.marks, parts: sample.parts };
          }),
        },
        reply: `Added a CAD screenshot and parts table to all ${ops.length} operation steps, next to their pages. Open CAD View to change a screenshot or the parts on any step.`,
        target: `aw6-sheet-${ops[0]?.id}`,
      };
    }
    return {
      patch: {},
      reply: 'In this prototype I can build work instructions, fill a parts list, add a quality checklist, or add screenshots and parts from the CAD.',
    };
  };

  const send = (raw) => {
    const value = (raw ?? text).trim();
    if (!value || busy) return;
    const intent = starter && starter.prompt === value ? starter.id : intentOf(value);
    setStarter(null);
    const userMsg = { id: `m-${Date.now()}`, from: 'user', text: value };
    setText('');
    if (!cadReady && intent) {
      onUpdate({
        messages: [...messages, userMsg, {
          id: `m-${Date.now()}-a`,
          from: 'assistant',
          text: `${doc.cadName} is still processing. I'll need the model to do this, so try again once CAD View is ready.`,
        }],
      });
      return;
    }
    onUpdate({ messages: [...messages, userMsg] });
    setBusy(true);
    window.setTimeout(() => {
      const result = apply(intent);
      onUpdate({
        ...result.patch,
        messages: [...messages, userMsg, { id: `m-${Date.now()}-a`, from: 'assistant', text: result.reply }],
      });
      setBusy(false);
      if (result.target && nav === 'doc') onShowPage(result.target);
    }, 2200);
  };

  const cadStatus = cadReady
    ? <span className="aw6-status is-ready">CAD ready</span>
    : <span className="aw6-status"><Loader2 size={11} className="aw6-spin" />{`Processing ${progress}%`}</span>;

  const guide = nav === 'cad' ? (
    <section className="aw6-guide">
      <header>
        <strong>Working in CAD View</strong>
      </header>
      <p className="aw6-guide-why">
        Screenshots and parts taken here stay linked to the model, so when the CAD changes Quarter20 can flag which steps need updating.
      </p>
      <ol className="aw6-guide-steps">
        <GuideStep state="todo" title="Choose an operation">
          <span>Pick it in the Operations list on the right.</span>
        </GuideStep>
        <GuideStep state="todo" title="Select its parts">
          <span>Click parts in the assembly tree or on the model.</span>
        </GuideStep>
        <GuideStep state="todo" title="Take a screenshot">
          <span>Frame the view, then capture it into the step.</span>
        </GuideStep>
      </ol>
      {activeCadOp && cadReady ? (
        <div className="aw6-guide-actions">
          <button type="button" className="q20-btn q20-btn--secondary q20-btn--sm" onClick={() => onCapture(activeCadOp.id)}>
            <Camera size={14} />
            {`Capture for operation ${activeCadIndex + 1}`}
          </button>
        </div>
      ) : null}
      <button type="button" className="aw6-text-btn" onClick={onOpenDoc}>Back to the Document Editor</button>
    </section>
  ) : (
    <section className="aw6-guide">
      <header>
        <strong>Getting started</strong>
        <button type="button" className="aw6-icon-btn" aria-label={guideOpen ? 'Hide guide' : 'Show guide'} onClick={() => setGuideOpen((v) => !v)}>
          {guideOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </header>
      {guideOpen ? (
        <ol className="aw6-guide-steps">
          <GuideStep state="done" title={imported ? 'Document imported' : 'Blank document created'}>
            <span>
              {imported
                ? `${doc.sourceName} came in as ${doc.pageCount} operation steps, one per page.`
                : `It is built on ${doc.cadName} and starts with one empty operation.`}
            </span>
          </GuideStep>
          <GuideStep state={doc.cadVisited ? 'done' : 'now'} title="Open CAD View">
            <span>
              CAD View is where your model lives. Screenshots and parts you take there stay linked to the CAD, so the
              document can be updated when the design changes.
            </span>
            <div className="aw6-guide-row">
              {cadStatus}
              <button type="button" className="q20-btn q20-btn--secondary q20-btn--sm" onClick={onOpenCad}>
                <Box size={14} /> Open CAD View
              </button>
            </div>
          </GuideStep>
          <GuideStep state={hasCadContent ? 'done' : 'todo'} title={imported ? 'Add screenshots and parts to each step' : 'Build your operations'}>
            <span>
              {imported
                ? 'Do it step by step in CAD View, or ask below to add them all at once.'
                : 'Write them yourself with the toolbar, or ask below to build them from the CAD.'}
            </span>
          </GuideStep>
        </ol>
      ) : null}
    </section>
  );

  return (
    <aside className="lb-panel aw6-panel" aria-label="Assistant">
      <div className="aw6-panel-head">
        <Sparkles size={15} />
        <strong>Assistant</strong>
        <button type="button" className="aw6-icon-btn" aria-label="Close assistant" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div className="aw6-panel-body">
        {guide}
        {nav === 'doc' ? (
          <section className="aw6-starters">
            <div className="aw6-section-label">{imported ? 'Finish from your CAD' : 'Build from your CAD'}</div>
            {!cadReady ? <p className="aw6-muted">These use the model, so they unlock when the CAD is ready.</p> : null}
            {starters.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="aw6-starter"
                  disabled={!cadReady || busy}
                  onClick={() => { setText(item.prompt); setStarter(item); inputRef.current?.focus(); }}
                >
                  <span className="aw6-starter-icon" aria-hidden="true"><Icon size={15} /></span>
                  <span>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </span>
                </button>
              );
            })}
          </section>
        ) : null}
        {messages.length || busy ? (
          <section className="aw6-thread" aria-label="Conversation">
            {messages.map((msg) => (
              <div key={msg.id} className={`aw6-msg is-${msg.from}`}>{msg.text}</div>
            ))}
            {busy ? (
              <div className="aw6-msg is-assistant is-busy">
                <Loader2 size={13} className="aw6-spin" /> Working on it
              </div>
            ) : null}
            <div ref={endRef} />
          </section>
        ) : null}
      </div>
      <form className="aw6-compose" onSubmit={(event) => { event.preventDefault(); send(); }}>
        <textarea
          ref={inputRef}
          value={text}
          rows={3}
          placeholder={`Ask about ${opCount === 1 ? 'this document' : `these ${opCount} operations`}`}
          aria-label="Message the assistant"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />
        <button type="submit" className="aw6-send" aria-label="Send" disabled={!text.trim() || busy}>
          <ArrowUp size={16} />
        </button>
      </form>
    </aside>
  );
}

