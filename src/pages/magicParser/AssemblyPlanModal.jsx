import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './assembly-plan.css';

const PLAN = [
  {
    title: 'Fixture the frame',
    children: [
      {
        type: 'op',
        name: 'Place weldment on fixture',
        children: [
          { type: 'part', name: 'Weldment frame' },
          { type: 'part', name: 'Datum pads' },
          {
            type: 'asm',
            name: 'Fixture nest',
            children: [
              { type: 'part', name: 'Nest plate' },
              { type: 'part', name: 'Locating pin' },
              {
                type: 'op',
                name: 'Clamp sequence',
                children: [
                  { type: 'part', name: 'Toggle clamp' },
                  { type: 'part', name: 'Clamp pad' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Fasten the flange',
    children: [
      {
        type: 'op',
        name: 'Install cap screws',
        children: [
          { type: 'part', name: 'M6×20 SHCS' },
          { type: 'part', name: 'Washer' },
          {
            type: 'asm',
            name: 'Flange joint',
            children: [
              { type: 'part', name: 'Flange' },
              {
                type: 'op',
                name: 'Torque pattern',
                children: [{ type: 'part', name: '1/4 in torque wrench' }],
              },
            ],
          },
          { type: 'part', name: 'Threadlocker' },
        ],
      },
    ],
  },
  {
    title: 'Press the dowel',
    children: [
      {
        type: 'asm',
        name: 'Dowel joint',
        children: [
          { type: 'part', name: 'Dowel pin' },
          { type: 'part', name: 'Bore' },
          {
            type: 'op',
            name: 'Press',
            children: [{ type: 'part', name: 'Arbor press' }],
          },
        ],
      },
    ],
  },
  {
    title: 'Verify datum contact',
    children: [
      {
        type: 'op',
        name: 'Check the frame sits flat',
        children: [
          { type: 'part', name: 'Feeler gauge' },
          { type: 'part', name: 'Traveler' },
        ],
      },
    ],
  },
];

function partNames(nodes, out = []) {
  (nodes || []).forEach((node) => {
    if (node.type === 'part') out.push(node.name);
    if (node.children) partNames(node.children, out);
  });
  return out;
}

function Icon({ d, children }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children || <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.2 6.2 4.6 8.6 9.8 3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M4.2 2.4 8 6 4.2 9.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BranchIcon() {
  return (
    <Icon>
      <circle cx="6" cy="5" r="2.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="19" r="2.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="12" r="2.2" stroke="currentColor" strokeWidth="2" />
      <path d="M6 7.2v9.6M8.1 5.6c2.2.3 4.2 1.6 5.4 3.6.7 1.2 1.6 2.1 2.5 2.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Icon>
  );
}

function PackageIcon() {
  return (
    <Icon>
      <path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 12 20 7.5M12 12v9M12 12 4 7.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </Icon>
  );
}

function IsolateIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Icon>
  );
}

function FitIcon() {
  return <Icon d="M15 4h5v5M9 20H4v-5M20 4l-7 7M4 20l7-7" />;
}

function RowActions({ label }) {
  return (
    <span className="row-actions">
      <button type="button" aria-label={`Isolate ${label}`} onClick={(event) => event.stopPropagation()}>
        <IsolateIcon />
      </button>
      <button type="button" aria-label={`Fit ${label} to selection`} onClick={(event) => event.stopPropagation()}>
        <FitIcon />
      </button>
    </span>
  );
}

function splitChildren(children) {
  const leading = [];
  let i = 0;
  const list = children || [];
  while (i < list.length && list[i].type === 'part') leading.push(list[i++]);
  return { leading, rest: list.slice(i) };
}

function PartRow({ part }) {
  return (
    <div className="node-row">
      <span className="slot" />
      <span className="glyph"><span className="dot" /></span>
      <span className="node-name is-part">{part.name}</span>
    </div>
  );
}

function PlanNode({ node, nodeKey, collapsed, onToggle, hovered }) {
  const kids = node.children || [];
  const { leading, rest } = splitChildren(kids);
  const open = !collapsed.has(nodeKey);
  return (
    <div className="node">
      <div className={`hoverable${hovered === nodeKey ? ' section-hover' : ''}`} data-hover={nodeKey}>
        <div className="section-main">
          <div className="node-row">
            {kids.length ? (
              <button
                type="button"
                className="chevron"
                aria-expanded={open}
                aria-label={`${open ? 'Collapse' : 'Expand'} ${node.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle(nodeKey);
                }}
              >
                <ChevronIcon />
              </button>
            ) : <span className="slot" />}
            <span className="glyph">{node.type === 'asm' ? <PackageIcon /> : <BranchIcon />}</span>
            <span className="node-name is-strong">{node.name}</span>
            <RowActions label={node.name} />
          </div>
          {leading.length && open ? (
            <div className="fold leading">
              {leading.map((part) => <PartRow key={part.name} part={part} />)}
            </div>
          ) : null}
        </div>
      </div>
      {rest.length && open ? (
        <div className="fold children">
          {rest.map((child, index) => (
            child.type === 'part'
              ? <PartRow key={child.name} part={child} />
              : (
                <PlanNode
                  key={child.name}
                  node={child}
                  nodeKey={`${nodeKey}-${index}`}
                  collapsed={collapsed}
                  onToggle={onToggle}
                  hovered={hovered}
                />
              )
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AssemblyPlanModal({ onClose, onAccept }) {
  const [shown, setShown] = useState(false);
  const [checked, setChecked] = useState(() => PLAN.map(() => true));
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [hovered, setHovered] = useState(null);
  const closeBtn = useRef(null);
  const dialogRef = useRef(null);
  const backdropRef = useRef(null);
  const closing = useRef(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShown(true);
        closeBtn.current?.focus();
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = prev;
    };
  }, []);

  const finish = (scope) => {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    setHovered(null);
    window.setTimeout(() => {
      if (scope) {
        onAccept(PLAN.map((step, index) => ({
          step: index + 1,
          title: step.title,
          checked: checked[index],
          parts: partNames(step.children),
        })), scope);
      }
      onClose();
    }, 160);
  };

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(null);
        return;
      }
      if (event.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const items = [...root.querySelectorAll('button, [href], [tabindex="0"]')].filter((el) => !el.disabled && el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const toggleCheck = (index) => {
    setChecked((prev) => prev.map((value, i) => (i === index ? !value : value)));
  };

  return createPortal(
    <div
      ref={backdropRef}
      className={`ap-backdrop${shown ? ' is-open' : ''}`}
      onClick={(event) => {
        if (event.target === backdropRef.current) finish(null);
      }}
    >
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="plan-head">
          <h2 id="plan-title">Assembly plan</h2>
          <span className="draft-pill">Generated draft</span>
          <button ref={closeBtn} type="button" className="close-btn" aria-label="Close" onClick={() => finish(null)}>×</button>
        </div>
        <div className="plan-actions">
          <button type="button" className="accept" onClick={() => finish('document')}>Create operations and document</button>
          <button type="button" className="accept-secondary" onClick={() => finish('operations')}>Create operations only</button>
          <button type="button" className="accept-quiet" onClick={() => finish(null)}>Do not accept</button>
        </div>
        <div
          className="steps"
          onMouseOver={(event) => {
            const next = event.target.closest('[data-hover]');
            setHovered(next?.dataset.hover || null);
          }}
          onMouseLeave={() => setHovered(null)}
        >
          {PLAN.map((step, index) => {
            const stepKey = `s${index}`;
            return (
              <section
                key={step.title}
                className={`step${!checked[index] ? ' is-off' : ''}${hovered === stepKey ? ' is-block-hover' : ''}`}
              >
                <div className={`hoverable step-hover${hovered === stepKey ? ' section-hover' : ''}`} data-hover={stepKey}>
                  <div className="section-main">
                    <div className="step-row">
                      <span
                        className="check"
                        role="checkbox"
                        aria-checked={checked[index]}
                        tabIndex={0}
                        aria-label={`Include step ${index + 1}`}
                        onClick={() => toggleCheck(index)}
                        onKeyDown={(event) => {
                          if (event.key !== ' ' && event.key !== 'Enter') return;
                          event.preventDefault();
                          toggleCheck(index);
                        }}
                      >
                        <CheckIcon />
                      </span>
                      <div className="step-title">{`Step ${index + 1} — ${step.title}`}</div>
                      <span className="suggested">Suggested</span>
                      <RowActions label={step.title} />
                    </div>
                  </div>
                </div>
                <div className="step-body">
                  {(step.children || []).map((child, childIndex) => (
                    <PlanNode
                      key={child.name}
                      node={child}
                      nodeKey={`${stepKey}-${childIndex}`}
                      collapsed={collapsed}
                      hovered={hovered}
                      onToggle={(key) => {
                        setCollapsed((prev) => {
                          const next = new Set(prev);
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          return next;
                        });
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
