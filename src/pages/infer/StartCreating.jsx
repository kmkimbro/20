import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check, ClipboardCheck, ClipboardList, Copy, File, FileText, Hexagon, Layers, LayoutTemplate, Loader2, Palette, Plus, Sparkles, Upload,
  X,
} from 'lucide-react';
import './start-creating.css';

// AI workflow 5 (prompts): after the CAD is uploaded, one "Let's start creating" screen, modeled on Google Slides.
// AI generators, Templates, Import (an existing document to match), and Blank.

const GENERATORS = [
  {
    id: 'work_instruction',
    label: 'Work instruction',
    detail: 'Generate a full work instruction with steps, images, and parts.',
    art: 'wi',
    icon: ClipboardList,
    prompt: 'Generate a work instruction from the CAD. Add an operation for each step with a screenshot, a short note, and a parts table.',
    chips: ['Screenshot each step', 'Parts table on each step', 'Callouts on images', 'Safety notes'],
  },
  {
    id: 'parts_list',
    label: 'Parts list',
    detail: 'List every part in the model with numbers and quantities.',
    art: 'parts',
    icon: Hexagon,
    prompt: 'List every part in the CAD with its item number, part number, name, and quantity.',
    chips: ['Group by subassembly', 'Add part thumbnails', 'Include materials'],
  },
  {
    id: 'auto_assembly',
    label: 'Assembly steps',
    detail: 'Work out an assembly order and build an operation for each step.',
    art: 'wi',
    icon: Layers,
    prompt: 'Read the CAD and suggest an order to assemble the parts in. Create an operation for each step with a screenshot of the parts being added.',
    chips: ['Parts used in each step', 'Exploded views', 'Tools for each step'],
  },
  {
    id: 'quality_checklist',
    label: 'Quality checklist',
    detail: 'Create inspection checks for the parts in your model.',
    art: 'quality',
    icon: ClipboardCheck,
    prompt: 'Create an inspection check for each part with what to measure, the expected result, and a pass or fail field.',
    chips: ['Image for each check', 'Notes field', 'Sign-off section'],
  },
];

const TEMPLATES = [
  { id: 'work_instruction', label: 'Work instruction', art: 'wi' },
  { id: 'quality_checklist', label: 'Quality checklist', art: 'quality' },
  { id: 'parts_list', label: 'Parts list', art: 'parts' },
  { id: 'drawing_release', label: 'Drawing package', art: 'drawing' },
  { id: 'training', label: 'Training guide', art: 'wi' },
  { id: 'inspection', label: 'First article inspection', art: 'quality' },
];

const SOURCE = 'Drone Assembly Work Instruction.pdf';
const SOURCE_PAGES = [
  { title: 'Drone Assembly', kind: 'cover' },
  { title: 'Parts list', kind: 'table' },
  { title: '1. Place the frame', kind: 'step' },
  { title: '2. Mount the motors', kind: 'step' },
  { title: '3. Attach the arms', kind: 'step' },
  { title: '4. Install the battery tray', kind: 'step' },
  { title: '5. Wire the controller', kind: 'step' },
  { title: '6. Fit the propellers', kind: 'step' },
];

// The prompts the client copies off the AI Control page today. They run when you duplicate a document,
// and they are offered again in the Ask panel.
export const IMPORT_PROMPTS = [
  { id: 'images', label: 'Extract images', prompt: 'Extract the images from the work instructions for this section. Name each image Step Number_Image Number.' },
  { id: 'text', label: 'Extract step text', prompt: 'Extract the text exactly from each operation step, make an operation for each one, and rename it to say what is done in it.' },
  { id: 'placement', label: 'Match images and callouts', prompt: 'Add the matching image to each operation in the same place as the document, with its annotations.' },
  { id: 'parts', label: 'Add parts to steps', prompt: 'Add the matching parts from the CAD to each operation step.' },
  { id: 'table', label: 'Parts table on each step', prompt: 'Add a parts table to each operation step.' },
  { id: 'layout', label: 'Fix overlaps', prompt: 'Make sure that nothing overlaps on each document page.' },
];

const RUN_STEP_MS = 1000;

export default function StartCreating({ cadName, cadStatus, onStart }) {
  const [view, setView] = useState('home');
  const [gen, setGen] = useState(null);
  const [text, setText] = useState('');
  const [chips, setChips] = useState([]);
  const [template, setTemplate] = useState(null);
  const [pages, setPages] = useState([]);
  const [keepFormat, setKeepFormat] = useState(true);
  const [mode, setMode] = useState('format');
  const [run, setRun] = useState(null);
  const startRef = useRef(onStart);
  startRef.current = onStart;

  const openGen = (item) => {
    setGen(item);
    setText(item.prompt);
    setChips([]);
    setView('generate');
  };

  const toggleChip = (chip) => setChips((current) => (
    current.includes(chip) ? current.filter((item) => item !== chip) : [...current, chip]
  ));

  const start = (steps, detail) => setRun({ steps, detail, at: 0 });

  useEffect(() => {
    if (!run) return undefined;
    const id = window.setTimeout(() => {
      if (run.at + 1 >= run.steps.length) startRef.current(run.detail);
      else setRun({ ...run, at: run.at + 1 });
    }, RUN_STEP_MS);
    return () => window.clearTimeout(id);
  }, [run]);

  const generate = () => start(
    [`Reading ${cadName}`, ...chips.length ? chips : [], `Building your ${gen.label.toLowerCase()}`],
    {
      prompt: [text.trim(), ...chips].filter(Boolean).join('\n'),
      picks: chips,
      docType: gen.id,
      templateId: gen.id === 'auto_assembly' ? 'work_instruction' : gen.id,
      sourceName: '',
    },
  );

  const useTemplate = () => onStart({
    prompt: '', picks: [], docType: 'template', templateId: template, sourceName: '',
  });

  const importPages = () => start(
    mode === 'duplicate'
      ? [`Reading ${pages.length} pages of ${SOURCE}`, ...IMPORT_PROMPTS.map((item) => item.label)]
      : [`Reading the layout of ${SOURCE}`, 'Matching the header, footer, and styles', `Building the steps from ${cadName}`],
    {
      prompt: mode === 'duplicate' ? IMPORT_PROMPTS.map((item) => item.prompt).join('\n') : 'Match the format of the imported document.',
      picks: mode === 'duplicate' ? IMPORT_PROMPTS.map((item) => item.id) : [],
      docType: 'import',
      importMode: mode,
      keepFormat,
      templateId: 'work_instruction',
      sourceName: SOURCE,
    },
  );

  let body;
  if (run) {
    body = (
      <div className="sc-pane sc-run">
        <h2>Creating your document</h2>
        <ol>
          {run.steps.map((label, index) => (
            <li key={label} className={index < run.at ? 'is-done' : index === run.at ? 'is-now' : ''}>
              <span aria-hidden="true">
                {index < run.at ? <Check size={12} strokeWidth={3} /> : index === run.at ? <Loader2 size={13} /> : null}
              </span>
              {label}
            </li>
          ))}
        </ol>
      </div>
    );
  } else if (view === 'generate') {
    body = (
      <div className="sc-pane">
        <PaneHead title={gen.label} onBack={() => setView('home')} />
        <p className="sc-lead">{`We'll read ${cadName} and generate it for you. Change the prompt if you like.`}</p>
        <textarea className="sc-text" aria-label="Prompt" rows={4} value={text} onChange={(event) => setText(event.target.value)} />
        <p className="sc-label">Add to it</p>
        <div className="sc-chips">
          {gen.chips.map((chip) => (
            <button key={chip} type="button" className={chips.includes(chip) ? 'is-on' : ''} aria-pressed={chips.includes(chip)} onClick={() => toggleChip(chip)}>
              {chips.includes(chip) ? <Check size={14} strokeWidth={2.5} /> : <Plus size={14} />}
              {chip}
            </button>
          ))}
        </div>
        <div className="sc-foot">
          <button type="button" className="sc-link" onClick={() => setView('home')}>Back</button>
          <button type="button" className="sc-primary" disabled={!text.trim()} onClick={generate}>
            <Sparkles size={14} />
            Create
          </button>
        </div>
      </div>
    );
  } else if (view === 'templates') {
    body = (
      <div className="sc-pane">
        <PaneHead title="Templates" onBack={() => setView('home')} />
        <div className="sc-templates">
          {TEMPLATES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={template === item.id ? 'is-on' : ''}
              aria-pressed={template === item.id}
              onClick={() => setTemplate(item.id)}
            >
              <span className="sc-thumb"><Art kind={item.art} /></span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </div>
        <div className="sc-foot">
          <button type="button" className="sc-link" onClick={() => setView('home')}>Back</button>
          <button type="button" className="sc-primary" disabled={!template} onClick={useTemplate}>Use template</button>
        </div>
      </div>
    );
  } else if (view === 'import') {
    const all = pages.length === SOURCE_PAGES.length;
    body = (
      <div className="sc-pane">
        <PaneHead title="Import pages" onBack={() => setView('home')} />
        <div className="sc-import-bar">
          <span className="sc-file"><FileText size={18} />{SOURCE}</span>
          <span className="sc-count">{`${pages.length} out of ${SOURCE_PAGES.length} pages selected`}</span>
          <button type="button" className="sc-link" onClick={() => setPages(SOURCE_PAGES.map((_, index) => index))} disabled={all}>Select all</button>
          <button type="button" className="sc-link" onClick={() => setPages([])} disabled={!pages.length}>Clear</button>
        </div>
        <label className="sc-keep">
          <Palette size={16} />
          <span>Keep original format</span>
          <input type="checkbox" checked={keepFormat} onChange={(event) => setKeepFormat(event.target.checked)} />
          <span className={`sc-box${keepFormat ? ' is-on' : ''}`} aria-hidden="true">{keepFormat ? <Check size={12} strokeWidth={3} /> : null}</span>
        </label>
        <div className="sc-pages">
          {SOURCE_PAGES.map((page, index) => {
            const on = pages.includes(index);
            return (
              <button
                key={page.title}
                type="button"
                className={on ? 'is-on' : ''}
                aria-pressed={on}
                aria-label={`Page ${index + 1}: ${page.title}`}
                onClick={() => setPages((current) => (on ? current.filter((item) => item !== index) : [...current, index].sort((a, b) => a - b)))}
              >
                <span className={`sc-box${on ? ' is-on' : ''}`} aria-hidden="true">{on ? <Check size={12} strokeWidth={3} /> : null}</span>
                <SourcePage page={page} />
                <em>{index + 1}</em>
              </button>
            );
          })}
        </div>
        <div className="sc-foot">
          <button type="button" className="sc-link" onClick={() => setView('home')}>Back</button>
          <button type="button" className="sc-primary" disabled={!pages.length} onClick={() => setView('mode')}>Next</button>
        </div>
      </div>
    );
  } else if (view === 'mode') {
    body = (
      <div className="sc-pane">
        <PaneHead title="How should we use it?" onBack={() => setView('import')} />
        <p className="sc-lead">{`${pages.length} ${pages.length === 1 ? 'page' : 'pages'} from ${SOURCE}`}</p>
        <div className="sc-modes" role="radiogroup" aria-label="How should we use it?">
          <button type="button" role="radio" aria-checked={mode === 'format'} className={mode === 'format' ? 'is-on' : ''} onClick={() => setMode('format')}>
            <span className="sc-mode-icon"><LayoutTemplate size={18} /></span>
            <strong>Match its format</strong>
            <span>Use its layout, header, footer, and styles. The steps and parts come from your CAD.</span>
          </button>
          <button type="button" role="radio" aria-checked={mode === 'duplicate'} className={mode === 'duplicate' ? 'is-on' : ''} onClick={() => setMode('duplicate')}>
            <span className="sc-mode-icon"><Copy size={18} /></span>
            <strong>Duplicate it</strong>
            <span>Bring its text, images, and parts into Quarter20 too, so it matches the original.</span>
          </button>
        </div>
        <div className="sc-foot">
          <button type="button" className="sc-link" onClick={() => setView('import')}>Back</button>
          <button type="button" className="sc-primary" onClick={importPages}>Import</button>
        </div>
      </div>
    );
  } else {
    const blank = () => onStart({ prompt: '', picks: [], docType: 'blank', sourceName: '' });
    body = (
      <>
        <div className="sc-top">
          <div>
            <span className="sc-eyebrow">{cadName}</span>
            <h2>How do you want to start?</h2>
          </div>
          <button type="button" className="sc-x" aria-label="Close" onClick={blank}><X size={18} /></button>
        </div>
        <div className="sc-pane">
          {cadStatus ? <p className="sc-status">{cadStatus}</p> : null}
          <p className="sc-label">Generate from your CAD</p>
          <div className="sc-grid">
            {GENERATORS.map((item) => (
              <Tile key={item.id} icon={item.icon} magic title={item.label} detail={item.detail} onClick={() => openGen(item)} />
            ))}
          </div>
          <p className="sc-label">Or start from</p>
          <div className="sc-grid is-three">
            <Tile icon={LayoutTemplate} title="Templates" detail="Start from a Quarter20 template." onClick={() => setView('templates')} />
            <Tile icon={Upload} title="Import" detail="Use an existing document. Match its format or bring in its content." onClick={() => setView('import')} />
            <Tile icon={File} title="Blank document" detail="Start empty. Nothing is generated." onClick={blank} />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="sc-overlay" role="presentation">
      <div className={`sc-dialog${view === 'home' && !run ? ' is-home' : ''}`} role="dialog" aria-modal="true" aria-label="Let's start creating">
        {body}
      </div>
    </div>
  );
}

function Tile({
  icon: Icon, title, detail, onClick, magic = false,
}) {
  return (
    <button type="button" className="sc-tile" onClick={onClick}>
      <span className="sc-tile-icon" aria-hidden="true"><Icon size={16} /></span>
      <span className="sc-tile-text">
        <strong>
          {title}
          {magic ? <Sparkles className="sc-tile-ai" size={12} /> : null}
        </strong>
        <span>{detail}</span>
      </span>
    </button>
  );
}

function PaneHead({ title, onBack }) {
  return (
    <div className="sc-head">
      <button type="button" className="sc-back" aria-label="Back" onClick={onBack}><ArrowLeft size={18} /></button>
      <h2>{title}</h2>
    </div>
  );
}

function SourcePage({ page }) {
  return (
    <span className={`sc-page is-${page.kind}`}>
      {page.kind === 'cover' ? (
        <>
          <span className="sc-page-logo" />
          <b>{page.title}</b>
          <i>Work instruction · Rev C</i>
        </>
      ) : (
        <>
          <b>{page.title}</b>
          {page.kind === 'table' ? (
            <span className="sc-page-table">{[0, 1, 2, 3, 4, 5].map((row) => <span key={row} />)}</span>
          ) : (
            <>
              <span className="sc-page-lines"><span /><span /></span>
              <span className="sc-page-fig" />
              <span className="sc-page-table is-short">{[0, 1, 2].map((row) => <span key={row} />)}</span>
            </>
          )}
        </>
      )}
    </span>
  );
}

function Art({ kind }) {
  if (kind === 'parts') return <span className="sc-mini is-wide"><MiniDoc table /><Hexagon className="sc-mini-icon" size={18} /></span>;
  if (kind === 'quality') {
    return (
      <span className="sc-mini is-wide sc-checks">
        {[0, 1, 2, 3].map((row) => <span key={row}><Check size={10} strokeWidth={3} /><i /></span>)}
      </span>
    );
  }
  if (kind === 'drawing') return <span className="sc-mini is-wide sc-drawing"><span /><span /><span /></span>;
  return <span className="sc-mini is-wide"><MiniDoc figure /><ClipboardList className="sc-mini-icon" size={18} /></span>;
}

function MiniDoc({ table = false, figure = false }) {
  return (
    <span className="sc-minidoc">
      <b />
      <span className="sc-minilines"><span /><span /></span>
      {figure ? <span className="sc-minifig" /> : null}
      {table ? <span className="sc-minitable">{[0, 1, 2, 3].map((row) => <span key={row} />)}</span> : null}
      {!table && !figure ? <span className="sc-minifig is-small" /> : null}
    </span>
  );
}
