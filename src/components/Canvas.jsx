import { useRef, useState, useCallback, useEffect } from 'react';
import { FilePlus, Eye, ChevronUp, ChevronDown, Trash2, Library } from 'lucide-react';
import TableEnhancer from './TableEnhancer.jsx';
import { usePrototype } from '../contexts/PrototypeContext.jsx';
import { buildPageList as buildDocPageList, isSubPageId, getPageContext, findNode } from '../lib/docTree.js';
import PlacedTextBox from './PlacedTextBox.jsx';

const MIN_TABLE_W = 160;
const MIN_TABLE_H = 120;

function PageCard({ page, placedItems, canvasRect, onCanvasMouseMove, onCanvasRectChange, onRemovePlacedItem, onUpdatePlacedItem, onOpenModal, onNavigateToCad, onStartRetake, PlacedItemComponent, hoveredRow, setHoveredRow, showPlacedItems, operationId, partsForOperation, toolIdsForOperation, toolsBom, partsCatalog, onAddPartToOperation, onAddToolToBom, onRemovePartFromOperation, onRemoveToolFromOperation, onOpenToolsLibrary, onRenameTool, onRenamePart, onReplacePartInOperation, onReplaceToolInOperation, onReorderPart, onReorderTool, tableLayout, onUpdateTableLayout, activeAddPartsPageId, setActiveAddPartsPageId, activeAddToolsPageId, setActiveAddToolsPageId }) {
  const addingPartRow = activeAddPartsPageId === page.id;
  const addingToolRow = activeAddToolsPageId === page.id;

  const [partDraft, setPartDraft] = useState('');
  const [toolDraft, setToolDraft] = useState('');
  const [editingToolId, setEditingToolId] = useState(null);
  const [editToolValue, setEditToolValue] = useState('');
  const editToolInputRef = useRef(null);
  const [editingPartId, setEditingPartId] = useState(null);
  const [editPartValue, setEditPartValue] = useState('');
  const editPartInputRef = useRef(null);

  // partMenu/toolMenu: null | 'root' | 'add-new' (Parts: root only; no add-new option)
  const [partMenu, setPartMenu] = useState(null);
  const [toolMenu, setToolMenu] = useState(null);

  const partInputRef = useRef(null);
  const toolInputRef = useRef(null);
  const partsWrapperRef = useRef(null);
  const partsTbodyRef   = useRef(null);
  const toolsWrapperRef = useRef(null);
  const toolsTbodyRef   = useRef(null);
  /** Delayed remove on tool row; cleared on second click (double-click) or onDoubleClick (rename). */
  const toolRemoveTimerRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    onCanvasMouseMove({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    onCanvasRectChange?.({ width: rect.width, height: rect.height });
  }, [onCanvasMouseMove, onCanvasRectChange]);

  useEffect(() => {
    if (!addingPartRow) return;
    setTimeout(() => partInputRef.current?.focus(), 0);
  }, [addingPartRow]);

  useEffect(() => {
    if (!addingToolRow) return;
    setTimeout(() => toolInputRef.current?.focus(), 0);
  }, [addingToolRow]);

  useEffect(() => {
    if (editingToolId == null) return;
    const tool = (Array.isArray(toolsBom) ? toolsBom : []).find((t) => t.id === editingToolId);
    setEditToolValue(tool?.name ?? '');
    requestAnimationFrame(() => editToolInputRef.current?.focus());
  }, [editingToolId, toolsBom]);

  const commitToolRename = (toolId, oldName) => {
    const trimmed = (editToolValue ?? '').toString().trim();
    setEditingToolId(null);
    if (!trimmed) {
      // Blank tool with no name committed empty → remove it from this step
      if (!oldName) onRemoveToolFromOperation?.(operationId, toolId);
      return;
    }
    if (trimmed === oldName) return;
    // Keep old tool in library, create new tool, swap in this step, update tags
    onRenameTool?.(toolId, trimmed, oldName, operationId);
  };

  const commitPartRename = (partId, oldName) => {
    const trimmed = (editPartValue ?? '').toString().trim();
    setEditingPartId(null);
    if (!trimmed || trimmed === oldName) return;
    onRenamePart?.(operationId, partId, trimmed, oldName);
  };

  useEffect(() => () => {
    if (toolRemoveTimerRef.current) clearTimeout(toolRemoveTimerRef.current);
  }, []);

  useEffect(() => {
    if (!partMenu && !toolMenu) return;
    const closeIfOutside = (e) => {
      const insideMenu = e.target.closest('.table-slash-menu');
      const insideInput = e.target.closest('.table-slash-input-wrap');
      if (!insideMenu && !insideInput) {
        setPartMenu(null);
        setToolMenu(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setPartMenu(null);
        setToolMenu(null);
      }
    };
    document.addEventListener('mousedown', closeIfOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', closeIfOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [partMenu, toolMenu]);

  const usedParts = (partsForOperation != null ? partsForOperation : page.parts) || [];

  useEffect(() => {
    if (editingPartId == null) return;
    const p = (usedParts || []).find((x) => x.id === editingPartId);
    setEditPartValue(p?.name ?? '');
    requestAnimationFrame(() => editPartInputRef.current?.focus());
  }, [editingPartId, usedParts]);

  const hasPartList = !page.isSubPage && (usedParts.length > 0 || true);
  const showBomTables = toolsBom != null;
  const canAddPart = showBomTables && operationId && onAddPartToOperation;
  const canAddTool = showBomTables && operationId && onAddToolToBom;
  const toolsList = Array.isArray(toolsBom) ? toolsBom : [];
  const tid = toolIdsForOperation || [];
  // Only show tools explicitly added to this operation step
  const toolsForTable = tid.map(id => toolsList.find(t => t.id === id)).filter(Boolean);
  // Library tools not yet in this step are available to pick from the slash menu
  const availableToolsForMenu = toolsList.filter(t => (t.name || '').trim() && !tid.includes(t.id));
  const nextPartBadge = String.fromCharCode(65 + (usedParts?.length ?? 0));

  const usedPartKeys = new Set((usedParts || []).map((p) => (p?.name ?? '').toString().trim().toLowerCase()).filter(Boolean));
  const availableParts = (Array.isArray(partsCatalog) ? partsCatalog : usedParts).filter((p) => {
    const key = (p?.name ?? '').toString().trim().toLowerCase();
    return key && !usedPartKeys.has(key);
  });

  const layout = tableLayout ?? { parts: { x: 0, y: 56, w: 320, h: 220 }, tools: { x: 336, y: 56, w: 200, h: 220 } };

  // Called by Enter key — closes add row if field is empty.
  const submitPartFromDraft = () => {
    const trimmed = (partDraft || '').trim();
    if (!trimmed) {
      setActiveAddPartsPageId?.(null);
      setPartDraft('');
      setPartMenu(null);
      return;
    }
    if (operationId && onAddPartToOperation) {
      const added = onAddPartToOperation(operationId, trimmed, 1);
      if (added) {
        setPartDraft('');
        setPartMenu(null);
        requestAnimationFrame(() => partInputRef.current?.focus());
      }
    }
  };

  // Called by the "+ Add row" button — if field has text, adds it and keeps row open;
  // if field is empty, just keeps add row open and refocuses the input.
  const addPartRowViaButton = () => {
    const trimmed = (partDraft || '').trim();
    if (!trimmed) {
      requestAnimationFrame(() => partInputRef.current?.focus());
      return;
    }
    if (operationId && onAddPartToOperation) {
      const added = onAddPartToOperation(operationId, trimmed, 1);
      if (added) {
        setPartDraft('');
        setPartMenu(null);
        requestAnimationFrame(() => partInputRef.current?.focus());
      }
    }
  };

  // Called by Enter key — closes add row if field is empty.
  const submitToolFromDraft = () => {
    if (!onAddToolToBom || !operationId) return;
    const name = (toolDraft || '').trim();
    if (!name) {
      setActiveAddToolsPageId?.(null);
      setToolDraft('');
      setToolMenu(null);
      return;
    }
    const added = onAddToolToBom(operationId, name);
    if (added) {
      setToolDraft('');
      setToolMenu(null);
      requestAnimationFrame(() => toolInputRef.current?.focus());
    }
  };

  // Called by the "+ Add row" button — if field has text, adds it and keeps row open;
  // if field is empty, just keeps add row open and refocuses the input.
  const addToolRowViaButton = () => {
    if (!onAddToolToBom || !operationId) return;
    const name = (toolDraft || '').trim();
    if (!name) {
      requestAnimationFrame(() => toolInputRef.current?.focus());
      return;
    }
    const added = onAddToolToBom(operationId, name);
    if (added) {
      setToolDraft('');
      setToolMenu(null);
      requestAnimationFrame(() => toolInputRef.current?.focus());
    }
  };

  const handleTableDragStart = useCallback((e, tableKey) => {
    if (!onUpdateTableLayout) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const start = layout[tableKey];
    const onMouseMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      onUpdateTableLayout(tableKey, { x: start.x + dx, y: start.y + dy });
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [layout, onUpdateTableLayout]);

  const handleTableResizeStart = useCallback((e, tableKey) => {
    if (!onUpdateTableLayout) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const start = layout[tableKey];
    const onMouseMove = (ev) => {
      const dw = ev.clientX - startX;
      const dh = ev.clientY - startY;
      onUpdateTableLayout(tableKey, {
        w: Math.max(MIN_TABLE_W, start.w + dw),
        h: Math.max(MIN_TABLE_H, start.h + dh),
      });
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [layout, onUpdateTableLayout]);

  return (
    <div
      className="canvas"
      data-page-id={page.id}
      onMouseMove={handleMouseMove}
    >
      <div className="page-header">
        <h1 className="page-title">{page.title}</h1>
        <span className="page-date">Created Dec 21,2024</span>
      </div>

      {hasPartList && (
        <div className="content-row content-row-tables content-row-tables--positioned">
          <div
            ref={partsWrapperRef}
            className="parts-table-wrapper parts-table-wrapper--draggable"
            style={{ position: 'absolute', left: layout.parts.x, top: layout.parts.y, width: layout.parts.w, height: 'auto', minWidth: MIN_TABLE_W }}
          >
            <div className="page-table-frame">
            <div
              className="page-table-drag-handle"
              onMouseDown={(e) => {
                // Prevent drag overlay from blocking typing in the inline / input row.
                if (e.target.closest('input') || e.target.closest('.table-slash-input-wrap') || e.target.closest('.notes-editor-menu')) return;
                if (addingPartRow || partMenu) return;
                handleTableDragStart(e, 'parts');
              }}
              title="Drag to move"
            />
            <table className="parts-table parts-table--bordered">
              <thead>
                <tr>
                  <th className="col-id">ID</th>
                  <th className="col-name">Part Name</th>
                  <th className="col-qty">QTY</th>
                </tr>
              </thead>
              <tbody ref={partsTbodyRef}>
                {(usedParts.length ? usedParts : showBomTables ? [] : [
                  { id: 'a', badge: 'A', name: 'Screw', qty: '4' },
                  { id: 'b', badge: 'B', name: 'Loctite 222', qty: '1' },
                  { id: 'c', badge: 'C', name: 'Loctite 262', qty: '' },
                ]).map((p, i) => ({ id: p.id, badge: String.fromCharCode(65 + i), name: p.name, qty: p.qty ?? '' })).map((row) => {
                  const isEditingPart = editingPartId === row.id;
                  return (
                  <tr
                    key={row.id}
                    onMouseEnter={() => setHoveredRow(row.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={hoveredRow === row.id ? { background: '#F8F9FF' } : undefined}
                    className={onRenamePart && operationId ? 'table-row-clickable' : undefined}
                    title={onRemovePartFromOperation && operationId ? (onRenamePart || onReplacePartInOperation ? 'Click part name to add/edit · / to pick · Trash removes' : 'Trash removes from step') : undefined}
                  >
                    <td className="col-id"><span className="id-badge">{row.badge}</span></td>
                    <td
                      className="col-name"
                      onClick={
                        (onRenamePart || onReplacePartInOperation) && operationId && !isEditingPart
                          ? (e) => {
                              e.stopPropagation();
                              setEditingToolId(null);
                              setEditingPartId(row.id);
                            }
                          : undefined
                      }
                    >
                      {isEditingPart ? (
                        <div className="table-slash-input-wrap">
                          <input
                            ref={editPartInputRef}
                            type="text"
                            className="table-slash-input"
                            value={editPartValue}
                            onChange={(e) => setEditPartValue(e.target.value)}
                            onBlur={() => commitPartRename(row.id, row.name)}
                            onKeyDown={(e) => {
                              const isSlash = e.key === '/' || e.code === 'Slash';
                              if (isSlash && !partMenu) {
                                e.stopPropagation();
                                e.preventDefault();
                                setPartMenu('root');
                                return;
                              }
                              if (e.key === 'Escape') {
                                e.stopPropagation();
                                e.preventDefault();
                                setPartMenu(null);
                                setEditingPartId(null);
                                return;
                              }
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitPartRename(row.id, row.name);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {partMenu === 'root' && (
                            <div className="notes-editor-menu table-slash-menu">
                              <div className="notes-editor-menu-label">Available parts</div>
                              {availableParts.length === 0 ? (
                                <div className="notes-editor-menu-empty">No available parts, or type a new name above and press Enter.</div>
                              ) : (
                                availableParts.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    className="notes-editor-menu-item"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      onReplacePartInOperation?.(operationId, row.id, p);
                                      setEditingPartId(null);
                                      setPartMenu(null);
                                    }}
                                  >
                                    {p.name}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{row.name}</span>
                          {hoveredRow === row.id && (
                            <span style={{ color: '#c4c9d4', fontSize: 11, fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                              type / to add parts
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="col-qty">{row.qty}</td>
                  </tr>
                );
                })}
                {canAddPart && addingPartRow && (
                  <tr className="table-inline-add-row">
                    <td className="col-id">
                      <span className="id-badge">{nextPartBadge}</span>
                    </td>
                    <td className="col-name">
                      <div className="table-slash-input-wrap">
                        <input
                          ref={partInputRef}
                          className="table-slash-input"
                          value={partDraft}
                          placeholder="Add many rows: type name, Enter · / to pick · Esc when done"
                          onChange={(e) => setPartDraft(e.target.value)}
                          onKeyDown={(e) => {
                            const isSlash = e.key === '/' || e.code === 'Slash';
                            if (isSlash && !partMenu) {
                              e.stopPropagation();
                              e.preventDefault();
                              setPartMenu('root');
                              return;
                            }
                            if (e.key === 'Escape') {
                              e.stopPropagation();
                              e.preventDefault();
                              setPartMenu(null);
                              setActiveAddPartsPageId?.(null);
                              setPartDraft('');
                              return;
                            }
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              submitPartFromDraft();
                            }
                          }}
                        />
                        {partMenu === 'root' && (
                          <div className="notes-editor-menu table-slash-menu">
                            <div className="notes-editor-menu-label">Available parts</div>
                            {availableParts.length === 0 ? (
                              <div className="notes-editor-menu-empty">No available parts to add.</div>
                            ) : (
                              availableParts.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className="notes-editor-menu-item"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    const added = onAddPartToOperation(operationId, p.name, 1);
                                    if (added) {
                                      setPartDraft('');
                                      setPartMenu(null);
                                      requestAnimationFrame(() => partInputRef.current?.focus());
                                    }
                                  }}
                                >
                                  {p.name}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="col-qty">
                      <span className="table-inline-qty">1</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
            {showBomTables && (
              <TableEnhancer
                wrapperRef={partsWrapperRef}
                tbodyRef={partsTbodyRef}
                rows={(usedParts || []).map(p => ({
                  id: p.id,
                  onRemove: () => onRemovePartFromOperation?.(operationId, p.id),
                }))}
                onAddRow={() => onAddPartToOperation?.(operationId, '', 1)}
                onReorderRow={onReorderPart ? (from, to) => onReorderPart(operationId, from, to) : undefined}
                menuOpen={partMenu === 'root' || toolMenu === 'root'}
              />
            )}
          </div>

          <div
            ref={toolsWrapperRef}
            className="tools-table-wrapper tools-table-wrapper--draggable"
            style={{ position: 'absolute', left: layout.tools.x, top: layout.tools.y, width: layout.tools.w, height: 'auto', minWidth: MIN_TABLE_W }}
          >
            <div className="page-table-frame">
            <div
              className="page-table-drag-handle"
              onMouseDown={(e) => {
                if (e.target.closest('input') || e.target.closest('.table-slash-input-wrap') || e.target.closest('.notes-editor-menu') || e.target.closest('.tools-table-library-btn') || e.target.closest('.tools-table-tool-name-cell')) return;
                if (addingToolRow || toolMenu) return;
                handleTableDragStart(e, 'tools');
              }}
              title="Drag to move"
            />
            <table className="tools-table tools-table--bordered">
              <thead>
                <tr>
                  <th>
                    <span className="tools-table-header-cell">
                      Tools
                      {showBomTables && onOpenToolsLibrary && (
                        <button
                          type="button"
                          className="tools-table-library-btn"
                          onClick={(e) => { e.stopPropagation(); onOpenToolsLibrary(); }}
                          aria-label="Open Tools Library"
                          title="Tools Library"
                        >
                          <Library size={16} />
                        </button>
                      )}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody ref={toolsTbodyRef}>
                {showBomTables && toolsBom ? toolsForTable.map((t) => {
                  const isEditingTool = editingToolId === t.id;
                  return (
                    <tr
                      key={t.id}
                      onMouseEnter={() => setHoveredRow(`tool-${t.id}`)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={hoveredRow === `tool-${t.id}` ? { background: '#F8F9FF' } : undefined}
                      onClick={undefined}
                      className={undefined}
                      title={undefined}
                    >
                      <td
                        className="tools-table-tool-name-cell"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Blank rows open for editing on single click
                          if (onRenameTool && operationId && !isEditingTool && !(t.name || '').trim()) {
                            if (toolRemoveTimerRef.current) {
                              clearTimeout(toolRemoveTimerRef.current);
                              toolRemoveTimerRef.current = null;
                            }
                            setEditingPartId(null);
                            setEditingToolId(t.id);
                          }
                        }}
                        onDoubleClick={
                          onRenameTool && operationId && !isEditingTool && (t.name || '').trim()
                            ? (e) => {
                                e.stopPropagation();
                                if (toolRemoveTimerRef.current) {
                                  clearTimeout(toolRemoveTimerRef.current);
                                  toolRemoveTimerRef.current = null;
                                }
                                setEditingPartId(null);
                                setEditingToolId(t.id);
                              }
                            : undefined
                        }
                      >
                        {isEditingTool ? (
                          <div className="table-slash-input-wrap">
                            <input
                              ref={editToolInputRef}
                              type="text"
                              className="table-slash-input"
                              value={editToolValue}
                              placeholder={(t.name || '').trim() ? undefined : 'Tool name…'}
                              onChange={(e) => setEditToolValue(e.target.value)}
                              onBlur={() => commitToolRename(t.id, t.name)}
                              onKeyDown={(e) => {
                                const isSlash = e.key === '/' || e.code === 'Slash';
                                if (isSlash && !toolMenu) {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setToolMenu('root');
                                  return;
                                }
                                if (e.key === 'Escape') {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setToolMenu(null);
                                  setEditingToolId(null);
                                  return;
                                }
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  commitToolRename(t.id, t.name);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {toolMenu === 'root' && (
                              <div className="notes-editor-menu table-slash-menu">
                                <div className="notes-editor-menu-label">Rename tool</div>
                                <div className="notes-editor-menu-empty">Type a new name above and press Enter to rename this tool in the library.</div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={(t.name || '').trim() ? undefined : { color: '#9ca3af', fontStyle: 'italic' }}>
                              {(t.name || '').trim() || 'Click to name…'}
                            </span>
                            {hoveredRow === `tool-${t.id}` && (
                              <span style={{ color: '#c4c9d4', fontSize: 11, fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                type / to add tools
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr
                    onMouseEnter={() => setHoveredRow('tools')}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={hoveredRow === 'tools' ? { background: '#F8F9FF' } : undefined}
                  >
                    <td>3.5mm driver</td>
                  </tr>
                )}
                {canAddTool && addingToolRow && (
                  <tr className="table-inline-add-row">
                    <td colSpan={1}>
                      <div className="table-slash-input-wrap">
                        <input
                          ref={toolInputRef}
                          className="table-slash-input"
                          value={toolDraft}
                          placeholder="Add many rows: type name, Enter · / to pick · Esc when done"
                          onChange={(e) => setToolDraft(e.target.value)}
                          onKeyDown={(e) => {
                            const isSlash = e.key === '/' || e.code === 'Slash';
                            if (isSlash && !toolMenu) {
                              e.stopPropagation();
                              e.preventDefault();
                              setToolMenu('root');
                              return;
                            }
                            if (e.key === 'Escape') {
                              e.stopPropagation();
                              e.preventDefault();
                              setToolMenu(null);
                              setActiveAddToolsPageId?.(null);
                              setToolDraft('');
                              return;
                            }
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              submitToolFromDraft();
                            }
                          }}
                        />
                        {toolMenu && (
                          <div className="notes-editor-menu table-slash-menu">
                            {toolMenu === 'root' && (
                              <>
                                <div className="notes-editor-menu-label">Library tools</div>
                                {availableToolsForMenu.length === 0 ? (
                                  <div className="notes-editor-menu-empty">All library tools already added, or type a new name above and press Enter.</div>
                                ) : (
                                  availableToolsForMenu.map((t) => (
                                    <button
                                      key={t.id}
                                      type="button"
                                      className="notes-editor-menu-item"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => {
                                        const added = operationId && onAddToolToBom && onAddToolToBom(operationId, t.name);
                                        if (added) {
                                          setToolDraft('');
                                          setToolMenu(null);
                                          requestAnimationFrame(() => toolInputRef.current?.focus());
                                        }
                                      }}
                                    >
                                      {t.name}
                                    </button>
                                  ))
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
            {showBomTables && (
              <TableEnhancer
                wrapperRef={toolsWrapperRef}
                tbodyRef={toolsTbodyRef}
                rows={toolsForTable.map(t => ({
                  id: t.id,
                  onRemove: () => onRemoveToolFromOperation?.(operationId, t.id),
                }))}
                onAddRow={() => onAddToolToBom?.(operationId, '')}
                onReorderRow={onReorderTool ? (from, to) => onReorderTool(operationId, from, to) : undefined}
                menuOpen={partMenu === 'root' || toolMenu === 'root'}
              />
            )}
          </div>
        </div>
      )}

      {showPlacedItems && placedItems.filter((item) => item.type !== 'text').map((item) => (
        <PlacedItemComponent
          key={item.id}
          item={item}
          canvasRect={canvasRect}
          onRemove={onRemovePlacedItem}
          onUpdate={onUpdatePlacedItem}
          onOpenModal={onOpenModal}
          onNavigateToCad={onNavigateToCad}
          onStartRetake={onStartRetake}
        />
      ))}
      {showPlacedItems && placedItems.filter((item) => item.type === 'text').map((item) => (
        <PlacedTextBox
          key={item.id}
          item={item}
          canvasRect={canvasRect}
          onRemove={onRemovePlacedItem}
          onUpdate={onUpdatePlacedItem}
          operationId={operationId}
          partsForOperation={partsForOperation}
          toolsBom={toolsBom}
          toolIdsForOperation={toolIdsForOperation}
          onAddPartToOperation={onAddPartToOperation}
          onAddToolToBom={onAddToolToBom}
          onReplaceToolInOperation={onReplaceToolInOperation}
        />
      ))}
    </div>
  );
}

export default function Canvas({
  placedItems,
  onCanvasMouseMove,
  onRemovePlacedItem,
  onUpdatePlacedItem,
  onOpenModal,
  onNavigateToCad,
  onStartRetake,
  operations = [],
  activePageId,
  scrollToPageToken = 0,
  onVisiblePageChange,
  onAddSubPage,
  onMovePageUp,
  onMovePageDown,
  onDeletePage,
  toolsBom,
  partsCatalog,
  onAddPartToOperation,
  onAddToolToBom,
  onRemovePartFromOperation,
  onRemoveToolFromOperation,
  onOpenToolsLibrary,
  onRenameTool,
  onRenamePart,
  onReplacePartInOperation,
  onReplaceToolInOperation,
  onReorderPart,
  onReorderTool,
}) {
  const { placedItemComponent: PlacedItemComponent, conceptId } = usePrototype();
  const showPageActions = conceptId === 'image-two-buttons';
  const scrollRef = useRef(null);
  const [canvasRect, setCanvasRect] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [activeAddPartsPageId, setActiveAddPartsPageId] = useState(null);
  const [activeAddToolsPageId, setActiveAddToolsPageId] = useState(null);

  useEffect(() => {
    if (!activePageId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-page-id="${activePageId}"]`);
    if (el) {
      const scroll = () => el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      requestAnimationFrame(scroll);
    }
  }, [activePageId, scrollToPageToken]);

  useEffect(() => {
    if (!onVisiblePageChange || !scrollRef.current) return;
    const container = scrollRef.current;
    const pages = buildDocPageList(operations);

    const updateVisiblePage = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const threshold = Math.min(100, containerHeight * 0.2);
      let currentPageId = pages[0]?.id;
      for (const page of pages) {
        const el = container.querySelector(`[data-page-id="${page.id}"]`);
        if (!el) continue;
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (top <= scrollTop + threshold) {
          currentPageId = page.id;
        }
      }
      onVisiblePageChange(currentPageId);
    };

    container.addEventListener('scroll', updateVisiblePage, { passive: true });
    updateVisiblePage();
    return () => container.removeEventListener('scroll', updateVisiblePage);
  }, [onVisiblePageChange, operations]);

  const pages = buildDocPageList(operations);
  const firstOpPageId = pages.find((p) => !p.isSubPage)?.id;
  const canDeletePage = isSubPageId(activePageId);

  const DEFAULT_TABLE_LAYOUT = {
    parts: { x: 0, y: 56, w: 320, h: 220 },
    tools: { x: 336, y: 56, w: 200, h: 220 },
  };

  const [tableLayouts, setTableLayouts] = useState({});

  const getTableLayout = useCallback((pageId) => {
    return tableLayouts[pageId] ?? { parts: { ...DEFAULT_TABLE_LAYOUT.parts }, tools: { ...DEFAULT_TABLE_LAYOUT.tools } };
  }, [tableLayouts]);

  const updateTableLayout = useCallback((pageId, tableKey, updates) => {
    setTableLayouts((prev) => {
      const current = prev[pageId] ?? { parts: { ...DEFAULT_TABLE_LAYOUT.parts }, tools: { ...DEFAULT_TABLE_LAYOUT.tools } };
      const next = { ...current, [tableKey]: { ...current[tableKey], ...updates } };
      return { ...prev, [pageId]: next };
    });
  }, []);

  const getPlacedItemsForPage = useCallback((pageId) => {
    return placedItems.filter((item) =>
      item.pageId != null ? item.pageId === pageId : pageId === firstOpPageId
    );
  }, [placedItems, firstOpPageId]);

  return (
    <div ref={scrollRef} className="canvas-scroll" data-flow-anchor="canvas">
      <div className="canvas-stack">
        {pages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              placedItems={getPlacedItemsForPage(page.id)}
              canvasRect={canvasRect}
              onCanvasMouseMove={onCanvasMouseMove}
              onCanvasRectChange={setCanvasRect}
              onRemovePlacedItem={onRemovePlacedItem}
              onUpdatePlacedItem={onUpdatePlacedItem}
              onOpenModal={onOpenModal}
              onNavigateToCad={onNavigateToCad}
              onStartRetake={onStartRetake}
              PlacedItemComponent={PlacedItemComponent}
              hoveredRow={hoveredRow}
              setHoveredRow={setHoveredRow}
              showPlacedItems={page.id === firstOpPageId || getPlacedItemsForPage(page.id).length > 0}
              operationId={getPageContext(page.id).ownerId ?? null}
              partsForOperation={findNode(operations, getPageContext(page.id).ownerId)?.node?.parts ?? null}
              toolIdsForOperation={findNode(operations, getPageContext(page.id).ownerId)?.node?.toolIds ?? []}
              toolsBom={toolsBom}
              partsCatalog={partsCatalog}
              onAddPartToOperation={onAddPartToOperation}
              onAddToolToBom={onAddToolToBom}
              onRemovePartFromOperation={onRemovePartFromOperation}
              onRemoveToolFromOperation={onRemoveToolFromOperation}
              onOpenToolsLibrary={onOpenToolsLibrary}
              onRenameTool={onRenameTool}
              onRenamePart={onRenamePart}
              onReplacePartInOperation={onReplacePartInOperation}
              onReplaceToolInOperation={onReplaceToolInOperation}
              onReorderPart={onReorderPart}
              onReorderTool={onReorderTool}
              tableLayout={getTableLayout(page.id)}
              onUpdateTableLayout={(key, updates) => updateTableLayout(page.id, key, updates)}
              activeAddPartsPageId={activeAddPartsPageId}
              setActiveAddPartsPageId={setActiveAddPartsPageId}
              activeAddToolsPageId={activeAddToolsPageId}
              setActiveAddToolsPageId={setActiveAddToolsPageId}
            />
        ))}
      </div>
      {showPageActions && (
        <div className="page-actions page-actions-floating">
          <button type="button" data-flow-anchor="add-page" className="page-action-btn page-action-add" aria-label="Add page" title="Add page" onClick={onAddSubPage}>
            <FilePlus size={16} />
          </button>
          <button type="button" className="page-action-btn" aria-label="View" title="View">
            <Eye size={16} />
          </button>
          <button type="button" className="page-action-btn" aria-label="Move up" title="Move up" onClick={onMovePageUp}>
            <ChevronUp size={16} />
          </button>
          <button type="button" className="page-action-btn" aria-label="Move down" title="Move down" onClick={onMovePageDown}>
            <ChevronDown size={16} />
          </button>
          <button type="button" className="page-action-btn page-action-delete" aria-label="Delete" title={canDeletePage ? 'Delete' : 'Operations cannot be deleted'} disabled={!canDeletePage} onClick={canDeletePage ? onDeletePage : undefined}>
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
