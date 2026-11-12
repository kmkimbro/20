import { useEffect, useState } from 'react';
import {
  Check, ClipboardList, File, FileText, Hexagon, Images, Layers, LayoutGrid, Loader2, MessageSquare, Paperclip, Sparkles, Table, Type, X,
} from 'lucide-react';
import './prompt-start.css';

// AI workflow 5 (prompts): the way to start is chosen on the empty document, like a new deck in PowerPoint
// or a blank Google Doc. Each tile fills an editable prompt instead of opening a setup wizard.
export const START_TILES = [
  {
    id: 'blank',
    label: 'None',
    detail: 'Nothing is generated. Work the way you do today.',
    icon: File,
  },
  {
    id: 'import',
    label: 'Import',
    detail: 'Generate from a document you already have.',
    icon: Sparkles,
    magic: true,
  },
  {
    id: 'auto_assembly',
    label: 'Auto Assembly',
    detail: 'Suggest an assembly plan from the CAD.',
    icon: Layers,
    prompt: 'Read the CAD and suggest an assembly order. Create an operation for each step with a screenshot and the parts it uses.',
  },
  {
    id: 'parts_list',
    label: 'Parts list',
    detail: 'Generate a parts list straight from the CAD.',
    icon: Hexagon,
    prompt: 'Generate a parts list from the CAD with the item number, part number, name, and quantity for every part.',
  },
  {
    id: 'work_instruction',
    label: 'Work instruction',
    detail: 'Generate a work instruction from the CAD.',
    icon: ClipboardList,
    prompt: 'Generate a work instruction from the CAD. Add an operation for each step with a screenshot, a short note, and a parts table.',
  },
];

// The prompts the client copies off the AI Control page today, as ready-made tiles.
export const IMPORT_PROMPTS = [
  {
    id: 'images',
    label: 'Extract images',
    icon: Images,
    prompt: 'Extract the images from the work instructions for this section. Name each image Step Number_Image Number so it is easy to reference later.',
  },
  {
    id: 'text',
    label: 'Extract step text',
    icon: Type,
    prompt: 'Go through the same section of the work instructions and extract the text exactly from each operation step. Make an operation step for each one, add its text to the note, and rename the step to say what is done in it.',
  },
  {
    id: 'placement',
    label: 'Match images and callouts',
    icon: MessageSquare,
    prompt: 'Add the matching image to each operation step, in the same place as in the document when possible. Extract any annotations and put them in the same place so the images match up.',
  },
  {
    id: 'parts',
    label: 'Add parts to steps',
    icon: Hexagon,
    prompt: 'Add the matching parts from the CAD to each operation step.',
  },
  {
    id: 'table',
    label: 'Parts table on each step',
    icon: Table,
    prompt: 'Add a parts table to each operation step.',
  },
  {
    id: 'layout',
    label: 'Fix overlaps',
    icon: LayoutGrid,
    prompt: 'Make sure that nothing overlaps on each document page.',
  },
];

const SAMPLE_SOURCE = 'Drone Assembly Work Instruction.pdf';
const RUN_STEP_MS = 1100;

const importText = (ids) => IMPORT_PROMPTS
  .filter((item) => ids.includes(item.id))
  .map((item) => item.prompt)
  .join('\n\n');

export default function PromptStart({ cadName, cadStatus, onStart }) {
  const [tile, setTile] = useState(null);
  const [picks, setPicks] = useState([]);
  const [text, setText] = useState('');
  const [edited, setEdited] = useState(false);
  const [source, setSource] = useState('');
  const [running, setRunning] = useState(null);

  const chosen = START_TILES.find((item) => item.id === tile) || null;
  const isImport = tile === 'import';

  const chooseTile = (id) => {
    setTile(id);
    setEdited(false);
    if (id === 'import') {
      setText(importText(picks));
    } else {
      setText(START_TILES.find((item) => item.id === id)?.prompt || '');
    }
  };

  const togglePick = (id) => {
    const next = picks.includes(id) ? picks.filter((item) => item !== id) : [...picks, id];
    setPicks(next);
    if (!edited) setText(importText(next));
  };

  const steps = isImport
    ? IMPORT_PROMPTS.filter((item) => picks.includes(item.id)).map((item) => item.label)
    : [chosen?.label ? `Generate ${chosen.label.toLowerCase()}` : 'Generate'];

  const canRun = tile === 'blank'
    || (isImport ? Boolean(source && text.trim()) : Boolean(text.trim()));

  const detail = () => ({
    prompt: tile === 'blank' ? '' : text.trim(),
    picks: isImport ? picks : [],
    docType: tile,
    templateId: tile === 'parts_list' ? 'parts_list' : 'work_instruction',
    sourceName: isImport ? source : '',
  });

  const run = () => {
    if (!canRun) return;
    if (tile === 'blank') {
      onStart(detail());
      return;
    }
    setRunning(0);
  };

  useEffect(() => {
    if (running === null) return undefined;
    const total = Math.max(steps.length, 1);
    const id = window.setTimeout(() => {
      if (running + 1 >= total) onStart(detail());
      else setRunning(running + 1);
    }, RUN_STEP_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  if (running !== null) {
    return (
      <article className="lb-sheet ps-sheet">
        <div className="ps-run">
          <p className="ps-eyebrow">{isImport ? `From ${source}` : cadName}</p>
          <h2>Generating your document</h2>
          <ol className="ps-run-list">
            {steps.map((label, index) => (
              <li key={label} className={index < running ? 'is-done' : index === running ? 'is-now' : ''}>
                <span className="ps-run-mark" aria-hidden="true">
                  {index < running ? <Check size={12} strokeWidth={3} /> : index === running ? <Loader2 size={13} /> : null}
                </span>
                {label}
              </li>
            ))}
          </ol>
        </div>
      </article>
    );
  }

  return (
    <article className="lb-sheet ps-sheet">
      <div className="ps-start">
        <p className="ps-eyebrow">
          {cadName}
          {cadStatus ? <span>{` · ${cadStatus}`}</span> : null}
        </p>
        <h2>How do you want to start?</h2>
        <div className="ps-tiles" role="radiogroup" aria-label="How do you want to start?">
          {START_TILES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={tile === item.id}
                className={tile === item.id ? 'is-on' : ''}
                onClick={() => chooseTile(item.id)}
              >
                <span className={`ps-tile-icon${item.magic ? ' is-magic' : ''}`} aria-hidden="true"><Icon size={16} /></span>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </button>
            );
          })}
        </div>

        {tile && tile !== 'blank' ? (
          <div className="ps-compose">
            {isImport ? (
              <>
                <p className="ps-label">Your document</p>
                {source ? (
                  <div className="ps-source">
                    <FileText size={16} />
                    <span>{source}</span>
                    <button type="button" aria-label={`Remove ${source}`} onClick={() => setSource('')}><X size={14} /></button>
                  </div>
                ) : (
                  <button type="button" className="ps-source is-empty" onClick={() => setSource(SAMPLE_SOURCE)}>
                    <Paperclip size={16} />
                    <span>Attach the document to generate from</span>
                  </button>
                )}
                <p className="ps-label">Prompts</p>
                <div className="ps-chips">
                  {IMPORT_PROMPTS.map((item) => {
                    const Icon = item.icon;
                    const on = picks.includes(item.id);
                    return (
                      <button key={item.id} type="button" className={on ? 'is-on' : ''} aria-pressed={on} onClick={() => togglePick(item.id)}>
                        {on ? <Check size={14} strokeWidth={2.5} /> : <Icon size={14} />}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
            <p className="ps-label">{isImport ? 'What will run' : 'Prompt'}</p>
            <textarea
              className="ps-text"
              aria-label="Prompt"
              rows={isImport ? 5 : 3}
              value={text}
              placeholder={isImport ? 'Pick prompts above, or write your own.' : 'Describe what to generate.'}
              onChange={(event) => { setText(event.target.value); setEdited(true); }}
            />
          </div>
        ) : null}

        <div className="ps-actions">
          {tile === 'blank' ? <span className="ps-hint">The document opens as it does today.</span> : <span />}
          <button type="button" className="ps-go" disabled={!canRun} onClick={run}>
            {tile === 'blank' ? 'Open document' : (
              <>
                <Sparkles size={14} />
                Generate
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
