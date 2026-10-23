import { useState } from 'react';
import { Box, ChevronLeft } from 'lucide-react';
import PrototypeSwitcher from '../../components/PrototypeSwitcher.jsx';
import ModelStage from './ModelStage.jsx';
import CreateDocumentDialog from '../magicParser/CreateDocumentDialog.jsx';
import ReferenceCreate from './ReferenceCreate.jsx';
import ParseSetup from './ParseSetup.jsx';
import './infer.css';

const MODEL_NAME = '100-201 Engine Assembly';
const MODEL_FILE = '100-201 Engine Assembly_original file.STEP';

const HISTORY = [
  { name: 'Quickstart Work Instructions', created: 'Sep 08, 2026' },
  { name: 'Romeo Doc', created: 'Oct 02, 2026' },
  { name: 'Work Instructions', created: 'Sep 08, 2026' },
  { name: 'Drone', created: 'Sep 08, 2026' },
  { name: 'Onshape tool for motor', created: 'Jul 28, 2026' },
  { name: 'Onshape tooling quickstart', created: 'Apr 23, 2026' },
];

const INSTANCES = [
  'Origin',
  'Cylinder Head',
  'Hose',
  'Engine Belt',
  'Valve',
  'Exhaust Manifold',
  'Piston Assembly',
];

export default function OnshapeWorkspace({ onOpenDocument, referenceCreate = false, onUseCad, parseSetup = false }) {
  const [cadName, setCadName] = useState('');
  const [allowNew, setAllowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');

  const upload = (allowNewDocument) => {
    setCadName(MODEL_FILE);
    setAllowNew(allowNewDocument);
    setCreating(false);
    setDetailTitle('');
  };

  const openDetails = (title) => {
    if (parseSetup) {
      setDetailTitle(title);
      return;
    }
    if (title) {
      onOpenDocument({
        title,
        cadName,
        origin: 'cad',
        templateId: 'work_instruction',
        sourceName: '',
      });
    }
  };

  return (
    <div className="os-app">
      <header className="os-top">
        <strong>Onshape</strong>
        <span>{MODEL_FILE}</span>
      </header>
      <div className="os-body">
        <aside className="os-tree">
          <p>Instances ({INSTANCES.length + 1})</p>
          <strong>{MODEL_NAME}</strong>
          <ul>
            {INSTANCES.map((name) => <li key={name}>{name}</li>)}
          </ul>
        </aside>
        <div className="os-stage">
          <ModelStage />
        </div>
        <aside className="os-panel">
          <div className="os-panel-mark"><Box size={18} /></div>
          {detailTitle ? (
            <div className="os-create">
              <button type="button" className="os-back" onClick={() => setDetailTitle('')}>
                <ChevronLeft size={14} />
                Documents
              </button>
              <p className="os-file">{detailTitle}</p>
              <ParseSetup
                embedded
                onDone={(detail) => onOpenDocument({
                  title: detailTitle,
                  cadName,
                  origin: detail.prompt === 'Existing document' ? 'both' : 'cad',
                  templateId: detail.templateId,
                  sourceName: detail.sourceName || '',
                  optionsSaved: true,
                  parsePicks: detail.picks,
                  parsePrompt: detail.prompt,
                  planSteps: detail.planSteps,
                  planScope: detail.planScope,
                })}
              />
            </div>
          ) : creating ? (
            <div className="os-create">
              <button type="button" className="os-back" onClick={() => setCreating(false)}>
                <ChevronLeft size={14} />
                Documents
              </button>
              <p className="os-file">{cadName}</p>
              {referenceCreate ? (
                <ReferenceCreate
                  embedded
                  presetCad={cadName}
                  creator={{ phase: 'form' }}
                  onClose={() => setCreating(false)}
                  onCreate={onOpenDocument}
                />
              ) : (
                <CreateDocumentDialog
                  embedded
                  presetCad={cadName}
                  creator={{ phase: 'form', projectId: 'proj-1', page: 0, pageCount: 0, message: '' }}
                  onClose={() => setCreating(false)}
                  onCreateBlank={() => {}}
                  onCreateFromPdf={() => {}}
                  onCreateInfer={onOpenDocument}
                />
              )}
            </div>
          ) : (
            <>
              <button type="button" className="os-action" onClick={() => upload(true)}>Upload New CAD</button>
              {onUseCad ? null : (
                <button type="button" className="os-action" onClick={() => upload(false)}>Update CAD</button>
              )}
              {onUseCad && cadName ? (
                <button type="button" className="os-action" onClick={() => onUseCad(cadName)}>Continue</button>
              ) : null}
              <section className="os-history">
                <h2>CAD Upload History</h2>
                {cadName && !onUseCad ? <p className="os-ask">Which document should use this CAD?</p> : null}
                <table>
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cadName && allowNew && !onUseCad ? (
                      <tr>
                        <td>
                          <button type="button" className="os-doc-link" onClick={() => (parseSetup ? openDetails(MODEL_NAME) : setCreating(true))}>New document</button>
                        </td>
                        <td />
                      </tr>
                    ) : null}
                    {HISTORY.map((item) => (
                      <tr key={item.name}>
                        <td>
                          {cadName && !onUseCad ? (
                            <button type="button" className="os-doc-link" onClick={() => openDetails(item.name)}>{item.name}</button>
                          ) : (
                            <span className="os-doc-link">{item.name}</span>
                          )}
                        </td>
                        <td>{item.created}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </aside>
      </div>
      <PrototypeSwitcher />
    </div>
  );
}
