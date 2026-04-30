/**
 * A placed text box on the canvas. Bounding box + toolbar when selected.
 * When BOM props are provided (des-combined): typing "/" opens a menu to insert Part or Tool;
 * selecting adds to the operation's parts table or the tools table.
 */
import { useRef, useCallback, useState, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Palette, CheckSquare, Wrench } from 'lucide-react';

const MIN_W = 120;
const MIN_H = 60;

const TOKEN_PART = /\[Part:\s*([^\]]+)\]/g;
const TOKEN_TOOL = /\[Tool:\s*([^\]]+)\]/g;

/** Parse content string into segments: text and Part/Tool tokens for tag rendering */
function parseContentToSegments(content) {
  if (!content || typeof content !== 'string') return [{ type: 'text', value: '' }];
  const segments = [];
  let lastIndex = 0;
  const re = /\[(Part|Tool):\s*([^\]]+)\]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ type: 'text', value: content.slice(lastIndex, m.index) });
    }
    segments.push({ type: m[1].toLowerCase(), value: m[2].trim() });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex) });
  }
  if (segments.length === 0) segments.push({ type: 'text', value: '' });
  return segments;
}

/** Build content string from segments (for updating after tag rename) */
function segmentsToContent(segments) {
  return segments.map((s) =>
    s.type === 'text' ? s.value : `[${s.type === 'part' ? 'Part' : 'Tool'}: ${s.value}]`
  ).join('');
}

/** Serialize contenteditable DOM back to content string (with [Part: X] / [Tool: X] tokens) */
function serializeEditable(container) {
  if (!container) return '';
  let s = '';
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      s += node.textContent;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node;
    if (el.getAttribute?.('data-token-type') === 'part') {
      s += `[Part: ${el.getAttribute('data-token-value') ?? ''}]`;
      return;
    }
    if (el.getAttribute?.('data-token-type') === 'tool') {
      s += `[Tool: ${el.getAttribute('data-token-value') ?? ''}]`;
      return;
    }
    // Editing state: span contains an input; preserve as Tool token so the tag doesn't disappear
    if (el.classList?.contains('placed-textbox-tag--editing')) {
      const input = el.querySelector?.('.placed-textbox-tag-input') || el.querySelector?.('input');
      const val = (input?.value ?? '').trim();
      s += `[Tool: ${val}]`;
      return;
    }
    for (const child of el.childNodes) walk(child);
  };
  for (const child of container.childNodes) walk(child);
  return s;
}

/** Get cursor position as character offset in the serialized content */
function getCursorOffset(container) {
  if (!container) return 0;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  let offset = 0;
  const walk = (node, atStart) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent.length;
      if (node.contains(range.startContainer) || node === range.startContainer) {
        offset += range.startOffset;
        return true;
      }
      offset += len;
      return false;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const el = node;
    if (el.getAttribute?.('data-token-type') === 'part') {
      const token = `[Part: ${el.getAttribute('data-token-value') ?? ''}]`;
      if (el.contains(range.startContainer)) {
        offset += range.startOffset === 0 ? 0 : token.length;
        return true;
      }
      offset += token.length;
      return false;
    }
    if (el.getAttribute?.('data-token-type') === 'tool') {
      const token = `[Tool: ${el.getAttribute('data-token-value') ?? ''}]`;
      if (el.contains(range.startContainer)) {
        offset += range.startOffset === 0 ? 0 : token.length;
        return true;
      }
      offset += token.length;
      return false;
    }
    for (const child of el.childNodes) {
      if (walk(child)) return true;
    }
    return false;
  };
  for (const child of container.childNodes) {
    if (walk(child)) break;
  }
  return offset;
}

/** Set cursor to a given character offset in the serialized content */
function setCursorOffset(container, targetOffset) {
  if (!container) return;
  let current = 0;
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent.length;
      if (current + len >= targetOffset) {
        range.setStart(node, Math.min(targetOffset - current, len));
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return true;
      }
      current += len;
      return false;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const el = node;
    if (el.getAttribute?.('data-token-type') === 'part' || el.getAttribute?.('data-token-type') === 'tool') {
      const val = el.getAttribute('data-token-value') ?? '';
      const token = `[${el.getAttribute('data-token-type') === 'part' ? 'Part' : 'Tool'}: ${val}]`;
      if (current + token.length >= targetOffset) {
        range.setStart(el, targetOffset <= current ? 0 : 1);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return true;
      }
      current += token.length;
      return false;
    }
    for (const child of el.childNodes) {
      if (walk(child)) return true;
    }
    return false;
  };
  for (const child of container.childNodes) {
    if (walk(child)) return;
  }
  const last = container.lastChild;
  if (last) {
    if (last.nodeType === Node.TEXT_NODE) {
      range.setStart(last, last.textContent.length);
    } else {
      range.setStart(container, container.childNodes.length);
    }
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

export default function PlacedTextBox({
  item,
  canvasRect,
  onUpdate,
  onRemove,
  operationId,
  partsForOperation = [],
  toolsBom = [],
  toolIdsForOperation = [],
  onAddPartToOperation,
  onAddToolToBom,
  onReplaceToolInOperation,
}) {
  const editableRef = useRef(null);
  const containerRef = useRef(null);
  const [selected, setSelected] = useState(false);
  const cursorRestoreRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(null);
  const [submenu, setSubmenu] = useState(null);
  const [addPartName, setAddPartName] = useState('');
  const [addPartQty, setAddPartQty] = useState(1);
  const [addToolName, setAddToolName] = useState('');
  const cursorPosRef = useRef(0);
  const [editingToolTag, setEditingToolTag] = useState(null); // { segmentIndex, originalValue }
  const [editTagValue, setEditTagValue] = useState('');
  const editTagInputRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ left: 12, top: 28 });
  // Tag reassign menu: { segmentIndex, value, rect }
  const [tagMenu, setTagMenu] = useState(null);

  // Close tag menu on outside click or Escape
  useEffect(() => {
    if (!tagMenu) return;
    const onKey = (e) => { if (e.key === 'Escape') setTagMenu(null); };
    const onDown = (e) => { if (!e.target.closest('.ptb-tag-menu')) setTagMenu(null); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, [tagMenu]);

  const hasBom = Boolean(onAddPartToOperation && onAddToolToBom);
  const content = item.content ?? '';
  const segments = parseContentToSegments(content);

  useEffect(() => {
    if (!selected) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setSelected(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selected]);

  useEffect(() => {
    if (cursorRestoreRef.current === null || !editableRef.current) return;
    const offset = cursorRestoreRef.current;
    cursorRestoreRef.current = null;
    requestAnimationFrame(() => setCursorOffset(editableRef.current, offset));
  }, [content]);

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
      if (!containerRef.current?.contains(e.target) && !e.target.closest('.placed-textbox-slash-menu')) {
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

  const insertAtCursor = useCallback(
    (token) => {
      const pos = cursorPosRef.current;
      const before = content.slice(0, pos);
      const after = content.slice(pos);
      onUpdate(item.id, { content: before + token + after });
      setMenuOpen(null);
      setSubmenu(null);
      cursorRestoreRef.current = pos + token.length;
      setTimeout(() => editableRef.current?.focus(), 0);
    },
    [item.id, content, onUpdate]
  );

  const handleInput = useCallback(() => {
    const el = editableRef.current;
    if (!el) return;
    const newContent = serializeEditable(el);
    const offset = getCursorOffset(el);
    onUpdate(item.id, { content: newContent });
    cursorPosRef.current = offset;
    cursorRestoreRef.current = offset;
  }, [item.id, onUpdate]);

  const updateMenuPositionFromCaret = useCallback(() => {
    const editableEl = editableRef.current;
    if (!editableEl) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);
    const caretRect = range.getBoundingClientRect();
    const editableRect = editableEl.getBoundingClientRect();
    // If caret rect is collapsed/invalid (e.g. selection moved to menu), keep current position.
    if (!editableEl.contains(sel.anchorNode) || (caretRect.width === 0 && caretRect.height === 0)) return;
    const lineBottom = caretRect.bottom - editableRect.top;
    // Always place menu below the current line so it never covers the text/tags.
    let left = caretRect.left - editableRect.left;
    let top = lineBottom + 6;
    const maxLeft = Math.max(12, item.width - 232);
    const maxTop = Math.max(20, item.height - 120);
    left = Math.max(8, Math.min(left, maxLeft));
    top = Math.max(lineBottom + 4, top); // never above the line
    top = Math.min(top, maxTop);          // don't overflow bottom of box
    setMenuPosition({ left, top });
  }, [item.width, item.height]);

  const handleKeyDown = useCallback(
    (e) => {
      if (hasBom && e.key === '/' && !menuOpen && !submenu) {
        e.preventDefault();
        cursorPosRef.current = getCursorOffset(editableRef.current);
        updateMenuPositionFromCaret();
        setMenuOpen('root');
      }
    },
    [hasBom, menuOpen, submenu, updateMenuPositionFromCaret]
  );

  const handleSelect = useCallback(() => {
    if (editableRef.current) cursorPosRef.current = getCursorOffset(editableRef.current);
    // Don't recompute menu position when menu is open (selection may be on menu, not caret).
  }, []);

  const handleChooseParts = () => setMenuOpen('parts');
  const handleChooseTools = () => setMenuOpen('tools');
  const handleBack = () => {
    setMenuOpen('root');
    setSubmenu(null);
  };

  const handleInsertPart = (name) => {
    insertAtCursor(`[Part: ${name}]`);
    if (operationId && onAddPartToOperation) onAddPartToOperation(operationId, name, 1);
    setAddPartName('');
    setAddPartQty(1);
  };

  const handleInsertTool = (name) => {
    insertAtCursor(`[Tool: ${name}]`);
    // Only add to the table if the tool isn't already in this step
    if (operationId && onAddToolToBom && !isToolInTable(name)) onAddToolToBom(operationId, name);
    setAddToolName('');
  };

  const handleAddNewPartSubmit = () => {
    const name = addPartName.trim();
    if (!name || !operationId || !onAddPartToOperation) return;
    const qty = Math.max(1, parseInt(addPartQty, 10) || 1);
    onAddPartToOperation(operationId, name, qty);
    insertAtCursor(`[Part: ${name}]`);
    setSubmenu(null);
    setAddPartName('');
    setAddPartQty(1);
  };

  const handleAddNewToolSubmit = () => {
    const name = addToolName.trim();
    if (!name || !onAddToolToBom) return;
    // Only add to the table if the tool isn't already in this step
    if (operationId && !isToolInTable(name)) onAddToolToBom(operationId, name);
    insertAtCursor(`[Tool: ${name}]`);
    setSubmenu(null);
    setAddToolName('');
  };

  const commitToolTagEdit = useCallback(() => {
    if (!editingToolTag) return;
    const raw = editTagInputRef.current?.value ?? editTagValue;
    const newName = (typeof raw === 'string' ? raw : '').trim();
    setEditingToolTag(null);
    if (!newName) return;
    const newSegments = segments.map((seg, i) =>
      i === editingToolTag.segmentIndex && seg.type === 'tool' ? { ...seg, value: newName } : seg
    );
    const newContent = segmentsToContent(newSegments);
    if (newName !== editingToolTag.originalValue && onAddToolToBom && operationId) {
      onAddToolToBom(operationId, newName);
    }
    onUpdate(item.id, { content: newContent });
  }, [editingToolTag, editTagValue, segments, item.id, onUpdate, onAddToolToBom]);

  useEffect(() => {
    if (editingToolTag != null) {
      setEditTagValue(editingToolTag.originalValue);
      requestAnimationFrame(() => editTagInputRef.current?.focus());
    }
  }, [editingToolTag]);

  const partsList = Array.isArray(partsForOperation) ? partsForOperation : [];
  const toolsList = Array.isArray(toolsBom) ? toolsBom : [];
  const tid = new Set(Array.isArray(toolIdsForOperation) ? toolIdsForOperation : []);
  // A tool tag is "orphaned" when the named tool is not in this operation's table
  const isToolInTable = (name) =>
    toolsList.some(t => tid.has(t.id) && (t.name || '').trim().toLowerCase() === (name || '').trim().toLowerCase());
  const showMenu = hasBom && (menuOpen === 'root' || menuOpen === 'parts' || menuOpen === 'tools' || submenu);

  const handleDragStart = useCallback(
    (e) => {
      if (e.target.closest('textarea') || e.target.closest('.placed-textbox-remove') || e.target.closest('.resize-handle') || e.target.closest('.placed-textbox-toolbar') || e.target.closest('.placed-textbox-slash-menu')) return;
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = item.left;
      const startTop = item.top;
      const onMouseMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const maxLeft = canvasRect ? canvasRect.width - item.width : 0;
        const maxTop = canvasRect ? canvasRect.height - item.height : 0;
        const newLeft = Math.max(0, Math.min(startLeft + dx, maxLeft));
        const newTop = Math.max(0, Math.min(startTop + dy, maxTop));
        onUpdate(item.id, { left: newLeft, top: newTop });
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.classList.remove('dragging-active');
      };
      document.body.classList.add('dragging-active');
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [item.id, item.left, item.top, item.width, item.height, canvasRect, onUpdate]
  );

  const handleResizeStart = useCallback(
    (e, handlePos) => {
      e.preventDefault();
      e.stopPropagation();
      setSelected(true);
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = item.width;
      const startHeight = item.height;
      const startLeft = item.left;
      const startTop = item.top;
      const isEdge = ['n', 's', 'e', 'w'].includes(handlePos);
      const onMouseMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;
        if (isEdge) {
          if (handlePos === 'n') { newHeight = Math.max(MIN_H, startHeight - dy); newTop = startTop + (startHeight - newHeight); }
          else if (handlePos === 's') { newHeight = Math.max(MIN_H, startHeight + dy); }
          else if (handlePos === 'e') { newWidth = Math.max(MIN_W, startWidth + dx); }
          else if (handlePos === 'w') { newWidth = Math.max(MIN_W, startWidth - dx); newLeft = startLeft + (startWidth - newWidth); }
        } else {
          newWidth = (handlePos === 'se' || handlePos === 'ne') ? startWidth + dx : startWidth - dx;
          newHeight = (handlePos === 'se' || handlePos === 'sw') ? startHeight + dy : startHeight - dy;
          const widthDiff = startWidth - newWidth;
          const heightDiff = startHeight - newHeight;
          if (handlePos === 'nw') { newLeft = startLeft + widthDiff; newTop = startTop + heightDiff; }
          else if (handlePos === 'ne') { newTop = startTop + heightDiff; }
          else if (handlePos === 'sw') { newLeft = startLeft + widthDiff; }
        }
        newWidth = Math.max(MIN_W, newWidth);
        newHeight = Math.max(MIN_H, newHeight);
        if (canvasRect) {
          newWidth = Math.min(canvasRect.width, newWidth);
          newHeight = Math.min(canvasRect.height, newHeight);
        }
        onUpdate(item.id, { width: newWidth, height: newHeight, left: newLeft, top: newTop });
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.classList.remove('resizing-active');
        document.body.style.cursor = '';
      };
      document.body.classList.add('resizing-active');
      const cursorMap = { nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize', n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize' };
      document.body.style.cursor = cursorMap[handlePos] || 'nw-resize';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [item.id, item.width, item.height, item.left, item.top, canvasRect, onUpdate]
  );

  return (
    <div
      ref={containerRef}
      className={`placed-textbox${selected ? ' placed-textbox-selected' : ''}`}
      style={{
        position: 'absolute',
        left: item.left,
        top: item.top,
        width: item.width,
        height: item.height,
        zIndex: selected ? 11 : 10,
      }}
      onMouseDown={(e) => { if (e.target === containerRef.current || e.target.closest('.placed-textbox-edge')) setSelected(true); }}
    >
      {selected && (
        <div className="placed-textbox-toolbar" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, pointerEvents: 'auto', transform: 'translateY(calc(-100% - 8px))' }}>
          <div className="placed-textbox-toolbar-group">
            <button type="button" className="placed-cta-btn" aria-label="Bold" title="Bold"><Bold size={18} /></button>
            <button type="button" className="placed-cta-btn" aria-label="Italic" title="Italic"><Italic size={18} /></button>
            <button type="button" className="placed-cta-btn" aria-label="Underline" title="Underline"><Underline size={18} /></button>
            <button type="button" className="placed-cta-btn" aria-label="List" title="List"><List size={18} /></button>
            <button type="button" className="placed-cta-btn" aria-label="Numbered list" title="Numbered list"><ListOrdered size={18} /></button>
            <button type="button" className="placed-cta-btn" aria-label="Color" title="Color"><Palette size={18} /></button>
            <button type="button" className="placed-cta-btn" aria-label="Checkbox" title="Checkbox"><CheckSquare size={18} /></button>
            <button type="button" className="placed-cta-btn" aria-label="Tools" title="Tools"><Wrench size={18} /></button>
          </div>
        </div>
      )}

      {selected && (
        <>
          <div className="placed-textbox-edge placed-textbox-edge-t" onMouseDown={handleDragStart} />
          <div className="placed-textbox-edge placed-textbox-edge-b" onMouseDown={handleDragStart} />
          <div className="placed-textbox-edge placed-textbox-edge-l" onMouseDown={handleDragStart} />
          <div className="placed-textbox-edge placed-textbox-edge-r" onMouseDown={handleDragStart} />
        </>
      )}
      <button
        type="button"
        className="placed-textbox-remove"
        aria-label="Remove text box"
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
      >
        ×
      </button>

      {selected && ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map((pos) => (
        <div
          key={pos}
          className={`resize-handle resize-handle-${pos}`}
          data-handle={pos}
          onMouseDown={(e) => handleResizeStart(e, pos)}
          role="presentation"
        />
      ))}

      <div className="placed-textbox-input-wrap">
        <div
          ref={editableRef}
          className="placed-textbox-input placed-textbox-editable"
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          onClick={handleSelect}
          onFocus={() => setSelected(true)}
          data-placeholder={hasBom ? 'Type here… Use / for Parts or Tools' : 'Type here…'}
          data-empty={!content.trim() ? 'true' : undefined}
        >
          {segments.map((seg, i) => {
            if (seg.type === 'text') {
              return seg.value ? <span key={`t-${i}-${seg.value.slice(0, 8)}`}>{seg.value}</span> : segments.length === 1 ? <br key="empty" /> : null;
            }
            if (seg.type === 'part') {
              return (
                <span
                  key={`part-${i}-${seg.value}`}
                  className="placed-textbox-tag placed-textbox-tag--part"
                  contentEditable={false}
                  data-token-type="part"
                  data-token-value={seg.value}
                >
                  {seg.value}
                </span>
              );
            }
            if (seg.type === 'tool') {
              const isEditing = editingToolTag?.segmentIndex === i;
              if (isEditing) {
                return (
                  <span key={`tool-edit-${i}`} className="placed-textbox-tag placed-textbox-tag--tool placed-textbox-tag--editing">
                    <input
                      ref={editTagInputRef}
                      type="text"
                      className="placed-textbox-tag-input"
                      value={editTagValue}
                      onChange={(e) => setEditTagValue(e.target.value)}
                      onBlur={commitToolTagEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitToolTagEdit();
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setEditingToolTag(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </span>
                );
              }
              {
                const orphaned = toolIdsForOperation.length > 0 && !isToolInTable(seg.value);
                return (
                  <span
                    key={`tool-${i}-${seg.value}`}
                    className={`placed-textbox-tag placed-textbox-tag--tool${orphaned ? ' placed-textbox-tag--orphaned' : ''}`}
                    contentEditable={false}
                    data-token-type="tool"
                    data-token-value={seg.value}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (orphaned && operationId && onAddToolToBom) {
                        onAddToolToBom(operationId, seg.value);
                        return;
                      }
                      // Open reassign menu for normal tags
                      if (hasBom) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTagMenu({ segmentIndex: i, value: seg.value, rect });
                      }
                    }}
                    data-orphaned-tip={orphaned ? 'Click to add back to table' : undefined}
                    title={!orphaned && hasBom ? 'Click to reassign' : undefined}
                  >
                    {seg.value}
                  </span>
                );
              }
            }
            return null;
          })}
        </div>
        {showMenu && (
          <div
            className="placed-textbox-slash-menu notes-editor-menu"
            style={{ left: `${menuPosition.left}px`, top: `${menuPosition.top}px` }}
          >
            {menuOpen === 'root' && !submenu && (
              <>
                <button type="button" className="notes-editor-menu-item" onClick={handleChooseParts}>Parts</button>
                <button type="button" className="notes-editor-menu-item" onClick={handleChooseTools}>Tools</button>
              </>
            )}
            {menuOpen === 'parts' && !submenu && (
              <>
                <button type="button" className="notes-editor-menu-item notes-editor-menu-item--back" onClick={handleBack}>← Back</button>
                <div className="notes-editor-menu-label">Parts in this operation</div>
                {partsList.length === 0 ? (
                  <div className="notes-editor-menu-empty">No parts in this operation yet.</div>
                ) : (
                  partsList.map((p, i) => (
                    <button key={p.id || i} type="button" className="notes-editor-menu-item" onClick={() => handleInsertPart(p.name)}>
                      {p.name}
                    </button>
                  ))
                )}
                <div className="notes-editor-menu-divider" />
                <button type="button" className="notes-editor-menu-item" onClick={() => setSubmenu('add-part')}>Add a new part…</button>
              </>
            )}
            {submenu === 'add-part' && (
              <>
                <button type="button" className="notes-editor-menu-item notes-editor-menu-item--back" onClick={() => setSubmenu(null)}>← Back</button>
                <div className="notes-editor-menu-form">
                  <input type="text" placeholder="Part name" value={addPartName} onChange={(e) => setAddPartName(e.target.value)} className="notes-editor-input-inline" autoFocus />
                  <input type="number" min={1} placeholder="Qty" value={addPartQty} onChange={(e) => setAddPartQty(parseInt(e.target.value, 10) || 1)} className="notes-editor-input-inline notes-editor-input-qty" />
                  <button type="button" className="notes-editor-btn-add" onClick={handleAddNewPartSubmit}>Add</button>
                </div>
              </>
            )}
            {menuOpen === 'tools' && !submenu && (
              <>
                <button type="button" className="notes-editor-menu-item notes-editor-menu-item--back" onClick={handleBack}>← Back</button>
                {toolsList.length === 0 ? (
                  <div className="notes-editor-menu-empty">No tools yet. Add a tool to get started.</div>
                ) : (
                  toolsList.map((t) => (
                    <button key={t.id} type="button" className="notes-editor-menu-item" onClick={() => handleInsertTool(t.name)}>{t.name}</button>
                  ))
                )}
                <div className="notes-editor-menu-divider" />
                <button type="button" className="notes-editor-menu-item" onClick={() => setSubmenu('add-tool')}>Add a new tool…</button>
              </>
            )}
            {submenu === 'add-tool' && (
              <>
                <button type="button" className="notes-editor-menu-item notes-editor-menu-item--back" onClick={() => setSubmenu(null)}>← Back</button>
                <div className="notes-editor-menu-form">
                  <input type="text" placeholder="Tool name" value={addToolName} onChange={(e) => setAddToolName(e.target.value)} className="notes-editor-input-inline" autoFocus />
                  <button type="button" className="notes-editor-btn-add" onClick={handleAddNewToolSubmit}>Add</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tag reassign menu — fixed so it escapes contentEditable clipping */}
      {tagMenu && (() => {
        const currentTool = toolsList.find(t => (t.name || '').toLowerCase() === tagMenu.value.toLowerCase());
        const others = toolsList.filter(t => (t.name || '').trim() && (t.name || '').toLowerCase() !== tagMenu.value.toLowerCase());
        const top = tagMenu.rect.bottom + 6;
        const left = tagMenu.rect.left;
        return (
          <div
            className="ptb-tag-menu"
            style={{
              position: 'fixed', top, left, zIndex: 9999,
              background: '#fff', border: '1px solid #E5E7EB',
              borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
              minWidth: 180, padding: '6px 0', fontSize: 13,
            }}
          >
            <div style={{ padding: '4px 12px 6px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Reassign tag
            </div>
            {others.length === 0 ? (
              <div style={{ padding: '6px 12px', color: '#9CA3AF', fontStyle: 'italic' }}>No other tools in library</div>
            ) : others.map(t => (
              <button
                key={t.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  // Update tag text in content
                  const newSegments = segments.map((seg, idx) =>
                    idx === tagMenu.segmentIndex ? { ...seg, value: t.name } : seg
                  );
                  onUpdate(item.id, { content: segmentsToContent(newSegments) });
                  // Swap tool in operation
                  if (operationId && currentTool && onReplaceToolInOperation) {
                    onReplaceToolInOperation(operationId, currentTool.id, t);
                  } else if (operationId && onAddToolToBom) {
                    onAddToolToBom(operationId, t.name);
                  }
                  setTagMenu(null);
                }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '7px 14px', background: 'none', border: 'none',
                  cursor: 'pointer', color: '#111827', fontSize: 13,
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {t.name}
              </button>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
