/**
 * A placed text box on the canvas. Bounding box + toolbar when selected.
 * When BOM props are provided (des-combined): typing "/" opens a menu to insert Part or Tool;
 * selecting adds to the operation's parts table or the tools table.
 */
import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Underline, List, ListOrdered, Palette, CheckSquare, Wrench, X, Boxes, SquarePen, ExternalLink, Unlink } from 'lucide-react';
import ProcedureRichTextEditor from './ProcedureRichTextEditor.jsx';
import { hasRichTextContent, stripProcedureRichText } from '../lib/procedureRichText.js';

const MIN_W = 120;
const MIN_H = 60;

const TOKEN_PART = /\[Part:\s*([^\]]+)\]/gi;
const TOKEN_TOOL = /\[Tool:\s*([^\]]+)\]/gi;
const TOKEN_PROCEDURE = /\[Procedure:\s*([^\]]+)\]/gi;

function stripProcedureTokenLabel(value) {
  return (value ?? '').toString().replace(/\[Procedure:\s*([^\]]+)\]/gi, '$1');
}

function createTokenElement(type, value, label = value) {
  const el = document.createElement('span');
  el.className = `placed-textbox-tag placed-textbox-tag--${type}`;
  el.setAttribute('data-token-type', type);
  el.setAttribute('data-token-value', value);
  el.contentEditable = 'false';
  el.textContent = label;
  return el;
}

function serializedLength(node) {
  if (!node) return 0;
  if (node.nodeType === 3) return node.textContent.length;
  if (node.nodeType !== 1) return 0;
  const el = node;
  const tokenType = el.getAttribute?.('data-token-type');
  if (tokenType) {
    const label = tokenType.charAt(0).toUpperCase() + tokenType.slice(1);
    return `[${label}: ${el.getAttribute('data-token-value') ?? ''}]`.length;
  }
  let length = 0;
  for (const child of el.childNodes) length += serializedLength(child);
  return length;
}

function getSerializedOffsetForDomPoint(container, targetNode, targetOffset) {
  if (!container || !targetNode) return 0;
  let offset = 0;
  let found = false;

  const walk = (node) => {
    if (!node) return;
    if (found) return;
    if (node === targetNode) {
      if (node.nodeType === 3) {
        offset += targetOffset;
      } else {
        for (let i = 0; i < targetOffset; i += 1) {
          offset += serializedLength(node.childNodes[i]);
        }
      }
      found = true;
      return;
    }
    if (node.nodeType === 3) {
      offset += node.textContent.length;
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node;
    if (el.getAttribute?.('data-token-type')) {
      offset += serializedLength(el);
      return;
    }
    for (const child of el.childNodes) walk(child);
  };

  for (const child of container.childNodes) walk(child);
  return offset;
}

/** Parse content string into segments: text and Part/Tool tokens for tag rendering */
function parseContentToSegments(content) {
  if (!content || typeof content !== 'string') return [{ type: 'text', value: '' }];
  const segments = [];
  let lastIndex = 0;
  const re = /\[(Part|Tool|Procedure):\s*([^\]]+)\]/gi;
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
  return segments.map((s) => {
    if (s.type === 'text') return s.value;
    if (s.type === 'part') return `[Part: ${s.value}]`;
    if (s.type === 'tool') return `[Tool: ${s.value}]`;
    if (s.type === 'procedure') return `[Procedure: ${s.value}]`;
    return s.value ?? '';
  }).join('');
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
    if (el.getAttribute?.('data-token-type') === 'procedure') {
      s += `[Procedure: ${el.getAttribute('data-token-value') ?? ''}]`;
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
    if (el.getAttribute?.('data-token-type') === 'part' || el.getAttribute?.('data-token-type') === 'tool' || el.getAttribute?.('data-token-type') === 'procedure') {
      const val = el.getAttribute('data-token-value') ?? '';
      const type = el.getAttribute('data-token-type');
      const label = type === 'part' ? 'Part' : type === 'tool' ? 'Tool' : 'Procedure';
      const token = `[${label}: ${val}]`;
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
  procedures = [],
  onSaveProcedure,
  onGoToProcedureLibrary,
}) {
  const editableRef = useRef(null);
  const containerRef = useRef(null);
  const [selected, setSelected] = useState(false);
  const cursorRestoreRef = useRef(null);
  const frozenContentRef = useRef(item.content ?? '');
  const [isEditing, setIsEditing] = useState(false);

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
  const [procedureTagMenu, setProcedureTagMenu] = useState(null);
  const [selectionMenu, setSelectionMenu] = useState(null);
  const [procedureDraft, setProcedureDraft] = useState(null);
  const [editableRevision, setEditableRevision] = useState(0);

  // Close tag menu on outside click or Escape
  useEffect(() => {
    if (!tagMenu) return;
    const onKey = (e) => { if (e.key === 'Escape') setTagMenu(null); };
    const onDown = (e) => { if (!e.target.closest('.ptb-tag-menu')) setTagMenu(null); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, [tagMenu]);

  useEffect(() => {
    if (!procedureTagMenu) return;
    const onKey = (e) => { if (e.key === 'Escape') setProcedureTagMenu(null); };
    const onDown = (e) => { if (!e.target.closest('.ptb-procedure-menu') && !e.target.closest('.placed-textbox-tag--procedure')) setProcedureTagMenu(null); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, [procedureTagMenu]);

  const hasBom = Boolean(onAddPartToOperation && onAddToolToBom);
  const hasProcedures = Boolean(onSaveProcedure);
  const content = item.content ?? '';
  const displayContent = isEditing ? frozenContentRef.current : content;
  const segments = useMemo(() => parseContentToSegments(displayContent), [displayContent]);

  useEffect(() => {
    if (!isEditing) frozenContentRef.current = content;
  }, [content, isEditing]);

  useEffect(() => {
    if (!selected) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSelected(false);
        if (!isEditing) setSelectionMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selected, isEditing]);

  useEffect(() => {
    if (!selected || isEditing) return;
    const handleDeleteKey = (e) => {
      const active = document.activeElement;
      if (active?.closest?.('input, textarea, [contenteditable="true"], .ptb-procedure-modal')) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onRemove(item.id);
      }
    };
    document.addEventListener('keydown', handleDeleteKey);
    return () => document.removeEventListener('keydown', handleDeleteKey);
  }, [item.id, isEditing, onRemove, selected]);

  useEffect(() => {
    if (isEditing || cursorRestoreRef.current === null || !editableRef.current) return;
    const offset = cursorRestoreRef.current;
    cursorRestoreRef.current = null;
    requestAnimationFrame(() => setCursorOffset(editableRef.current, offset));
  }, [content, isEditing]);

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

  const syncEditableEmptyState = useCallback((el) => {
    if (!el) return;
    const serialized = serializeEditable(el);
    if (!serialized.trim()) el.setAttribute('data-empty', 'true');
    else el.removeAttribute('data-empty');
  }, []);

  const releaseDomToReact = useCallback(
    (nextContent, restoreOffset = null) => {
      frozenContentRef.current = nextContent;
      if (restoreOffset != null) cursorRestoreRef.current = restoreOffset;
      setEditableRevision((revision) => revision + 1);
      setIsEditing(false);
      onUpdate(item.id, { content: nextContent });
      requestAnimationFrame(() => {
        const el = editableRef.current;
        if (!el) return;
        el.focus();
        if (restoreOffset != null) setCursorOffset(el, restoreOffset);
        frozenContentRef.current = nextContent;
        setIsEditing(true);
      });
    },
    [item.id, onUpdate]
  );

  const insertAtCursor = useCallback(
    (token) => {
      const pos = cursorPosRef.current;
      const base = isEditing && editableRef.current ? serializeEditable(editableRef.current) : content;
      const next = base.slice(0, pos) + token + base.slice(pos);
      setMenuOpen(null);
      setSubmenu(null);
      releaseDomToReact(next, pos + token.length);
    },
    [content, isEditing, releaseDomToReact]
  );

  const handleInput = useCallback(() => {
    try {
      const el = editableRef.current;
      if (!el) return;
      syncEditableEmptyState(el);
      cursorPosRef.current = getCursorOffset(el);
    } catch {
      setSelectionMenu(null);
    }
  }, [syncEditableEmptyState]);

  const updateSelectionMenu = useCallback(() => {
    try {
      if (!hasProcedures || !editableRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setSelectionMenu(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!editableRef.current.contains(range.commonAncestorContainer)) {
        setSelectionMenu(null);
        return;
      }
      const text = sel.toString().trim();
      if (!text) {
        setSelectionMenu(null);
        return;
      }
      let rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        const rects = range.getClientRects();
        if (rects.length > 0) rect = rects[0];
      }
      const fragment = range.cloneContents();
      const containsToken = Boolean(fragment.querySelector?.('[data-token-type]'));
      const contentSnapshot = serializeEditable(editableRef.current);
      const selectionStart = getSerializedOffsetForDomPoint(editableRef.current, range.startContainer, range.startOffset);
      const selectionEnd = getSerializedOffsetForDomPoint(editableRef.current, range.endContainer, range.endOffset);
      setSelectionMenu({
        text,
        contentSnapshot,
        range: range.cloneRange(),
        startOffset: Math.min(selectionStart, selectionEnd),
        endOffset: Math.max(selectionStart, selectionEnd),
        left: rect.left + rect.width / 2,
        top: rect.top,
        disabledReason: containsToken
          ? 'Procedures cannot include tags or nested procedures yet.'
          : null,
      });
    } catch {
      setSelectionMenu(null);
    }
  }, [hasProcedures]);

  useEffect(() => {
    if (!hasProcedures) return;
    const onSelectionChange = () => {
      const el = editableRef.current;
      if (!el || document.activeElement !== el) return;
      updateSelectionMenu();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [hasProcedures, updateSelectionMenu]);

  useEffect(() => {
    if (!selectionMenu) return;
    const dismissSelectionMenu = (e) => {
      if (e.target.closest('.placed-textbox-selection-toolbar')) return;
      if (editableRef.current?.contains(e.target)) return;
      setSelectionMenu(null);
      const sel = window.getSelection();
      sel?.removeAllRanges();
    };
    document.addEventListener('mousedown', dismissSelectionMenu);
    return () => document.removeEventListener('mousedown', dismissSelectionMenu);
  }, [selectionMenu]);

  const handleEditorFocus = useCallback(() => {
    setSelected(true);
    if (!isEditing) return;
    const el = editableRef.current;
    frozenContentRef.current = el ? serializeEditable(el) : content;
  }, [content, isEditing]);

  const handleEditorBlur = useCallback(
    (e) => {
      const next = e.relatedTarget;
      if (
        next?.closest?.(
          '.placed-textbox-slash-menu, .placed-textbox-selection-toolbar, .ptb-procedure-menu, .ptb-tag-menu, .ptb-procedure-modal, .placed-textbox-tag-input'
        )
      ) {
        return;
      }
      window.setTimeout(() => {
        const active = document.activeElement;
        if (
          active?.closest?.(
            '.placed-textbox-slash-menu, .placed-textbox-selection-toolbar, .ptb-procedure-menu, .ptb-tag-menu, .ptb-procedure-modal, .placed-textbox-tag-input'
          )
        ) {
          return;
        }
        const el = editableRef.current;
        if (!el) return;
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && el.contains(sel.anchorNode)) {
          updateSelectionMenu();
          return;
        }
        const serialized = serializeEditable(el);
        frozenContentRef.current = serialized;
        setIsEditing(false);
        syncEditableEmptyState(el);
        onUpdate(item.id, { content: serialized });
        setSelectionMenu(null);
      }, 0);
    },
    [item.id, onUpdate, syncEditableEmptyState, updateSelectionMenu]
  );

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
      if ((hasBom || hasProcedures) && e.key === '/' && !menuOpen && !submenu) {
        e.preventDefault();
        cursorPosRef.current = getCursorOffset(editableRef.current);
        updateMenuPositionFromCaret();
        setMenuOpen('root');
      }
    },
    [hasBom, hasProcedures, menuOpen, submenu, updateMenuPositionFromCaret]
  );

  const handleSelect = useCallback(() => {
    if (!isEditing) return;
    if (editableRef.current) cursorPosRef.current = getCursorOffset(editableRef.current);
    updateSelectionMenu();
  }, [isEditing, updateSelectionMenu]);

  const enterEditMode = useCallback(() => {
    setSelected(true);
    const el = editableRef.current;
    frozenContentRef.current = el ? serializeEditable(el) : content;
    setIsEditing(true);
    requestAnimationFrame(() => {
      const nextEl = editableRef.current;
      if (!nextEl) return;
      nextEl.focus();
      setCursorOffset(nextEl, serializeEditable(nextEl).length);
    });
  }, [content]);

  const handleChooseParts = () => setMenuOpen('parts');
  const handleChooseTools = () => setMenuOpen('tools');
  const handleChooseProcedures = () => setMenuOpen('procedures');
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

  const handleInsertProcedure = (name) => {
    insertAtCursor(`[Procedure: ${name}]`);
  };

  const openProcedureDraftFromSelection = () => {
    if (!selectionMenu || selectionMenu.disabledReason) return;
    setProcedureDraft({
      mode: 'create',
      name: '',
      text: selectionMenu.text,
      range: selectionMenu.range,
    });
    setSelectionMenu(null);
  };

  const replaceSelectionWithToken = (token) => {
    const range = selectionMenu?.range;
    const el = editableRef.current;
    if (!range || !el) {
      setSelectionMenu(null);
      return;
    }
    try {
      const tokenMatch = String(token).match(/^\[(Part|Tool|Procedure):\s*([^\]]+)\]$/i);
      range.deleteContents();
      if (tokenMatch) {
        range.insertNode(createTokenElement(tokenMatch[1].toLowerCase(), tokenMatch[2].trim()));
      } else {
        range.insertNode(document.createTextNode(token));
      }
      releaseDomToReact(serializeEditable(el));
    } catch {
      setSelectionMenu(null);
    }
    setSelectionMenu(null);
  };

  const convertSelectionToPart = () => {
    if (!selectionMenu || selectionMenu.disabledReason) return;
    const name = selectionMenu.text;
    if (operationId && onAddPartToOperation) onAddPartToOperation(operationId, name, 1);
    replaceSelectionWithToken(`[Part: ${name}]`);
  };

  const convertSelectionToTool = () => {
    if (!selectionMenu || selectionMenu.disabledReason) return;
    const name = selectionMenu.text;
    if (operationId && onAddToolToBom && !isToolInTable(name)) onAddToolToBom(operationId, name);
    replaceSelectionWithToken(`[Tool: ${name}]`);
  };

  const saveProcedureDraft = () => {
    if (!procedureDraft || !onSaveProcedure) return;
    const name = procedureDraft.name.trim();
    if (!name) return;
    const saved = onSaveProcedure({
      name,
      text: procedureDraft.text,
      previousName: procedureDraft.previousName,
    });
    if (procedureDraft.mode === 'create' && saved?.name && editableRef.current) {
      try {
        procedureDraft.range.deleteContents();
        procedureDraft.range.insertNode(createTokenElement('procedure', saved.name, stripProcedureRichText(saved.text || saved.name)));
        releaseDomToReact(serializeEditable(editableRef.current));
      } catch {
        // Keep the saved procedure even if the selection disappeared before insertion.
      }
    }
    setProcedureDraft(null);
    setSelectionMenu(null);
  };

  const detachProcedureAt = (segmentIndex) => {
    const proc = procedures.find((p) => p.name === segments[segmentIndex]?.value);
    const detachedText = proc?.text
      ? stripProcedureRichText(proc.text)
      : stripProcedureTokenLabel(segments[segmentIndex]?.value);
    const next = segments.map((seg, idx) => (
      idx === segmentIndex ? { type: 'text', value: detachedText } : seg
    ));
    releaseDomToReact(segmentsToContent(next));
    setProcedureTagMenu(null);
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
    releaseDomToReact(newContent);
  }, [editingToolTag, editTagValue, segments, releaseDomToReact, onAddToolToBom, operationId]);

  useEffect(() => {
    if (editingToolTag != null) {
      setEditTagValue(editingToolTag.originalValue);
      requestAnimationFrame(() => editTagInputRef.current?.focus());
    }
  }, [editingToolTag]);

  const partsList = useMemo(() => (
    Array.isArray(partsForOperation) ? partsForOperation : []
  ), [partsForOperation]);
  const toolsList = useMemo(() => (
    Array.isArray(toolsBom) ? toolsBom : []
  ), [toolsBom]);
  const tid = useMemo(() => (
    new Set(Array.isArray(toolIdsForOperation) ? toolIdsForOperation : [])
  ), [toolIdsForOperation]);
  // A tool tag is "orphaned" when the named tool is not in this operation's table
  const isToolInTable = useCallback((name) =>
    toolsList.some(t => tid.has(t.id) && (t.name || '').trim().toLowerCase() === (name || '').trim().toLowerCase()),
  [tid, toolsList]);
  const showMenu = (hasBom || hasProcedures) && (
    menuOpen === 'root' || menuOpen === 'parts' || menuOpen === 'tools' || menuOpen === 'procedures' || submenu
  );

  const handleDragStart = useCallback(
    (e) => {
      if (
        isEditing
        || e.target.closest('textarea')
        || e.target.closest('.resize-handle')
        || e.target.closest('.placed-textbox-toolbar')
        || e.target.closest('.placed-textbox-slash-menu')
        || e.target.closest('.ptb-procedure-menu')
        || e.target.closest('.ptb-tag-menu')
      ) return;
      e.preventDefault();
      setSelected(true);
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
    [isEditing, item.id, item.left, item.top, item.width, item.height, canvasRect, onUpdate]
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

  const renderedSegments = useMemo(() => segments.map((seg, i) => {
    if (seg.type === 'text') {
      return seg.value ? <span key={`t-${i}-${seg.value.slice(0, 8)}`}>{seg.value}</span> : null;
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
      const editingThisTool = editingToolTag?.segmentIndex === i;
      if (editingThisTool) {
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
    if (seg.type === 'procedure') {
      const procedure = procedures.find((p) => p.name === seg.value);
      const procedureDisplay = procedure?.text
        ? stripProcedureTokenLabel(procedure.text)
        : stripProcedureTokenLabel(seg.value);
      return (
        <span
          key={`procedure-${i}-${seg.value}`}
          className="placed-textbox-tag placed-textbox-tag--procedure"
          contentEditable={false}
          data-token-type="procedure"
          data-token-value={seg.value}
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setProcedureTagMenu({ segmentIndex: i, value: seg.value, rect });
          }}
          title={procedure?.name || stripProcedureTokenLabel(seg.value)}
        >
          {procedure?.text ? (
            <span dangerouslySetInnerHTML={{ __html: procedureDisplay }} />
          ) : procedureDisplay}
        </span>
      );
    }
    return null;
  }), [
    commitToolTagEdit,
    editTagValue,
    editingToolTag?.segmentIndex,
    hasBom,
    isToolInTable,
    onAddToolToBom,
    operationId,
    procedures,
    segments,
    toolIdsForOperation.length,
  ]);

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
        cursor: isEditing ? 'text' : 'move',
      }}
      onMouseDown={(e) => {
        if (isEditing) {
          setSelected(true);
          return;
        }
        handleDragStart(e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        enterEditMode();
      }}
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
          key={editableRevision}
          ref={editableRef}
          className="placed-textbox-input placed-textbox-editable"
          contentEditable={isEditing}
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          onClick={handleSelect}
          onMouseUp={() => { if (isEditing) setTimeout(updateSelectionMenu, 0); }}
          onKeyUp={() => { if (isEditing) setTimeout(updateSelectionMenu, 0); }}
          onFocus={handleEditorFocus}
          onBlur={handleEditorBlur}
          aria-label={isEditing ? 'Text box content' : 'Double-click to edit text box'}
          data-placeholder={hasBom || hasProcedures ? 'Type here… Use / for Parts, Tools, or Procedures' : 'Type here…'}
          data-empty={!displayContent.trim() ? 'true' : undefined}
        >
          {renderedSegments}
        </div>
        {showMenu && (
          <div
            className="placed-textbox-slash-menu notes-editor-menu"
            style={{ left: `${menuPosition.left}px`, top: `${menuPosition.top}px` }}
          >
            {menuOpen === 'root' && !submenu && (
              <>
                {hasBom ? <button type="button" className="notes-editor-menu-item" onClick={handleChooseParts}>Parts</button> : null}
                {hasBom ? <button type="button" className="notes-editor-menu-item" onClick={handleChooseTools}>Tools</button> : null}
                {hasProcedures ? <button type="button" className="notes-editor-menu-item" onClick={handleChooseProcedures}>Procedures</button> : null}
              </>
            )}
            {menuOpen === 'procedures' && !submenu && (
              <>
                <button type="button" className="notes-editor-menu-item notes-editor-menu-item--back" onClick={handleBack}>← Back</button>
                <div className="notes-editor-menu-label">Saved procedures</div>
                {procedures.length === 0 ? (
                  <div className="notes-editor-menu-empty">No procedures saved yet.</div>
                ) : (
                  procedures.map((p) => (
                    <button key={p.id || p.name} type="button" className="notes-editor-menu-item" onClick={() => handleInsertProcedure(p.name)}>
                      {p.name}
                    </button>
                  ))
                )}
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

      {selectionMenu && typeof document !== 'undefined' ? createPortal(
        <div
          className="placed-textbox-selection-toolbar"
          style={{
            position: 'fixed',
            left: selectionMenu.left,
            top: selectionMenu.top,
            zIndex: 10001,
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            type="button"
            className="placed-textbox-selection-toolbar-secondary"
            disabled={Boolean(selectionMenu.disabledReason)}
            title={selectionMenu.disabledReason || 'Add highlighted text to your procedures'}
            onClick={openProcedureDraftFromSelection}
          >
            <ListOrdered size={14} aria-hidden />
            Add to procedures
          </button>
          {hasBom ? (
            <>
              <span className="placed-textbox-selection-toolbar-divider" aria-hidden />
              <button
                type="button"
                className="placed-textbox-selection-toolbar-secondary"
                disabled={Boolean(selectionMenu.disabledReason)}
                title={selectionMenu.disabledReason || 'Convert selected text to a tool tag'}
                onClick={convertSelectionToTool}
              >
                <Wrench size={14} aria-hidden />
                Tool
              </button>
              <button
                type="button"
                className="placed-textbox-selection-toolbar-secondary"
                disabled={Boolean(selectionMenu.disabledReason)}
                title={selectionMenu.disabledReason || 'Convert selected text to a part tag'}
                onClick={convertSelectionToPart}
              >
                <Boxes size={14} aria-hidden />
                Part
              </button>
            </>
          ) : null}
        </div>,
        document.body
      ) : null}

      {/* Tag reassign menu — fixed so it escapes contentEditable clipping */}
      {procedureDraft ? (
        <div className="ptb-procedure-modal" onClick={() => setProcedureDraft(null)}>
          <div
            role="dialog"
            aria-labelledby="ptb-procedure-modal-title"
            className={`ptb-procedure-modal-card${procedureDraft.mode === 'create' ? ' ptb-procedure-modal-card--create' : ''}`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="ptb-procedure-modal-header">
              <span id="ptb-procedure-modal-title" className="ptb-procedure-modal-title">
                {procedureDraft.mode === 'edit' ? 'Edit procedure' : 'Add to procedures'}
              </span>
              <button
                type="button"
                className="ptb-procedure-modal-close"
                aria-label="Close"
                onClick={() => setProcedureDraft(null)}
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="ptb-procedure-modal-body">
            {procedureDraft.mode === 'create' ? (
              <p className="ptb-procedure-modal-subtitle">
                This text becomes a reusable procedure. Edits will sync everywhere it&apos;s used.
              </p>
            ) : null}
            <label className="ptb-procedure-modal-field" htmlFor="ptb-procedure-name">
              Procedure name
              <input
                id="ptb-procedure-name"
                value={procedureDraft.name}
                onChange={(e) => setProcedureDraft((p) => ({ ...p, name: e.target.value }))}
                placeholder={procedureDraft.mode === 'create' ? 'e.g. Warranty disclaimer' : undefined}
                autoFocus
              />
            </label>
            <label className="ptb-procedure-modal-field" htmlFor="ptb-procedure-text">
              Procedure text
              <ProcedureRichTextEditor
                id="ptb-procedure-text"
                value={procedureDraft.text}
                onChange={(html) => setProcedureDraft((p) => ({ ...p, text: html }))}
              />
            </label>
            </div>
            <div className="ptb-procedure-modal-actions">
              <button type="button" className="ptb-procedure-modal-btn ptb-procedure-modal-btn--secondary" onClick={() => setProcedureDraft(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="ptb-procedure-modal-btn ptb-procedure-modal-btn--primary"
                onClick={saveProcedureDraft}
                disabled={!procedureDraft.name.trim() || !hasRichTextContent(procedureDraft.text)}
              >
                {procedureDraft.mode === 'edit' ? 'Save procedure' : 'Create procedure'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {procedureTagMenu && (() => {
        const proc = procedures.find((p) => p.name === procedureTagMenu.value);
        const procedureName = proc?.name || procedureTagMenu.value;
        const useCount = Number(proc?.useCount) || 0;
        const top = procedureTagMenu.rect.bottom + 6;
        const left = procedureTagMenu.rect.left;
        return (
          <div
            className="ptb-procedure-menu"
            style={{
              position: 'fixed', top, left, zIndex: 9999,
              background: '#fff', border: '1px solid #E5E7EB',
              borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
              minWidth: 190, padding: '6px 0', fontSize: 13,
            }}
            onMouseEnter={() => setProcedureTagMenu(procedureTagMenu)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 8px' }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: '#6366F1', flexShrink: 0 }} aria-hidden />
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {procedureName}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                {useCount}
                {' '}
                {useCount === 1 ? 'use' : 'uses'}
              </span>
            </div>
            <button
              type="button"
              className="notes-editor-menu-item"
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
              onClick={() => {
                setProcedureDraft({
                  mode: 'edit',
                  previousName: procedureTagMenu.value,
                  name: procedureName,
                  text: proc?.text || procedureTagMenu.value,
                });
                setProcedureTagMenu(null);
              }}
            >
              <SquarePen size={16} aria-hidden />
              Edit procedure
            </button>
            <button type="button" className="notes-editor-menu-item" style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={onGoToProcedureLibrary}>
              <ExternalLink size={16} aria-hidden />
              Go to procedure
            </button>
            <button type="button" className="notes-editor-menu-item" style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => detachProcedureAt(procedureTagMenu.segmentIndex)}>
              <Unlink size={16} aria-hidden />
              Detach
            </button>
          </div>
        );
      })()}

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
                  releaseDomToReact(segmentsToContent(newSegments));
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
