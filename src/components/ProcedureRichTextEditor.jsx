import { useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react';

function normalizeHtml(html) {
  if (html == null) return '';
  const value = String(html);
  if (!value.trim()) return '';
  return value;
}

export default function ProcedureRichTextEditor({
  value,
  onChange,
  id,
  placeholder = 'Procedure content',
  minHeight = 140,
}) {
  const editorRef = useRef(null);
  const lastHtmlRef = useRef(normalizeHtml(value));

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const next = normalizeHtml(value);
    if (el.innerHTML !== next) {
      el.innerHTML = next;
    }
    lastHtmlRef.current = next;
  }, [value]);

  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    if (html !== lastHtmlRef.current) {
      lastHtmlRef.current = html;
      onChange(html);
    }
  }, [onChange]);

  const applyFormat = useCallback((command, arg) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, arg);
    emitChange();
  }, [emitChange]);

  const handleToolbarMouseDown = (event) => {
    event.preventDefault();
  };

  return (
    <div className="procedure-rich-text-editor">
      <div className="procedure-rich-text-toolbar" role="toolbar" aria-label="Text formatting">
        <button
          type="button"
          className="procedure-rich-text-toolbar-btn"
          aria-label="Bold"
          title="Bold"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => applyFormat('bold')}
        >
          <Bold size={16} aria-hidden />
        </button>
        <button
          type="button"
          className="procedure-rich-text-toolbar-btn"
          aria-label="Italic"
          title="Italic"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => applyFormat('italic')}
        >
          <Italic size={16} aria-hidden />
        </button>
        <button
          type="button"
          className="procedure-rich-text-toolbar-btn"
          aria-label="Underline"
          title="Underline"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => applyFormat('underline')}
        >
          <Underline size={16} aria-hidden />
        </button>
        <span className="procedure-rich-text-toolbar-divider" aria-hidden />
        <button
          type="button"
          className="procedure-rich-text-toolbar-btn"
          aria-label="Bulleted list"
          title="Bulleted list"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => applyFormat('insertUnorderedList')}
        >
          <List size={16} aria-hidden />
        </button>
        <button
          type="button"
          className="procedure-rich-text-toolbar-btn"
          aria-label="Numbered list"
          title="Numbered list"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => applyFormat('insertOrderedList')}
        >
          <ListOrdered size={16} aria-hidden />
        </button>
      </div>
      <div
        id={id}
        ref={editorRef}
        className="procedure-rich-text-surface"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        style={{ minHeight }}
      />
    </div>
  );
}
