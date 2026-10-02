import { useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import InteractionFrame from './InteractionFrame.jsx';

const INITIAL = [
  {
    id: 's1',
    status: 'kept',
    text: 'Place the weldment frame on the fixture and seat it against the datum pads.',
    altText: 'Lower the frame onto the fixture.',
    pins: [],
  },
  {
    id: 's2',
    status: 'ghost',
    text: 'Install the cap screws through the flange holes and seat until flush.',
    altText: 'Run the cap screws in by hand until the heads sit flush.',
    pins: [{ id: 'part', cad: 'P-118 M6×20 SHCS', suggested: 'P-118', locked: true }],
  },
  {
    id: 's3',
    status: 'ghost',
    text: 'Torque the cap screws in a star pattern.',
    altText: 'Tighten in two passes so the bracket does not lift.',
    pins: [{ id: 'torque', cad: '12 N·m', suggested: '9 N·m', locked: true }],
  },
  {
    id: 's4',
    status: 'ghost',
    text: 'Apply threadlocker, then press the dowel into the bore.',
    altText: 'Press the dowel in dry. Threadlocker is not called on this joint.',
    pins: [{ id: 'dowel', cad: 'P-204 Dowel pin', suggested: 'Omit pin', locked: true }],
  },
  {
    id: 's5',
    status: 'ghost',
    text: 'Confirm the frame sits flat on the datum pads.',
    altText: 'Rock the frame on the datum pads. A gap means the screws are uneven.',
    pins: [],
  },
  {
    id: 's6',
    status: 'ghost',
    text: 'Record the torque in the traveler and sign the step.',
    altText: 'Stamp the traveler. Leave the torque cell blank if it was already recorded.',
    pins: [],
  },
];

function outsideSheet(sheet, x, y) {
  if (!sheet) return false;
  const rect = sheet.getBoundingClientRect();
  return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
}

export default function GhostSteps({ document: doc, onBack }) {
  const sheetRef = useRef(null);
  const [steps, setSteps] = useState(INITIAL);
  const [drag, setDrag] = useState(null);

  const ghosts = steps.filter((step) => step.status === 'ghost').length;

  const keep = (id) => {
    setSteps((prev) => prev.map((step) => (step.id === id ? { ...step, status: 'kept' } : step)));
  };

  const rewrite = (id) => {
    setSteps((prev) => prev.map((step) => {
      if (step.id !== id) return step;
      return { ...step, text: step.altText, status: 'ghost' };
    }));
  };

  const togglePin = (stepId, pinId) => {
    setSteps((prev) => prev.map((step) => {
      if (step.id !== stepId) return step;
      return {
        ...step,
        pins: step.pins.map((pin) => (pin.id === pinId ? { ...pin, locked: !pin.locked } : pin)),
      };
    }));
  };

  const editText = (id, text) => {
    setSteps((prev) => prev.map((step) => (
      step.id === id ? { ...step, text, status: 'kept' } : step
    )));
  };

  const startDrag = (event, step) => {
    if (step.status !== 'ghost') return;
    event.preventDefault();
    const originX = event.clientX;
    const originY = event.clientY;
    const move = (ev) => {
      setDrag({
        id: step.id,
        dx: ev.clientX - originX,
        dy: ev.clientY - originY,
        outside: outsideSheet(sheetRef.current, ev.clientX, ev.clientY),
      });
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const droppedOutside = outsideSheet(sheetRef.current, ev.clientX, ev.clientY);
      setDrag(null);
      if (droppedOutside) {
        setSteps((prev) => prev.filter((entry) => entry.id !== step.id));
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const tree = steps.map((step, index) => (
    <button key={step.id} type="button" className="lb-tree-item is-nested" onClick={() => {
      document.getElementById(`ai-step-${step.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }}
    >
      {index + 1}. {step.status === 'ghost' ? 'Suggested' : 'Kept'}
    </button>
  ));

  return (
    <InteractionFrame
      doc={doc}
      onBack={onBack}
      tree={tree}
      banner={ghosts
        ? `${ghosts} suggested step${ghosts === 1 ? '' : 's'} came from the assembly order. Keep one, edit it, or drag it off the page. Pinned values stay on the CAD number until you unpin them.`
        : 'The suggested steps are resolved. What is left on the page is the work instruction.'}
    >
      <article className="ai-sheet" ref={sheetRef}>
        <div className="ai-doc-kicker">Work instruction</div>
        <h1 className="ai-doc-title">Frame weldment</h1>
        <p className="ai-doc-sub">Step 1 was written by hand. The rest arrived from the assembly.</p>
        {steps.length === 0 ? (
          <div className="ai-empty">Every suggested step was dragged off the page.</div>
        ) : null}
        {steps.map((step, index) => {
          const dragging = drag?.id === step.id;
          return (
            <div
              id={`ai-step-${step.id}`}
              key={step.id}
              className={`ai-step${step.status === 'ghost' ? ' ai-ghost' : ''}${dragging ? ' is-dragging' : ''}${dragging && drag.outside ? ' is-outside' : ''}`}
              style={dragging ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
            >
              <div className="ai-step-num">{index + 1}</div>
              <div className="ai-step-body">
                <p
                  key={step.text}
                  className="ai-step-text"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(event) => {
                    const next = event.currentTarget.textContent || '';
                    if (next !== step.text) editText(step.id, next);
                  }}
                >
                  {step.text}
                </p>
                {step.pins.length ? (
                  <div className="ai-pins">
                    {step.pins.map((pin) => (
                      <button
                        key={pin.id}
                        type="button"
                        className={`ai-pin${pin.locked ? '' : ' is-open'}`}
                        title={pin.locked ? 'Pinned from CAD. Click to unpin.' : 'Unpinned, so the other candidate value is showing.'}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => togglePin(step.id, pin.id)}
                      >
                        {pin.locked ? pin.cad : pin.suggested}
                        {pin.locked ? ' · pinned' : ' · unpinned'}
                      </button>
                    ))}
                  </div>
                ) : null}
                {step.status === 'ghost' ? (
                  <div className="ai-step-actions">
                    <button type="button" className="ai-mini is-primary" onMouseDown={(event) => event.preventDefault()} onClick={() => keep(step.id)}>Keep</button>
                    <button type="button" className="ai-mini" onMouseDown={(event) => event.preventDefault()} onClick={() => rewrite(step.id)}>Rewrite</button>
                    <span className="ai-drag" onPointerDown={(event) => startDrag(event, step)}>
                      <GripVertical size={12} /> Drag off the page
                    </span>
                  </div>
                ) : (
                  <div className="ai-status">Kept</div>
                )}
              </div>
            </div>
          );
        })}
      </article>
    </InteractionFrame>
  );
}
