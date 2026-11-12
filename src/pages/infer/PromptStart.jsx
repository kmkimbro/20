import { useEffect, useState } from 'react';
import {
  Check, ClipboardList, File, FileText, Hexagon, Images, Layers, LayoutGrid, ListOrdered, Loader2, MessageSquare, Paperclip, PenLine, Sparkles, Table,
  Type, X,
} from 'lucide-react';
import './prompt-start.css';

// AI workflow 5 (prompts): the way to start is chosen on the empty document, like a new deck in PowerPoint
// or a blank Google Doc. Blank does nothing. The other starts are bespoke prompts, and more can be added over time.
export const START_TILES = [
  {
    id: 'blank',
    label: 'Blank document',
    detail: 'Start empty. Nothing is generated.',
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
    id: 'doc_type',
    label: 'Document type',
    detail: 'Pick the kind of document and get prompts made for it.',
    icon: ClipboardList,
    magic: true,
  },
  {
    id: 'assembly',
    label: 'Assembly',
    detail: 'Build the assembly steps from the CAD.',
    icon: Layers,
    magic: true,
  },
];

const ASSEMBLY_PROMPTS = [
  {
    id: 'order', label: 'Suggest an assembly order', icon: Layers, on: true,
    prompt: 'Read the CAD and suggest an order to assemble the parts in.',
  },
  {
    id: 'ops', label: 'One operation per step', icon: ListOrdered, on: true,
    prompt: 'Create an operation for each step in that order, named for what is done in it.',
  },
  {
    id: 'shots', label: 'Screenshot each step', icon: Images, on: true,
    prompt: 'Add a screenshot of the model to each step, showing the parts being added.',
  },
  {
    id: 'parts', label: 'Parts used in each step', icon: Table,
    prompt: 'Add a parts table to each step with the parts it uses.',
  },
];

export const DOC_TYPES = [
  {
    id: 'work_instruction',
    label: 'Work instruction',
    icon: ClipboardList,
    prompts: [
      { id: 'ops', label: 'Operations from the CAD', icon: ListOrdered, on: true, prompt: 'Create an operation for each step in the assembly, named for what is done in it.' },
      { id: 'shots', label: 'Screenshot each step', icon: Images, on: true, prompt: 'Add a screenshot of the model to each operation.' },
      { id: 'notes', label: 'Write step notes', icon: Type, on: true, prompt: 'Write a short note for each operation that says how to do it.' },
      { id: 'table', label: 'Parts table on each step', icon: Table, prompt: 'Add a parts table to each operation.' },
      { id: 'callouts', label: 'Callouts on images', icon: MessageSquare, prompt: 'Add numbered callouts to each screenshot for the parts in that step.' },
    ],
  },
  {
    id: 'parts_list',
    label: 'Parts list',
    icon: Hexagon,
    prompts: [
      { id: 'all', label: 'Every part in the model', icon: Hexagon, on: true, prompt: 'List every part in the CAD with its item number, part number, name, and quantity.' },
      { id: 'group', label: 'Group by subassembly', icon: Layers, prompt: 'Group the parts under the subassembly they belong to.' },
      { id: 'thumbs', label: 'Add part thumbnails', icon: Images, prompt: 'Add a thumbnail of each part next to it.' },
    ],
  },
  {
    id: 'quality_checklist',
    label: 'Quality checklist',
    icon: Check,
    prompts: [
      { id: 'checks', label: 'Checks for each part', icon: Check, on: true, prompt: 'Create an inspection check for each part, with what to measure and the expected result.' },
      { id: 'shots', label: 'Image for each check', icon: Images, prompt: 'Add a screenshot that shows where each check is done.' },
      { id: 'results', label: 'Result fields', icon: Table, on: true, prompt: 'Add a pass or fail field and a notes field to each check.' },
    ],
  },
  {
    id: 'drawing_release',
    label: 'Drawing package',
    icon: PenLine,
    prompts: [
      { id: 'views', label: 'Standard views', icon: Images, on: true, prompt: 'Create a sheet with the front, top, side, and isometric views of the model.' },
      { id: 'bom', label: 'Bill of materials', icon: Table, on: true, prompt: 'Add a bill of materials to the first sheet.' },
      { id: 'notes', label: 'Annotations', icon: MessageSquare, prompt: 'Add part balloons and general notes to each sheet.' },
    ],
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

const textFor = (list, ids) => list
  .filter((item) => ids.includes(item.id))
  .map((item) => item.prompt)
  .join('\n\n');

const defaults = (list) => list.filter((item) => item.on).map((item) => item.id);

export default function PromptStart({ cadName, cadStatus, onStart }) {
  const [tile, setTile] = useState('blank');
  const [docType, setDocType] = useState(null);
  const [picks, setPicks] = useState([]);
  const [text, setText] = useState('');
  const [edited, setEdited] = useState(false);
  const [source, setSource] = useState('');
  const [running, setRunning] = useState(null);

  const isImport = tile === 'import';
  const typeItem = DOC_TYPES.find((item) => item.id === docType) || null;
  const list = isImport ? IMPORT_PROMPTS
    : tile === 'assembly' ? ASSEMBLY_PROMPTS
      : tile === 'doc_type' && typeItem ? typeItem.prompts : [];

  const useList = (next, ids) => {
    setPicks(ids);
    setEdited(false);
    setText(textFor(next, ids));
  };

  const chooseTile = (id) => {
    setTile(id);
    if (id === 'import') useList(IMPORT_PROMPTS, []);
    else if (id === 'assembly') useList(ASSEMBLY_PROMPTS, defaults(ASSEMBLY_PROMPTS));
    else if (id === 'doc_type' && typeItem) useList(typeItem.prompts, defaults(typeItem.prompts));
    else useList([], []);
  };

  const chooseType = (id) => {
    const item = DOC_TYPES.find((type) => type.id === id);
    setDocType(id);
    useList(item.prompts, defaults(item.prompts));
  };

  const togglePick = (id) => {
    const next = picks.includes(id) ? picks.filter((item) => item !== id) : [...picks, id];
    setPicks(next);
    if (!edited) setText(textFor(list, next));
  };

  const picked = list.filter((item) => picks.includes(item.id)).map((item) => item.label);
  const steps = picked.length ? picked : ['Run your prompt'];

  const canRun = tile === 'blank' || (
    Boolean(text.trim())
    && (!isImport || Boolean(source))
    && (tile !== 'doc_type' || Boolean(typeItem))
  );

  const detail = () => ({
    prompt: tile === 'blank' ? '' : text.trim(),
    picks: tile === 'blank' ? [] : picks,
    docType: tile === 'doc_type' ? docType : tile,
    templateId: tile === 'doc_type' && docType ? docType : 'work_instruction',
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
    const id = window.setTimeout(() => {
      if (running + 1 >= steps.length) onStart(detail());
      else setRunning(running + 1);
    }, RUN_STEP_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  if (running !== null) {
    return (
      <article className="lb-sheet ps-sheet">
        <div className="ps-run">
          <p className="ps-eyebrow">{isImport ? `From ${source}` : typeItem && tile === 'doc_type' ? `${typeItem.label} from ${cadName}` : cadName}</p>
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

        {tile !== 'blank' ? (
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
              </>
            ) : null}
            {tile === 'doc_type' ? (
              <>
                <p className="ps-label">Type of document</p>
                <div className="ps-types" role="radiogroup" aria-label="Type of document">
                  {DOC_TYPES.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={docType === item.id}
                        className={docType === item.id ? 'is-on' : ''}
                        onClick={() => chooseType(item.id)}
                      >
                        <Icon size={15} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
            {list.length ? (
              <>
                <p className="ps-label">{tile === 'doc_type' ? `Prompts for a ${typeItem.label.toLowerCase()}` : 'Prompts'}</p>
                <div className="ps-chips">
                  {list.map((item) => {
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
                <p className="ps-label">What will run</p>
                <textarea
                  className="ps-text"
                  aria-label="Prompt"
                  rows={5}
                  value={text}
                  placeholder="Pick prompts above, or write your own."
                  onChange={(event) => { setText(event.target.value); setEdited(true); }}
                />
              </>
            ) : null}
          </div>
        ) : null}

        <div className="ps-actions">
          {tile === 'blank' ? <span className="ps-hint">Opens an empty document. You can run prompts later from Ask.</span> : <span />}
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
