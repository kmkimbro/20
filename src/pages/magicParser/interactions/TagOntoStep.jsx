import { useRef, useState } from 'react';
import InteractionFrame from './InteractionFrame.jsx';

const TOOLKIT = [
  { group: 'Parts', items: [
    { id: 'p118', type: 'part', name: 'M6×20 SHCS', meta: 'P-118' },
    { id: 'p014', type: 'part', name: 'Bracket, weldment', meta: 'P-014' },
    { id: 'p204', type: 'part', name: 'Dowel pin', meta: 'P-204' },
  ] },
  { group: 'Tools', items: [
    { id: 'tw', type: 'tool', name: '1/4 in torque wrench', meta: 'Tool library' },
    { id: 'hex', type: 'tool', name: '5 mm hex key', meta: 'Tool library' },
  ] },
  { group: 'Procedures', items: [
    { id: 'seat', type: 'procedure', name: 'Seat fastener', meta: 'Reusable', body: 'Seat until the head is flush. Do not overtighten.' },
    { id: 'torque', type: 'procedure', name: 'Torque sequence', meta: 'Reusable', body: 'Torque to 12 N·m in a star pattern.' },
    { id: 'locker', type: 'procedure', name: 'Apply threadlocker', meta: 'Reusable', body: 'Apply threadlocker to the threads before install.' },
  ] },
];

const ITEMS = TOOLKIT.flatMap((group) => group.items);

function compose(tags) {
  const parts = tags.filter((tag) => tag.type === 'part');
  const tool = tags.find((tag) => tag.type === 'tool');
  const procedures = tags.filter((tag) => tag.type === 'procedure');
  if (!parts.length && !tool && !procedures.length) return '';
  const sentences = [];
  const partName = parts.map((part) => part.name).join(' and ');
  if (tool && partName) sentences.push(`Using ${tool.name}, install ${partName} and seat until flush.`);
  else if (partName) sentences.push(`Install ${partName} and seat until flush.`);
  else if (tool) sentences.push(`Use ${tool.name} for this operation.`);
  procedures.forEach((procedure) => sentences.push(procedure.body));
  return sentences.join(' ');
}

function addTag(tags, item) {
  if (tags.some((tag) => tag.id === item.id)) return tags;
  if (item.type === 'tool') return [...tags.filter((tag) => tag.type !== 'tool'), item];
  return [...tags, item];
}

function readItem(event) {
  const raw = event.dataTransfer.getData('text/plain');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return ITEMS.find((item) => item.id === parsed.id) || null;
  } catch {
    return null;
  }
}

const INITIAL_STEPS = [
  { id: 's1', tags: [] },
  { id: 's2', tags: [] },
  { id: 's3', tags: [] },
];

export default function TagOntoStep({ document: doc, onBack }) {
  const dragged = useRef(false);
  const [armed, setArmed] = useState(null);
  const [hot, setHot] = useState(null);
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const [callouts, setCallouts] = useState([]);

  const take = (item, target) => {
    if (!item) return;
    if (target === 'shot') {
      setCallouts((prev) => (prev.some((tag) => tag.id === item.id) ? prev : [...prev, item]));
      return;
    }
    setSteps((prev) => prev.map((step) => (
      step.id === target ? { ...step, tags: addTag(step.tags, item) } : step
    )));
  };

  const aside = (
    <aside className="ai-toolkit">
      <h2>Toolkit</h2>
      <p className="ai-toolkit-note">Drag a part, tool, or procedure onto a step or the screenshot. Or select one, then click the step.</p>
      {TOOLKIT.map((group) => (
        <div key={group.group}>
          <div className="ai-toolkit-label">{group.group}</div>
          {group.items.map((item) => (
            <button
              key={item.id}
              type="button"
              draggable
              className={`ai-kit-item${armed?.id === item.id ? ' is-armed' : ''}`}
              onDragStart={(event) => {
                dragged.current = true;
                event.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id }));
                event.dataTransfer.effectAllowed = 'copy';
                setArmed(item);
              }}
              onClick={() => {
                if (dragged.current) {
                  dragged.current = false;
                  return;
                }
                setArmed((current) => (current?.id === item.id ? null : item));
              }}
            >
              <strong>{item.name}</strong>
              <span>{item.meta}</span>
            </button>
          ))}
        </div>
      ))}
    </aside>
  );

  const tree = (
    <>
      <button type="button" className="lb-tree-item is-nested" onClick={() => document.getElementById('ai-shot')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
        Live screenshot
      </button>
      {steps.map((step, index) => (
        <button
          key={step.id}
          type="button"
          className="lb-tree-item is-nested"
          onClick={() => document.getElementById(`ai-step-${step.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        >
          Step {index + 1}{step.tags.length ? ` · ${step.tags.length} tagged` : ''}
        </button>
      ))}
    </>
  );

  return (
    <InteractionFrame
      doc={doc}
      onBack={onBack}
      tree={tree}
      aside={aside}
      banner="Tag a part, tool, or procedure onto a step and the sentence fills in from the toolkit. Drop one on the live screenshot to bind a callout."
    >
      <article className="ai-sheet">
        <div className="ai-doc-kicker">Work instruction</div>
        <h1 className="ai-doc-title">Frame weldment</h1>
        <p className="ai-doc-sub">The steps are empty until something from the toolkit lands on them.</p>
        <div
          id="ai-shot"
          className={`ai-shot-card${hot === 'shot' ? ' is-hot' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setHot('shot'); }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget)) return;
                setHot((current) => (current === 'shot' ? null : current));
              }}
          onDrop={(event) => {
            event.preventDefault();
            setHot(null);
            take(readItem(event) || armed, 'shot');
            setArmed(null);
          }}
          onClick={() => { if (armed) { take(armed, 'shot'); setArmed(null); } }}
        >
          <div className="ai-shot" aria-hidden>
            <div className="ai-shot-chips">
              {callouts.map((tag) => (
                <span key={tag.id} className="ai-tag">
                  {tag.name}
                  <button type="button" aria-label={`Remove ${tag.name}`} onClick={(event) => {
                    event.stopPropagation();
                    setCallouts((prev) => prev.filter((entry) => entry.id !== tag.id));
                  }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="ai-shot-caption">
            <span>{callouts.length ? 'Callouts bound to the live screenshot.' : 'Live screenshot · drop a part or tool to bind a callout'}</span>
          </div>
        </div>
        {steps.map((step, index) => {
          const sentence = compose(step.tags);
          return (
            <div
              id={`ai-step-${step.id}`}
              key={step.id}
              className={`ai-step${!sentence ? ' ai-drop' : ''}${hot === step.id ? ' is-hot' : ''}`}
              onDragOver={(event) => { event.preventDefault(); setHot(step.id); }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget)) return;
                setHot((current) => (current === step.id ? null : current));
              }}
              onDrop={(event) => {
                event.preventDefault();
                setHot(null);
                take(readItem(event) || armed, step.id);
                setArmed(null);
              }}
              onClick={() => { if (armed) { take(armed, step.id); setArmed(null); } }}
            >
              <div className="ai-step-num">{index + 1}</div>
              <div className="ai-step-body">
                {step.tags.length ? (
                  <div className="ai-tags">
                    {step.tags.map((tag) => (
                      <span key={tag.id} className="ai-tag">
                        {tag.name}
                        <button
                          type="button"
                          aria-label={`Remove ${tag.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSteps((prev) => prev.map((entry) => (
                              entry.id === step.id
                                ? { ...entry, tags: entry.tags.filter((item) => item.id !== tag.id) }
                                : entry
                            )));
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                {sentence
                  ? <p className="ai-step-text">{sentence}</p>
                  : <p className="ai-placeholder">Drop a part, tool, or procedure here.</p>}
              </div>
            </div>
          );
        })}
      </article>
    </InteractionFrame>
  );
}
