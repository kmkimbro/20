import { useRef, useCallback, useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Eye,
  Search,
  ChevronUp,
  Info,
  Box,
  Image as ImageIcon,
  FileOutput,
  ListPlus,
  MoreVertical,
  Check,
  Square,
  Minus,
  X,
} from 'lucide-react';
import CadToolbar from './CadToolbar.jsx';

/** Generate a data URL for a "CAD screenshot" (prototype: canvas that looks like the CAD viewer). */
function captureCadViewAsImage(viewerRef) {
  const width = 640;
  const height = 400;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '16px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CAD view', width / 2, height / 2 - 10);
  ctx.fillText('Screenshot captured from CAD', width / 2, height / 2 + 16);
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 1;
  ctx.strokeRect(width / 2 - 80, height / 2 - 60, 160, 80);
  return canvas.toDataURL('image/png');
}

/** Hierarchical assembly tree for the left panel mockup */
const ASSEMBLY_TREE = [
  { id: 'at1', label: 'Assembly/Partname', children: null },
  { id: 'at2', label: 'Assembly/Partname', children: null },
  { id: 'at3', label: 'Assembly/Partname', children: null },
  { id: 'at4', label: 'Assembly/Partname', children: Array.from({ length: 6 }, (_, i) => `Child`) },
  { id: 'at5', label: 'Assembly/Partname', children: null },
  { id: 'at6', label: 'Assembly/Partname', children: null },
  { id: 'at7', label: 'Assembly/Partname', children: null },
];

/** Collect all selectable part IDs (parent nodes + children) */
function getAllPartIds(tree) {
  const ids = [];
  tree.forEach((node) => {
    ids.push(node.id);
    if (node.children?.length) {
      node.children.forEach((_, i) => ids.push(`${node.id}-${i}`));
    }
  });
  return ids;
}

const ALL_PART_IDS = getAllPartIds(ASSEMBLY_TREE);

/** Get display items for an operation (parts or default "Blade" entries for empty). */
function getStepItems(op) {
  const parts = op.parts || [];
  if (parts.length > 0) return parts.map((p) => p.name);
  return Array.from({ length: 3 }, (_, i) => 'Blade');
}

export default function CadView({ operations = [], onAddStep, screenshotCaptureMode = false, isRetakeMode = false, initialSelectedOperationId = null, onCaptureComplete, onCancelCapture, onExitCaptureMode, docTitle = 'Test Document 1', onDocTitleChange, empty = false }) {
  const viewerRef = useRef(null);
  const titleInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(docTitle);
  const titleEditable = Boolean(onDocTitleChange);

  useEffect(() => {
    if (editingTitle) return;
    setTitleValue(docTitle ?? 'Test Document 1');
  }, [docTitle, editingTitle]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [cadLoading, setCadLoading] = useState(false);
  const [cadLoaded, setCadLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStep, setLoadStep] = useState(0);

  const CAD_STEPS = ['Reading file…', 'Parsing geometry…', 'Building assembly tree…', 'Optimising mesh…', 'Almost there…'];

  const startLoading = (fileName) => {
    setUploadedFile(fileName);
    setCadLoading(true);
    setCadLoaded(false);
    setLoadProgress(0);
    setLoadStep(0);
    let progress = 0;
    let step = 0;
    const tick = setInterval(() => {
      progress += Math.random() * 14 + 4;
      if (progress >= 100) {
        progress = 100;
        clearInterval(tick);
        setTimeout(() => { setCadLoading(false); setCadLoaded(true); }, 300);
      }
      step = Math.min(CAD_STEPS.length - 1, Math.floor((progress / 100) * CAD_STEPS.length));
      setLoadProgress(Math.round(progress));
      setLoadStep(step);
    }, 300);
  };
  const [expandedAssemblyNodes, setExpandedAssemblyNodes] = useState(() => new Set(['at4']));
  const [selectedPartIds, setSelectedPartIds] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);
  const [expandedOps, setExpandedOps] = useState(() => new Set(operations.map((o) => o.id)));
  const [selectedOperationId, setSelectedOperationId] = useState(() => {
    if (initialSelectedOperationId == null) return null;
    return operations.some((op) => op.id === initialSelectedOperationId) ? initialSelectedOperationId : null;
  });

  useEffect(() => {
    setExpandedOps((prev) => {
      const next = new Set(prev);
      operations.forEach((o) => next.add(o.id));
      return next;
    });
  }, [operations]);

  // When entering CAD for screenshot capture, highlight the operation that was selected in the document view
  useEffect(() => {
    if (screenshotCaptureMode && initialSelectedOperationId != null) {
      const exists = operations.some((op) => op.id === initialSelectedOperationId);
      if (exists) setSelectedOperationId(initialSelectedOperationId);
    }
  }, [screenshotCaptureMode, initialSelectedOperationId, operations]);

  useEffect(() => {
    if (!screenshotCaptureMode || !onExitCaptureMode) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExitCaptureMode();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [screenshotCaptureMode, onExitCaptureMode]);

  const operationsRef = useRef(null);
  const screenshotCaptureModeRef = useRef(screenshotCaptureMode);
  screenshotCaptureModeRef.current = screenshotCaptureMode;
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (screenshotCaptureModeRef.current) return;
      if (operationsRef.current && !operationsRef.current.contains(e.target)) {
        setSelectedOperationId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const selectOp = useCallback((id, e) => {
    if (e && e.target.closest('.cad-view-op-chevron')) return;
    setSelectedOperationId((prev) => (prev === id ? null : id));
  }, []);

  const toggleOp = useCallback((id) => {
    setExpandedOps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAssemblyNode = useCallback((id) => {
    setExpandedAssemblyNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePartSelection = useCallback((id, e) => {
    if (e) e.stopPropagation();
    setSelectedPartIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((e) => {
    if (e) e.stopPropagation();
    setSelectedPartIds((prev) => {
      if (prev.size >= ALL_PART_IDS.length) return new Set();
      return new Set(ALL_PART_IDS);
    });
  }, []);

  const partsSelectedCount = selectedPartIds.size;
  const allSelected = ALL_PART_IDS.length > 0 && selectedPartIds.size >= ALL_PART_IDS.length;
  const someSelected = selectedPartIds.size > 0 && selectedPartIds.size < ALL_PART_IDS.length;

  const handleCapture = useCallback(() => {
    const dataUrl = captureCadViewAsImage(viewerRef);
    if (dataUrl && onCaptureComplete) onCaptureComplete(dataUrl);
  }, [onCaptureComplete]);

  const startEditTitle = () => {
    if (!titleEditable) return;
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  };

  const commitTitle = () => {
    const trimmed = titleValue.trim() || docTitle;
    setTitleValue(trimmed);
    setEditingTitle(false);
    onDocTitleChange?.(trimmed);
  };

  return (
    <div className="cad-view">
      {(!empty || cadLoaded) && <aside className="cad-view-left">
        <div className="cad-view-tree-header">
          <div className="cad-view-tree-header-text">
            {editingTitle ? (
              <input
                ref={titleInputRef}
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') { setTitleValue(docTitle); setEditingTitle(false); } }}
                className="cad-view-tree-title-input"
              />
            ) : (
              <h2
                className="cad-view-tree-title"
                onDoubleClick={titleEditable ? startEditTitle : undefined}
                title={titleEditable ? 'Double-click to rename' : undefined}
              >
                {titleValue}
              </h2>
            )}
            <p className="cad-view-tree-subtitle">Template type</p>
          </div>
          <button type="button" className="cad-view-tree-back-btn" aria-label="Back">
            <ChevronLeft size={18} />
          </button>
        </div>
        <div className="cad-view-tree-selection-bar">
          <div className={`cad-view-tree-selection-left${partsSelectedCount > 0 ? ' cad-view-tree-selection-left--has-selection' : ''}`}>
            <span className="cad-view-tree-selection-chevron-spacer" aria-hidden />
            <button
              type="button"
              className="cad-view-tree-check-all-btn"
              onClick={toggleSelectAll}
              title={allSelected ? 'Deselect all' : someSelected ? 'Select all' : 'Select all'}
            >
              {allSelected ? <Check size={16} className="cad-view-tree-check-icon" /> : someSelected ? <Minus size={16} className="cad-view-tree-check-icon" /> : <Square size={16} className="cad-view-tree-check-icon" />}
            </button>
            <span className="cad-view-tree-selection-count">{partsSelectedCount} Parts Selected</span>
          </div>
          <div className="cad-view-tree-selection-actions">
            <button type="button" className="cad-view-tree-action-btn" aria-label="Visibility"><Eye size={16} /></button>
            {searchOpen ? (
              <div className="cad-view-tree-search-wrap">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="cad-view-tree-search-input"
                  placeholder="Value"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                  aria-label="Search"
                />
                <button
                  type="button"
                  className="cad-view-tree-search-clear"
                  onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                  aria-label="Close search"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="cad-view-tree-action-btn"
                aria-label="Search"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={16} />
              </button>
            )}
          </div>
        </div>
        <section className="cad-view-tree-section">
          <ul className="cad-view-tree-list">
            {ASSEMBLY_TREE.map((node) => {
              const hasChildren = node.children && node.children.length > 0;
              const expanded = expandedAssemblyNodes.has(node.id);
              return (
                <li key={node.id} className="cad-view-tree-node">
                  <div
                    className="cad-view-tree-row"
                    onClick={(e) => !e.target.closest('.cad-view-tree-chevron-btn') && togglePartSelection(node.id, e)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && togglePartSelection(node.id, e)}
                  >
                    <button
                      type="button"
                      className="cad-view-tree-chevron-btn"
                      onClick={(e) => { e.stopPropagation(); hasChildren && toggleAssemblyNode(node.id); }}
                      aria-expanded={hasChildren ? expanded : undefined}
                    >
                      {hasChildren ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <ChevronRight size={14} className="cad-view-tree-chevron-placeholder" />}
                    </button>
                    <button
                      type="button"
                      className="cad-view-tree-checkbox"
                      onClick={(e) => togglePartSelection(node.id, e)}
                      aria-checked={selectedPartIds.has(node.id)}
                      role="checkbox"
                      title={selectedPartIds.has(node.id) ? 'Deselect' : 'Select'}
                    >
                      {selectedPartIds.has(node.id) ? <Check size={14} /> : <Square size={14} />}
                    </button>
                    <span className="cad-view-tree-row-label">{node.label}</span>
                    <span className="cad-view-tree-dot" aria-hidden />
                  </div>
                  {hasChildren && expanded && (
                    <ul className="cad-view-tree-children">
                      {node.children.map((childLabel, i) => {
                        const childId = `${node.id}-${i}`;
                        return (
                          <li key={childId} className="cad-view-tree-child">
                            <div
                              className="cad-view-tree-child-row"
                              onClick={(e) => togglePartSelection(childId, e)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && togglePartSelection(childId, e)}
                            >
                              <button
                                type="button"
                                className="cad-view-tree-checkbox cad-view-tree-checkbox-child"
                                onClick={(e) => togglePartSelection(childId, e)}
                                aria-checked={selectedPartIds.has(childId)}
                                role="checkbox"
                                title={selectedPartIds.has(childId) ? 'Deselect' : 'Select'}
                              >
                                {selectedPartIds.has(childId) ? <Check size={14} /> : <Square size={14} />}
                              </button>
                              <span className="cad-view-tree-child-label">{childLabel}</span>
                              <span className="cad-view-tree-dot" aria-hidden />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        <section className="cad-view-history-card">
          <button type="button" className="cad-view-history-header">
            <span>CAD Version History</span>
            <ChevronUp size={16} />
          </button>
          <button type="button" className="cad-view-update-cad">Update CAD</button>
        </section>
      </aside>}

      {(!empty || cadLoaded) && <aside className="cad-view-operations" ref={operationsRef}>
        <div className="cad-view-ops-header">
          <h3 className="cad-view-ops-title">Operations</h3>
          <button type="button" className="cad-view-ops-info" aria-label="Information">
            <Info size={14} />
          </button>
        </div>
        {operations.length === 0 ? (
          <>
            <div className="cad-view-instructions-card">
              <div className="cad-view-instructions-icon">
                <Info size={18} />
              </div>
              <h4 className="cad-view-instructions-title">Instructions</h4>
              <p className="cad-view-instructions-text">
                Add a part to this step to start creating operation pages. You may add parts by:
              </p>
              <ul className="cad-view-instructions-list">
                <li>Drag and drop parts from the Assembly Tree</li>
                <li>Turn on &apos;Add Parts from CAD&apos; mode and click on the parts in CAD</li>
              </ul>
            </div>
            <button type="button" className="cad-view-add-step" onClick={onAddStep}>+ Add Step</button>
          </>
        ) : (
          <>
            <div className="cad-view-ops-list">
              {operations.map((op) => {
                const expanded = expandedOps.has(op.id);
                const items = getStepItems(op);
                const isSelected = selectedOperationId === op.id;
                return (
                  <div
                    key={op.id}
                    className={`cad-view-op-card${isSelected ? ' cad-view-op-card-selected' : ''}`}
                    onClick={(e) => selectOp(op.id, e)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && selectOp(op.id, e)}
                  >
                    <div className="cad-view-op-card-header">
                      <button type="button" className="cad-view-op-chevron" onClick={(e) => { e.stopPropagation(); toggleOp(op.id); }} aria-expanded={expanded}>
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <span className={`cad-view-op-name${isSelected ? ' cad-view-op-name-selected' : ''}`}>{op.label}</span>
                      <div className="cad-view-op-actions" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="cad-view-op-action" title="Image" aria-label="Image"><ImageIcon size={14} /></button>
                        <button type="button" className="cad-view-op-action" title="Export" aria-label="Export"><FileOutput size={14} /></button>
                        <button type="button" className="cad-view-op-action" title="Add to list" aria-label="Add to list"><ListPlus size={14} /></button>
                        <button type="button" className="cad-view-op-action" title="More" aria-label="More options"><MoreVertical size={14} /></button>
                      </div>
                    </div>
                    {expanded && (
                      <ul className="cad-view-op-items" onClick={(e) => e.stopPropagation()}>
                        {items.map((name, i) => (
                          <li key={`${op.id}-${i}`} className="cad-view-op-item">
                            <span className="cad-view-op-item-label">{name}</span>
                            <button type="button" className="cad-view-op-item-eye" aria-label="Toggle visibility"><Eye size={14} /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            <button type="button" className="cad-view-add-step" onClick={onAddStep}>+ Add Step</button>
          </>
        )}
      </aside>}

      <main className="cad-view-main">
        <div className={`cad-view-viewer-wrapper${screenshotCaptureMode ? ' cad-view-capture-frame' : ''}`}>
          <div className="cad-view-top-buttons">
            {screenshotCaptureMode && (
              <button type="button" className="cad-view-esc-btn" onClick={onExitCaptureMode ?? onCancelCapture}>ESC</button>
            )}
            <button type="button" className="cad-view-screenshots-btn">Screenshots</button>
          </div>
          <div className="cad-view-viewer" data-flow-anchor="viewer" ref={viewerRef}>
            {empty && !cadLoading && !cadLoaded ? (
              <>
                {/* Upload drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) startLoading(f.name); }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                  position: 'absolute', top: 16, left: 16, right: 16, bottom: 112,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                  background: dragOver ? '#EEF1FE' : '#fff',
                  border: `2px dashed ${dragOver ? '#4F6EF7' : '#D1D5DB'}`,
                  borderRadius: 8, cursor: 'pointer',
                  transition: 'background 0.15s, border 0.15s',
                  }}
                >
                  <input ref={fileInputRef} type="file" accept=".step,.stp,.iges,.igs,.stl,.obj" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) startLoading(f.name); }} />
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box size={28} color="#9CA3AF" strokeWidth={1.2} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Upload CAD file</span>
                  <span style={{ fontSize: 13, color: '#6B7280', textAlign: 'center' }}>
                    Drag & drop or click to upload<br />
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>.STEP, .IGES, .STL, .OBJ</span>
                  </span>
                </div>
                <CadToolbar screenshotActive={false} onScreenshotClick={undefined} isRetakeMode={false} />
              </>
            ) : cadLoading ? (
              <>
                {/* Loading state */}
                <style>{`
                  @keyframes cad-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                  @keyframes cad-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
                `}</style>
                <div style={{
                  position: 'absolute', top: 16, left: 16, right: 16, bottom: 112,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
                  background: '#fff', borderRadius: 8, border: '1px solid #E5E7EB',
                }}>
                  {/* Spinning wireframe box */}
                  <div style={{ position: 'relative', width: 72, height: 72 }}>
                    <div style={{
                      position: 'absolute', inset: 0,
                      border: '2px solid #4F6EF7', borderRadius: 8,
                      animation: 'cad-spin 1.4s linear infinite',
                      opacity: 0.6,
                    }} />
                    <div style={{
                      position: 'absolute', inset: 8,
                      border: '2px solid #4F6EF7', borderRadius: 4,
                      animation: 'cad-spin 1.4s linear infinite reverse',
                    }} />
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Box size={22} color="#4F6EF7" strokeWidth={1.4} />
                    </div>
                  </div>

                  {/* File name + step */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{uploadedFile}</div>
                    <div style={{ fontSize: 13, color: '#6B7280', animation: 'cad-pulse 1.2s ease-in-out infinite' }}>
                      {CAD_STEPS[loadStep]}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ width: 240 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>Loading</span>
                      <span style={{ fontSize: 11, color: '#4F6EF7', fontWeight: 600 }}>{loadProgress}%</span>
                    </div>
                    <div style={{ height: 4, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #4F6EF7, #818CF8)',
                        width: `${loadProgress}%`, transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                </div>
                <CadToolbar screenshotActive={false} onScreenshotClick={undefined} isRetakeMode={false} />
              </>
            ) : (
              <>
                <div className="cad-view-model-placeholder">
                  <Box className="cad-view-model-icon" size={64} strokeWidth={1.2} />
                  <span className="cad-view-model-label">CAD model</span>
                </div>
                <div className="cad-view-view-cube">TOP</div>
                <CadToolbar
                  screenshotActive={!!selectedOperationId}
                  onScreenshotClick={handleCapture}
                  isRetakeMode={isRetakeMode}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
