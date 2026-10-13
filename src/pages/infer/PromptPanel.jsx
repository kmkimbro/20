import { useEffect, useRef, useState } from 'react';
import { ArrowUp, FileText, History, Paperclip, X } from 'lucide-react';

const PROMPTS = [
  'Keep each photo with its step',
  'Rename the step to the action',
  'Add a parts table to the step',
];

export default function PromptPanel({ onClose, target = null, onClearTarget, history = [], onSend, original = null }) {
  const fileRef = useRef(null);
  const menuRef = useRef(null);
  const [chosen, setChosen] = useState('');
  const [files, setFiles] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [originalOpen, setOriginalOpen] = useState(false);

  useEffect(() => {
    if (!historyOpen) return undefined;
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setHistoryOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [historyOpen]);

  const send = () => {
    const text = chosen.trim();
    if (!text) return;
    onSend?.({
      id: `${Date.now()}`,
      text,
      scope: target?.label || '',
      files: files.map((file) => file.name),
    });
    setChosen('');
    setFiles([]);
  };

  const addFiles = (list) => {
    const next = [...list].map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      image: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
    }));
    setFiles((current) => {
      const seen = new Set(current.map((file) => file.id));
      return [...current, ...next.filter((file) => !seen.has(file.id))];
    });
  };

  const removeFile = (id) => {
    setFiles((current) => {
      const file = current.find((item) => item.id === id);
      if (file?.image) URL.revokeObjectURL(file.image);
      return current.filter((item) => item.id !== id);
    });
  };

  return (
    <aside className="lb-panel lb-prompt-panel">
      <div className="lb-prompt-head">
        <strong>Ask</strong>
        <button type="button" className="lb-prompt-x" aria-label="Close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      {originalOpen && original ? (
        <div className="lb-prompt-original">
          <p className="lb-prompt-original-file">{original.fileName}</p>
          {original.steps.map((step) => (
            <article key={step.step} className="lb-prompt-original-page">
              <div>{`Page ${step.step + 1}`}</div>
              <h3>{`${step.step}. ${step.title}`}</h3>
              {step.note ? <p>{step.note}</p> : null}
              {step.parts?.length ? (
                <ul>
                  {step.parts.map((part) => {
                    const name = typeof part === 'string' ? part : part.name;
                    return <li key={`${step.step}-${part.pn || name}`}>{`${part.item || ''} ${part.pn || ''} ${name}`.trim()}</li>;
                  })}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
      <div className="lb-prompt-dock">
        <div className="lb-prompt-chips">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className={chosen === prompt ? 'is-on' : ''}
              onClick={() => setChosen(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
        {files.length ? (
          <ul className="lb-prompt-files">
            {files.map((file) => (
              <li key={file.id}>
                {file.image ? <img src={file.image} alt="" /> : <Paperclip size={14} />}
                <span>{file.name}</span>
                <button type="button" aria-label={`Remove ${file.name}`} onClick={() => removeFile(file.id)}>
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <form className="lb-prompt-ask" onSubmit={(event) => { event.preventDefault(); send(); }}>
          {target ? (
            <span className="lb-prompt-scope">
              <strong>{target.label}</strong>
              <button type="button" aria-label={`Stop adjusting ${target.label}`} onClick={onClearTarget}>
                <X size={12} />
              </button>
            </span>
          ) : null}
          <div className="lb-prompt-compose">
            <textarea
              value={chosen}
              onChange={(event) => setChosen(event.target.value)}
              placeholder={target ? 'What should change?' : 'Ask about this'}
              aria-label="Message"
              rows={2}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
            />
            {original ? (
              <button
                type="button"
                className={`lb-prompt-upload${originalOpen ? ' is-on' : ''}`}
                aria-label="Original document"
                aria-pressed={originalOpen}
                onClick={() => { setHistoryOpen(false); setOriginalOpen((open) => !open); }}
              >
                <FileText size={16} />
              </button>
            ) : null}
            <div className="lb-prompt-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className={`lb-prompt-upload${historyOpen ? ' is-on' : ''}`}
                aria-label="History"
                aria-expanded={historyOpen}
                onClick={() => setHistoryOpen((open) => !open)}
              >
                <History size={16} />
              </button>
              {historyOpen ? (
                <div className="lb-prompt-menu" role="menu">
                  {history.length ? history.map((item) => (
                    <div key={item.id} className="lb-prompt-menu-item">
                      {item.scope ? <strong>{item.scope}</strong> : null}
                      <span>{item.text}</span>
                    </div>
                  )) : <p>Nothing sent yet</p>}
                </div>
              ) : null}
            </div>
            <button type="button" className="lb-prompt-upload" aria-label="Upload a document or image" onClick={() => fileRef.current?.click()}>
              <Paperclip size={16} />
            </button>
            <button type="submit" className="lb-prompt-send" aria-label="Send" disabled={!chosen.trim()}>
              <ArrowUp size={16} />
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            hidden
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.csv"
            onChange={(event) => {
              addFiles(event.target.files || []);
              event.target.value = '';
            }}
          />
        </form>
      </div>
    </aside>
  );
}
