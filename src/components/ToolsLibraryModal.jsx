import { useState, useRef, useEffect } from 'react';
import { X, Trash2, AlertTriangle, Plus } from 'lucide-react';
import { getOperationsUsingTool } from '../lib/docTree.js';

export default function ToolsLibraryModal({
  open,
  onClose,
  tools = [],
  onRemoveTool,
  onRenameTool,
  onAddTool,
  operations = [],
}) {
  const [editingToolId, setEditingToolId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [popPos, setPopPos] = useState({ top: 0, right: 0 });
  const [adding, setAdding] = useState(false);
  const [addValue, setAddValue] = useState('');
  const inputRef = useRef(null);
  const addInputRef = useRef(null);

  const commitAdd = () => {
    if (onAddTool?.(addValue)) {
      setAddValue('');
      // keep the input open so user can add more
      requestAnimationFrame(() => addInputRef.current?.focus());
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target.id === 'toolsLibraryModal' || e.target.classList.contains('modal-overlay')) onClose();
  };

  // Close popconfirm on Escape
  useEffect(() => {
    if (!confirmDeleteId) return;
    const handler = (e) => { if (e.key === 'Escape') setConfirmDeleteId(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [confirmDeleteId]);

  useEffect(() => {
    if (editingToolId != null) {
      const tool = tools.find((t) => t.id === editingToolId);
      setEditValue(tool?.name ?? '');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editingToolId, tools]);

  const commitRename = (toolId, oldName) => {
    const trimmed = (editValue ?? '').toString().trim();
    setEditingToolId(null);
    if (!trimmed || trimmed === oldName) return;
    onRenameTool?.(toolId, trimmed, oldName);
  };

  if (!open) return null;

  return (
    <div
      className="modal-overlay open"
      id="toolsLibraryModal"
      onClick={handleOverlayClick}
    >
      <div className="modal tools-library-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tools-library-modal-header">
          <h2 className="tools-library-modal-title">Tools Library</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {onAddTool && (
              <button
                type="button"
                onClick={() => { setAdding(true); requestAnimationFrame(() => addInputRef.current?.focus()); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: '#4F6EF7', color: '#fff', border: 'none',
                  borderRadius: 7, padding: '6px 13px', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Plus size={13} />
                Add tool
              </button>
            )}
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
              <X className="modal-close-icon" size={18} />
            </button>
          </div>
        </div>
        <div className="tools-library-modal-body">
          {/* Inline add row — shown when adding is true */}
          {adding && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#fff', border: '1px solid #4F6EF7',
              borderRadius: 8, padding: '9px 13px', marginBottom: 16,
              boxShadow: '0 0 0 3px rgba(79,110,247,0.12)',
            }}>
              <input
                ref={addInputRef}
                type="text"
                value={addValue}
                onChange={e => setAddValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); commitAdd(); }
                  if (e.key === 'Escape') { setAdding(false); setAddValue(''); }
                }}
                placeholder="Tool name… press Enter to add, Esc to cancel"
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 14, color: '#111827',
                }}
              />
              <button
                onClick={commitAdd}
                style={{
                  background: '#4F6EF7', color: '#fff', border: 'none',
                  borderRadius: 6, padding: '5px 13px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Add
              </button>
              <button
                onClick={() => { setAdding(false); setAddValue(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2 }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {tools.length === 0 && !adding ? (
            <p className="tools-library-empty">No tools yet. Click <strong>+ Add tool</strong> to get started.</p>
          ) : tools.length > 0 ? (
            <div className="tools-library-table-wrap">
              <table className="tools-library-table">
                <thead>
                  <tr>
                    <th className="tools-library-th tools-library-th--tool">Tool</th>
                    <th className="tools-library-th tools-library-th--documents">Documents</th>
                    <th className="tools-library-th tools-library-th--action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map((tool) => {
                    const usedIn = getOperationsUsingTool(operations, tool.id);
                    const documentsText = usedIn.length > 0
                      ? usedIn.map((op) => op.label).join(', ')
                      : '—';
                    const isEditing = editingToolId === tool.id;
                    const isConfirming = confirmDeleteId === tool.id;
                    return (
                      <tr key={tool.id} className="tools-library-row">
                        <td className="tools-library-td tools-library-td--tool">
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              type="text"
                              className="tools-library-name-input"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => commitRename(tool.id, tool.name)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  commitRename(tool.id, tool.name);
                                }
                                if (e.key === 'Escape') {
                                  setEditingToolId(null);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span
                              className="tools-library-name-cell"
                              onDoubleClick={() => onRenameTool && setEditingToolId(tool.id)}
                              title="Double-click to rename"
                            >
                              {tool.name}
                            </span>
                          )}
                        </td>
                        <td className="tools-library-td tools-library-td--documents">{documentsText}</td>
                        <td className="tools-library-td tools-library-td--action">
                          <button
                            type="button"
                            className="tools-library-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isConfirming) {
                                setConfirmDeleteId(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setPopPos({ top: rect.top - 8, right: window.innerWidth - rect.right });
                                setConfirmDeleteId(tool.id);
                              }
                            }}
                            aria-label={`Remove ${tool.name}`}
                            title="Remove from library"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      {/* Popconfirm — fixed so it escapes all overflow:hidden/auto parents */}
      {confirmDeleteId && (() => {
        const tool = tools.find(t => t.id === confirmDeleteId);
        return (
          <>
            {/* invisible backdrop to catch outside clicks */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
              onClick={() => setConfirmDeleteId(null)}
            />
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: popPos.top - 80,
                right: popPos.right - 4,
                zIndex: 9999,
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,0.16)',
                padding: '12px 14px',
                minWidth: 240,
                whiteSpace: 'normal',
              }}
            >
              {/* Arrow pointing down-right toward the button */}
              <div style={{
                position: 'absolute', bottom: -6, right: 12,
                width: 10, height: 10,
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderTop: 'none', borderLeft: 'none',
                transform: 'rotate(45deg)',
              }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                <AlertTriangle size={15} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.4 }}>
                  Deleting <strong>{tool?.name}</strong> will remove it from all documents.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                    border: '1px solid #E5E7EB', background: '#fff',
                    color: '#374151', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { onRemoveTool?.(confirmDeleteId); setConfirmDeleteId(null); }}
                  style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                    border: 'none', background: '#EF4444',
                    color: '#fff', cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
