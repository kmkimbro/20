/**
 * Notes text area for an Operation. Typing "/" opens a command menu to insert
 * Part or Tool references. Inserting updates operation.parts / toolsBOM and inserts tokens.
 */
import { useState, useRef, useEffect } from 'react';
import { getPartNamesForOperation } from '../../data/toolsBom.js';

export default function NotesEditor({
  operation,
  partsCatalog,
  toolsBom,
  notes,
  onNotesChange,
  onAddPartToCatalogAndOperation,
  onAddToolToBom,
}) {
  const textareaRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(null); // null | 'root' | 'parts' | 'tools'
  const [submenu, setSubmenu] = useState(null);   // null | 'add-part' | 'add-tool'
  const [addPartName, setAddPartName] = useState('');
  const [addPartQty, setAddPartQty] = useState(1);
  const [addToolName, setAddToolName] = useState('');

  const cursorPosRef = useRef(0);

  // Close menu on Esc or click outside
  useEffect(() => {
    if (!menuOpen && !submenu) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSubmenu(null);
        setMenuOpen(null);
      }
    };
    const handleClickOutside = (e) => {
      const el = e.target.closest('.notes-editor-wrap');
      if (!el) {
        setSubmenu(null);
        setMenuOpen(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen, submenu]);

  const insertAtCursor = (token) => {
    const ta = textareaRef.current;
    if (!ta || typeof notes !== 'string') return;
    const pos = cursorPosRef.current;
    const before = notes.slice(0, pos);
    const after = notes.slice(pos);
    const newNotes = before + token + after;
    onNotesChange(newNotes);
    setMenuOpen(null);
    setSubmenu(null);
    setTimeout(() => {
      ta.focus();
      const newPos = pos + token.length;
      ta.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === '/' && !menuOpen && !submenu) {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      cursorPosRef.current = ta.selectionStart;
      setMenuOpen('root');
    }
  };

  const handleChange = (e) => {
    onNotesChange(e.target.value);
    cursorPosRef.current = e.target.selectionStart;
  };

  const handleSelect = (e) => {
    cursorPosRef.current = e.target.selectionStart;
  };

  const partsInOp = operation ? getPartNamesForOperation(operation.parts || [], partsCatalog) : [];

  const handleChooseParts = () => setMenuOpen('parts');
  const handleChooseTools = () => setMenuOpen('tools');
  const handleBack = () => {
    setMenuOpen('root');
    setSubmenu(null);
  };

  const handleInsertPart = (name) => {
    insertAtCursor(`[Part: ${name}]`);
    setAddPartName('');
    setAddPartQty(1);
  };

  const handleInsertTool = (name) => {
    insertAtCursor(`[Tool: ${name}]`);
    setAddToolName('');
  };

  const handleAddNewPartSubmit = () => {
    const name = addPartName.trim();
    if (!name) return;
    const qty = Math.max(1, parseInt(addPartQty, 10) || 1);
    const { partId, tokenName } = onAddPartToCatalogAndOperation(operation.id, name, qty);
    insertAtCursor(`[Part: ${tokenName}]`);
    setSubmenu(null);
    setAddPartName('');
    setAddPartQty(1);
  };

  const handleAddNewToolSubmit = () => {
    const name = addToolName.trim();
    if (!name) return;
    onAddToolToBom(name);
    insertAtCursor(`[Tool: ${name}]`);
    setSubmenu(null);
    setAddToolName('');
  };

  const showMenu = menuOpen === 'root' || menuOpen === 'parts' || menuOpen === 'tools' || submenu;

  return (
    <div className="notes-editor-wrap">
      <label className="tools-bom-section-title">Notes</label>
      <p className="notes-editor-hint">Type &quot;/&quot; to insert a Part or Tool reference.</p>
      <textarea
        ref={textareaRef}
        className="notes-editor-input"
        value={notes}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        onClick={handleSelect}
        placeholder="e.g. Use [Tool: glue] on [Part: Blade]."
        rows={4}
      />

      {showMenu && (
        <div className="notes-editor-menu">
          {menuOpen === 'root' && !submenu && (
            <>
              <button type="button" className="notes-editor-menu-item" onClick={handleChooseParts}>
                Parts
              </button>
              <button type="button" className="notes-editor-menu-item" onClick={handleChooseTools}>
                Tools
              </button>
            </>
          )}

          {menuOpen === 'parts' && !submenu && (
            <>
              <button type="button" className="notes-editor-menu-item notes-editor-menu-item--back" onClick={handleBack}>
                ← Back
              </button>
              <div className="notes-editor-menu-label">Parts in this operation</div>
              {partsInOp.length === 0 ? (
                <div className="notes-editor-menu-empty">No parts in this operation yet.</div>
              ) : (
                partsInOp.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    className="notes-editor-menu-item"
                    onClick={() => handleInsertPart(p.name)}
                  >
                    {p.name} {p.qty > 1 ? `(${p.qty})` : ''}
                  </button>
                ))
              )}
              <div className="notes-editor-menu-divider" />
              <button
                type="button"
                className="notes-editor-menu-item"
                onClick={() => setSubmenu('add-part')}
              >
                Add a new part…
              </button>
            </>
          )}

          {submenu === 'add-part' && (
            <>
              <button type="button" className="notes-editor-menu-item notes-editor-menu-item--back" onClick={() => setSubmenu(null)}>
                ← Back
              </button>
              <div className="notes-editor-menu-form">
                <input
                  type="text"
                  placeholder="Part name"
                  value={addPartName}
                  onChange={(e) => setAddPartName(e.target.value)}
                  className="notes-editor-input-inline"
                  autoFocus
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Qty"
                  value={addPartQty}
                  onChange={(e) => setAddPartQty(parseInt(e.target.value, 10) || 1)}
                  className="notes-editor-input-inline notes-editor-input-qty"
                />
                <button type="button" className="notes-editor-btn-add" onClick={handleAddNewPartSubmit}>
                  Add
                </button>
              </div>
            </>
          )}

          {menuOpen === 'tools' && !submenu && (
            <>
              <button type="button" className="notes-editor-menu-item notes-editor-menu-item--back" onClick={handleBack}>
                ← Back
              </button>
              {toolsBom.length === 0 ? (
                <div className="notes-editor-menu-empty">No tools yet. Add a tool to get started.</div>
              ) : (
                <>
                  {toolsBom.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="notes-editor-menu-item"
                      onClick={() => handleInsertTool(t.name)}
                    >
                      {t.name}
                    </button>
                  ))}
                </>
              )}
              <div className="notes-editor-menu-divider" />
              <button
                type="button"
                className="notes-editor-menu-item"
                onClick={() => setSubmenu('add-tool')}
              >
                Add a new tool…
              </button>
            </>
          )}

          {submenu === 'add-tool' && (
            <>
              <button type="button" className="notes-editor-menu-item notes-editor-menu-item--back" onClick={() => setSubmenu(null)}>
                ← Back
              </button>
              <div className="notes-editor-menu-form">
                <input
                  type="text"
                  placeholder="Tool name"
                  value={addToolName}
                  onChange={(e) => setAddToolName(e.target.value)}
                  className="notes-editor-input-inline"
                  autoFocus
                />
                <button type="button" className="notes-editor-btn-add" onClick={handleAddNewToolSubmit}>
                  Add
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
