import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Link2, GitBranch, FileText } from 'lucide-react';
import CadThumb from './CadThumb.jsx';
import Des36PrdDocCadChangeInline from './Des36PrdDocCadChangeInline.jsx';
import Des36PrdDocStatusTag from './Des36PrdDocStatusTag.jsx';
import { PRD_DOC_CARD_WIDTH } from './des36CardLayout.js';
import { GRAPH_CARD_SIZE } from '../../components/graph/mockWeldFrameLayout.js';

/**
 * Workflow 2 — document library card: document name (double-click to rename when enabled),
 * CAD thumbnail, linked file name, status; auto-updated cards show CAD version + diff badges.
 */
export default function Des36PrdDocCard({
  name,
  stateLabel,
  /** CAD / link recency — shown in status tag tooltip only. */
  lastUpdated,
  /** Human-readable last document edit (separate from CAD status). */
  documentLastEdited,
  accentKey,
  operationCount = 1,
  cadFileLabel,
  cadVersion,
  cadChangeSummary,
  cadDiffAdded,
  cadDiffRemoved,
  cadDiffModified,
  onClick,
  onDelete,
  onHover,
  docId,
  projectId,
  onRenameDocument,
  onCadFileLabelClick,
  /** When set, shows a control to open the document-links sandbox with this file as the starting point. */
  onOpenDocumentLinks,
  /** When false, omit the bottom strip (operation count + document link). */
  showFooter = true,
  /** Merge flow: show checkbox and use card click to toggle selection instead of opening. */
  mergeSelectMode = false,
  mergeSelected = false,
  onMergeToggle,
  /**
   * When true with mergeSelectMode, only the checkbox toggles merge selection;
   * the rest of the card opens the document (onClick) as usual.
   */
  mergeSelectionViaCheckboxOnly = false,
  /** When true with {@link onMergeDragStart}, card can drag merge selection onto a project in the rail (toc-hub). */
  mergeDraggable = false,
  onMergeDragStart,
  /** toc-hub: drag this document onto an existing merged package (single-file payload). */
  onDocRefDragStart,
  /** Second line under title (e.g. graph entity subtitle). */
  subtitle,
  /** Horizontal bar card + thumb left (connection graph canvas). */
  compact = false,
  /** Member of a merged document package — show corner tag (library / project tiles). */
  inDocumentPackage = false,
  /**
   * DES 36 MVP layout: render CAD file name on its own line with
   * “Linked — {lastUpdated}” underneath; status tag drops to the caption row.
   */
  linkedCaption = false,
  /** When false, hide the CAD link / “In sync” status pill (DES 36 MVP). */
  showStatusTag = true,
  /** Documents represented by the footer doc-count badge (linked-caption layout). */
  linkedDocNames = [],
}) {
  const [hov, setHov] = useState(false);
  const [docCountPopoverOpen, setDocCountPopoverOpen] = useState(false);
  const [docCountPopoverPos, setDocCountPopoverPos] = useState(null);
  const docCountBadgeRef = useRef(null);
  const docCountCloseTimerRef = useRef(null);
  const showDel = false;
  const canRename = Boolean(onRenameDocument && projectId && docId);
  const isDocumentOnlyCard = accentKey === 'no_cad' || cadFileLabel === 'No CAD file linked';
  const showDocEdited =
    documentLastEdited != null
    && String(documentLastEdited).trim() !== ''
    && documentLastEdited !== '—';
  const renderEditedUnderTitle = (fontSize, marginTop = 4, linkedStyle = false) => (
    showDocEdited ? (
      <div
        title="Last time this document was edited"
        style={{
          fontSize,
          color: '#6B7280',
          lineHeight: 1.35,
          marginTop,
          ...(linkedStyle ? { fontStyle: 'italic', fontWeight: 400 } : {}),
        }}
      >
        {linkedStyle ? (
          <>Edited - {documentLastEdited}</>
        ) : (
          <>
            <span style={{ fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.03em' }}>Edited</span>
            {' · '}
            <span style={{ fontWeight: 500 }}>{documentLastEdited}</span>
          </>
        )}
      </div>
    ) : null
  );
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const nameInputRef = useRef(null);

  useEffect(() => () => {
    if (docCountCloseTimerRef.current) clearTimeout(docCountCloseTimerRef.current);
  }, []);

  const openDocCountPopover = () => {
    if (docCountCloseTimerRef.current) {
      clearTimeout(docCountCloseTimerRef.current);
      docCountCloseTimerRef.current = null;
    }
    const rect = docCountBadgeRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDocCountPopoverPos({
      top: rect.top - 8,
      left: rect.right,
    });
    setDocCountPopoverOpen(true);
  };

  const scheduleCloseDocCountPopover = () => {
    if (docCountCloseTimerRef.current) clearTimeout(docCountCloseTimerRef.current);
    docCountCloseTimerRef.current = setTimeout(() => {
      setDocCountPopoverOpen(false);
      setDocCountPopoverPos(null);
    }, 120);
  };

  useEffect(() => {
    if (!docCountPopoverOpen) return undefined;
    const reposition = () => {
      const rect = docCountBadgeRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDocCountPopoverPos({
        top: rect.top - 8,
        left: rect.right,
      });
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [docCountPopoverOpen]);

  useEffect(() => {
    if (!editingName) setDraftName(name);
  }, [name, editingName]);

  useEffect(() => {
    if (!editingName) return;
    const id = requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [editingName]);

  const commitRename = () => {
    if (!canRename) return;
    const next = draftName.trim();
    setEditingName(false);
    if (!next || next === name) return;
    onRenameDocument(projectId, docId, next);
  };

  const cancelRename = () => {
    setDraftName(name);
    setEditingName(false);
  };

  const docTypePill = (
    <span style={{
      flexShrink: 0,
      maxWidth: 76,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color: '#047857',
      background: '#ecfdf5',
      border: '1px solid rgba(5, 150, 105, 0.32)',
      borderRadius: 9999,
      padding: '2px 8px',
      lineHeight: 1.2,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}
    >
      Document
    </span>
  );

  if (compact) {
    const cardW = GRAPH_CARD_SIZE.width;
    const cardH = GRAPH_CARD_SIZE.height;
    const innerRadius = 8;
    const opFs = 9;
    const fileFs = 10;
    const footerPt = 4;
    const titleFs = 12;

    return (
      <div
        style={{
          position: 'relative',
          width: cardW,
          height: cardH,
          maxWidth: cardW,
          maxHeight: cardH,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
        onMouseEnter={() => { setHov(true); onHover?.(true); }}
        onMouseLeave={() => { setHov(false); onHover?.(false); }}
      >
        {showDel && (
          <button
            type="button"
            title="Delete document"
            aria-label={`Delete ${name}`}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              position: 'absolute',
              top: 8,
              right: 6,
              zIndex: 7,
              width: 26,
              height: 26,
              borderRadius: 6,
              border: '1px solid #E5E7EB',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              color: '#6B7280',
              opacity: hov ? 1 : 0,
              pointerEvents: hov ? 'auto' : 'none',
              transition: 'opacity 0.15s ease',
            }}
          >
            <Trash2 size={13} />
          </button>
        )}
        {inDocumentPackage ? (
          <span
            className="merged-package-tag"
            role="img"
            aria-label="In a document package"
            title="In a document package"
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              zIndex: 3,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 3,
              pointerEvents: 'none',
            }}
          >
            <Link2 size={11} strokeWidth={2.5} aria-hidden />
          </span>
        ) : null}
        <div style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${hov ? '#4F6EF7' : '#E5E7EB'}`,
          borderRadius: innerRadius,
          background: '#fff',
          boxShadow: hov ? '0 0 0 2px #EEF1FE' : '0 1px 4px rgba(0,0,0,0.07)',
          overflow: 'hidden',
          transition: 'border 0.15s, box-shadow 0.15s',
        }}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }}
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              gap: 8,
              padding: '6px 8px',
              textAlign: 'left',
              cursor: 'pointer',
              border: 'none',
              margin: 0,
              background: 'transparent',
              font: 'inherit',
              color: 'inherit',
            }}
          >
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', alignSelf: 'center' }} title="Linked CAD assembly (preview — illustrative)">
              <CadThumb borderColor="#E5E7EB" displayWidth={44} displayHeight={28} />
            </div>
            <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 8,
                  minWidth: 0,
                }}
                title={canRename ? 'Double-click name to rename' : undefined}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (!canRename) return;
                  setDraftName(name);
                  setEditingName(true);
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingName ? (
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={commitRename}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitRename();
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelRename();
                        }
                      }}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        fontSize: titleFs,
                        fontWeight: 600,
                        color: '#111827',
                        lineHeight: 1.25,
                        border: '1px solid #4F6EF7',
                        borderRadius: 6,
                        padding: '3px 6px',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  ) : (
                    <span
                      title={name}
                      style={{
                        display: 'block',
                        fontSize: titleFs,
                        fontWeight: 700,
                        color: '#111827',
                        lineHeight: 1.25,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {name}
                    </span>
                  )}
                  {!editingName ? renderEditedUnderTitle(9, 2) : null}
                </div>
                {docTypePill}
              </div>
              {subtitle ? (
                <div
                  title={subtitle}
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: '#6B7280',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {subtitle}
                </div>
              ) : null}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minWidth: 0,
              }}
              >
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  {onCadFileLabelClick && cadFileLabel && cadFileLabel !== '—' ? (
                    <button
                      type="button"
                      title="Open Parts map for this CAD"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCadFileLabelClick(cadFileLabel);
                      }}
                      style={{
                        display: 'block',
                        width: 'max-content',
                        maxWidth: '100%',
                        minWidth: 0,
                        fontSize: fileFs,
                        fontWeight: 500,
                        color: '#4F6EF7',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.25,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'left',
                        padding: 0,
                        textDecoration: 'underline',
                        textUnderlineOffset: 2,
                      }}
                    >
                      {cadFileLabel}
                    </button>
                  ) : (
                    <div
                      title={cadFileLabel || undefined}
                      style={{
                        display: 'block',
                        width: 'max-content',
                        maxWidth: '100%',
                        minWidth: 0,
                        fontSize: fileFs,
                        fontWeight: 500,
                        color: '#374151',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.25,
                      }}
                    >
                      {cadFileLabel || '—'}
                    </div>
                  )}
                </div>
                {showStatusTag ? (
                  <div style={{ flexShrink: 0 }}>
                    <Des36PrdDocStatusTag
                      stateLabel={stateLabel}
                      lastUpdated={lastUpdated}
                      accentKey={accentKey}
                      cadVersion={cadVersion}
                    />
                  </div>
                ) : null}
              </div>
              <div style={{ flexShrink: 1, minHeight: 0, overflow: 'hidden' }}>
                <Des36PrdDocCadChangeInline
                  style={{ marginBottom: 0 }}
                  accentKey={accentKey}
                  cadDiffAdded={cadDiffAdded}
                  cadDiffRemoved={cadDiffRemoved}
                  cadDiffModified={cadDiffModified}
                  cadChangeSummary={cadChangeSummary}
                />
              </div>
              {showFooter && !mergeSelectMode ? (
                <div style={{
                  marginTop: 'auto',
                  paddingTop: footerPt,
                  borderTop: '1px solid #F3F4F6',
                  flexShrink: 0,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '4px 8px',
                }}
                >
                  <span
                    style={{ fontSize: opFs, color: '#9CA3AF', lineHeight: 1.3 }}
                    title="Number of operations (steps) in this document"
                  >
                    {operationCount === 1 ? '1 operation' : `${operationCount} operations`}
                  </span>
                  {onOpenDocumentLinks ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDocumentLinks();
                      }}
                      style={{
                        border: 'none',
                        background: 'none',
                        padding: 0,
                        margin: 0,
                        fontSize: opFs,
                        fontWeight: 700,
                        color: '#4F6EF7',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textDecoration: 'underline',
                        textUnderlineOffset: 2,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Link…
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cardW = PRD_DOC_CARD_WIDTH;
  const titlePad = '10px 12px 0';
  const titleFs = 13;
  const innerRadius = 10;
  const thumbPad = '6px 10px 0';
  const thumbDisplayW = undefined;
  const thumbDisplayH = undefined;
  const filePad = '4px 12px 0';
  const fileFs = 11;
  const bodyPad = '6px 12px 7px';
  const statusMb = 4;
  const footerPt = 6;
  const opFs = 10;
  const docRefDraggable = Boolean(onDocRefDragStart);
  const cardDraggable = mergeDraggable || docRefDraggable;
  const docCountLabel = `${operationCount} ${operationCount === 1 ? 'doc' : 'docs'}`;
  const resolvedLinkedDocNames = (Array.isArray(linkedDocNames) && linkedDocNames.length > 0
    ? linkedDocNames
    : Array.from({ length: Math.max(0, Number(operationCount) || 0) }, (_, idx) => `${name} ${idx + 1}`)
  ).slice(0, Math.max(0, Number(operationCount) || 0) || undefined);

  const renderCadFileLabel = (fontSize, underline = false) => {
    if (onCadFileLabelClick && cadFileLabel && cadFileLabel !== '—') {
      return (
        <button
          type="button"
          title="Open Parts map for this CAD"
          onClick={(e) => {
            e.stopPropagation();
            onCadFileLabelClick(cadFileLabel);
          }}
          style={{
            display: 'block',
            width: 'max-content',
            maxWidth: '100%',
            minWidth: 0,
            fontSize,
            fontWeight: 500,
            color: '#4F6EF7',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.25,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
            padding: 0,
            textDecoration: underline ? 'underline' : 'none',
            textUnderlineOffset: underline ? 2 : undefined,
          }}
        >
          {cadFileLabel}
        </button>
      );
    }
    return (
      <div
        title={cadFileLabel || undefined}
        style={{
          display: 'block',
          width: 'max-content',
          maxWidth: '100%',
          minWidth: 0,
          fontSize,
          fontWeight: 500,
          color: '#4F6EF7',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.25,
        }}
      >
        {cadFileLabel || '—'}
      </div>
    );
  };

  const docCountPopover = docCountPopoverOpen && docCountPopoverPos ? createPortal(
    <div
      onMouseEnter={openDocCountPopover}
      onMouseLeave={scheduleCloseDocCountPopover}
      style={{
        position: 'fixed',
        top: docCountPopoverPos.top,
        left: docCountPopoverPos.left,
        transform: 'translate(-100%, -100%)',
        zIndex: 10040,
        width: 220,
        maxHeight: 260,
        overflow: 'auto',
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
        padding: '10px 12px',
        color: '#111827',
      }}
    >
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 8,
      }}
      >
        {docCountLabel}
      </div>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, lineHeight: 1.55 }}>
        {resolvedLinkedDocNames.map((docName, idx) => (
          <li key={`${docName}-${idx}`} style={{ marginBottom: 4 }}>
            {docName}
          </li>
        ))}
      </ul>
    </div>,
    document.body,
  ) : null;

  if (linkedCaption) {
    const titleBlock = (
      <div
        style={{
          minWidth: 0,
          cursor: mergeSelectMode && !mergeSelectionViaCheckboxOnly ? 'pointer' : (canRename ? 'text' : 'default'),
        }}
        title={
          mergeSelectMode && !mergeSelectionViaCheckboxOnly
            ? 'Click to select or deselect for merge'
            : (canRename ? 'Double-click to rename' : undefined)
        }
        onDoubleClick={(e) => {
          e.stopPropagation();
          if ((mergeSelectMode && !mergeSelectionViaCheckboxOnly) || !canRename) return;
          setDraftName(name);
          setEditingName(true);
        }}
        onClick={(e) => {
          if (!mergeSelectMode || !onMergeToggle || mergeSelectionViaCheckboxOnly) return;
          e.stopPropagation();
          onMergeToggle();
        }}
      >
        {editingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitRename();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                cancelRename();
              }
            }}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              fontSize: titleFs,
              fontWeight: 600,
              color: '#111827',
              lineHeight: 1.25,
              border: '1px solid #4F6EF7',
              borderRadius: 6,
              padding: '4px 6px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        ) : (
          <span
            title={name}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontSize: titleFs,
              fontWeight: 700,
              color: '#111827',
              lineHeight: 1.25,
              wordBreak: 'break-word',
            }}
          >
            {name}
          </span>
        )}
        {!editingName ? renderEditedUnderTitle(11, 4, true) : null}
      </div>
    );

    return (
      <div
        draggable={cardDraggable}
        onDragStart={(e) => {
          onDocRefDragStart?.(e);
          if (mergeDraggable && onMergeDragStart) onMergeDragStart(e);
        }}
        style={{
          position: 'relative',
          width: cardW,
          flexShrink: 0,
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          cursor: cardDraggable ? 'grab' : undefined,
        }}
        onMouseEnter={() => { setHov(true); onHover?.(true); }}
        onMouseLeave={() => { setHov(false); onHover?.(false); }}
      >
        {mergeSelectMode ? (
          <label
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              left: 'auto',
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: 6,
              background: '#fff',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              margin: 0,
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={mergeSelected}
              readOnly
              tabIndex={-1}
              aria-label={`Select ${name} for merge`}
              style={{ width: 15, height: 15, margin: 0, cursor: 'pointer', accentColor: '#4F6EF7' }}
              onClick={(e) => {
                e.stopPropagation();
                onMergeToggle?.();
              }}
            />
          </label>
        ) : null}
        <div style={{
          position: 'relative',
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          border: mergeSelected
            ? '2px solid #4F6EF7'
            : `1px solid ${hov ? '#4F6EF7' : '#E5E7EB'}`,
          borderRadius: innerRadius,
          background: '#fff',
          boxShadow: mergeSelected ? '0 0 0 1px rgba(79, 110, 247, 0.2)' : (hov ? '0 0 0 2px #EEF1FE' : '0 1px 4px rgba(0,0,0,0.07)'),
          overflow: 'hidden',
          transition: 'border 0.15s, box-shadow 0.15s',
        }}
        >
          {inDocumentPackage ? (
            <span
              className="merged-package-tag"
              role="img"
              aria-label="In a document package"
              title="In a document package"
              style={{
                position: 'absolute',
                top: 8,
                right: mergeSelectMode ? 40 : 8,
                zIndex: 3,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 3,
                pointerEvents: 'none',
              }}
            >
              <Link2 size={12} strokeWidth={2.5} aria-hidden />
            </span>
          ) : null}
          <div
            role="button"
            tabIndex={0}
            onClick={
              mergeSelectMode && onMergeToggle && !mergeSelectionViaCheckboxOnly
                ? () => onMergeToggle()
                : onClick
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (mergeSelectMode && onMergeToggle && !mergeSelectionViaCheckboxOnly) onMergeToggle();
                else onClick?.();
              }
            }}
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'left',
              cursor: 'pointer',
              border: 'none',
              padding: 0,
              margin: 0,
              background: 'transparent',
              font: 'inherit',
              color: 'inherit',
            }}
          >
            <div
              style={{
                background: '#ECEEF1',
                padding: '30px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 132,
              }}
              title={isDocumentOnlyCard ? 'Document preview' : 'Linked CAD assembly (preview — illustrative)'}
            >
              {isDocumentOnlyCard ? (
                <FileText size={42} color="#A3A8AE" strokeWidth={1.8} aria-hidden />
              ) : (
                <CadThumb borderColor="#D1D5DB" displayWidth={84} displayHeight={52} />
              )}
            </div>
            <div style={{ padding: '12px 12px 8px', flexShrink: 0 }}>
              {titleBlock}
            </div>
            {!isDocumentOnlyCard ? (
            <div style={{ padding: '0 12px 12px', marginTop: 'auto', flexShrink: 0 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minWidth: 0,
                background: '#F0F1F3',
                borderRadius: 8,
                padding: '8px 10px',
              }}
              >
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  {renderCadFileLabel(11)}
                </div>
                <span
                  ref={docCountBadgeRef}
                  onMouseEnter={openDocCountPopover}
                  onMouseLeave={scheduleCloseDocCountPopover}
                  style={{
                    flexShrink: 0,
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#111827',
                    background: '#B8E986',
                    borderRadius: 9999,
                    padding: '2px 8px',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    cursor: 'default',
                  }}
                >
                  {docCountLabel}
                </span>
              </div>
            </div>
            ) : null}
          </div>
          {docCountPopover}
          {showDel && (
            <button
              type="button"
              title="Delete document"
              aria-label={`Delete ${name}`}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 7,
                width: 28,
                height: 28,
                borderRadius: 6,
                border: '1px solid #E5E7EB',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                color: '#6B7280',
                opacity: hov ? 1 : 0,
                pointerEvents: hov ? 'auto' : 'none',
                transition: 'opacity 0.15s ease',
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      draggable={cardDraggable}
      onDragStart={(e) => {
        onDocRefDragStart?.(e);
        if (mergeDraggable && onMergeDragStart) onMergeDragStart(e);
      }}
      style={{
        position: 'relative',
        width: cardW,
        flexShrink: 0,
        alignSelf: 'stretch',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        cursor: cardDraggable ? 'grab' : undefined,
      }}
      onMouseEnter={() => { setHov(true); onHover?.(true); }}
      onMouseLeave={() => { setHov(false); onHover?.(false); }}
    >
      {mergeSelectMode ? (
        <label
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            left: 'auto',
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 6,
            background: '#fff',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            cursor: 'pointer',
            margin: 0,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={mergeSelected}
            readOnly
            tabIndex={-1}
            aria-label={`Select ${name} for merge`}
            style={{ width: 15, height: 15, margin: 0, cursor: 'pointer', accentColor: '#4F6EF7' }}
            onClick={(e) => {
              e.stopPropagation();
              onMergeToggle?.();
            }}
          />
        </label>
      ) : null}
      <div style={{
        position: 'relative',
        width: '100%',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        border: mergeSelected
          ? '2px solid #4F6EF7'
          : `1px solid ${hov ? '#4F6EF7' : '#E5E7EB'}`,
        borderRadius: innerRadius,
        background: '#fff',
        boxShadow: mergeSelected ? '0 0 0 1px rgba(79, 110, 247, 0.2)' : (hov ? '0 0 0 2px #EEF1FE' : '0 1px 4px rgba(0,0,0,0.07)'),
        overflow: 'hidden',
        transition: 'border 0.15s, box-shadow 0.15s',
      }}
      >
        <div
          style={{
            padding: mergeSelectMode ? '10px 38px 0 12px' : titlePad,
            flexShrink: 0,
            minWidth: 0,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            cursor: mergeSelectMode && !mergeSelectionViaCheckboxOnly ? 'pointer' : (canRename ? 'text' : 'default'),
          }}
          title={
            mergeSelectMode && !mergeSelectionViaCheckboxOnly
              ? 'Click to select or deselect for merge'
              : (canRename ? 'Double-click to rename' : undefined)
          }
          onDoubleClick={(e) => {
            e.stopPropagation();
            if ((mergeSelectMode && !mergeSelectionViaCheckboxOnly) || !canRename) return;
            setDraftName(name);
            setEditingName(true);
          }}
          onClick={(e) => {
            if (!mergeSelectMode || !onMergeToggle || mergeSelectionViaCheckboxOnly) return;
            e.stopPropagation();
            onMergeToggle();
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitRename}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitRename();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelRename();
                  }
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontSize: titleFs,
                  fontWeight: 600,
                  color: '#111827',
                  lineHeight: 1.25,
                  border: '1px solid #4F6EF7',
                  borderRadius: 6,
                  padding: '4px 6px',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            ) : (
              <span
                title={name}
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  fontSize: titleFs,
                  fontWeight: 600,
                  color: '#111827',
                  lineHeight: 1.25,
                  wordBreak: 'break-word',
                }}
              >
                {name}
              </span>
            )}
            {!editingName ? renderEditedUnderTitle(10, 5) : null}
          </div>
          {(inDocumentPackage || onOpenDocumentLinks) ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {onOpenDocumentLinks ? (
                <button
                  type="button"
                  title="Open Document links"
                  aria-label={`Document links from ${name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDocumentLinks();
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: '1px solid rgba(79, 110, 247, 0.25)',
                    background: '#fff',
                    cursor: 'pointer',
                    color: '#4F6EF7',
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  <GitBranch size={14} aria-hidden />
                </button>
              ) : null}
              {inDocumentPackage ? (
                <span
                  className="merged-package-tag"
                  role="img"
                  aria-label="In a document package"
                  title="In a document package"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 2,
                    color: '#6B7280',
                  }}
                >
                  <Link2 size={14} strokeWidth={2.25} aria-hidden />
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={
            mergeSelectMode && onMergeToggle && !mergeSelectionViaCheckboxOnly
              ? () => onMergeToggle()
              : onClick
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (mergeSelectMode && onMergeToggle && !mergeSelectionViaCheckboxOnly) onMergeToggle();
              else onClick?.();
            }
          }}
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            textAlign: 'left',
            cursor: 'pointer',
            border: 'none',
            padding: 0,
            margin: 0,
            background: 'transparent',
            font: 'inherit',
            color: 'inherit',
          }}
        >
          <div
            style={{
              padding: thumbPad,
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'stretch',
            }}
            title="Linked CAD assembly (preview — illustrative)"
          >
            <CadThumb
              borderColor="#E5E7EB"
              displayWidth={thumbDisplayW}
              displayHeight={thumbDisplayH}
            />
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '4px 12px 0',
            flexShrink: 0,
            minWidth: 0,
          }}
          >
            {(() => {
              const fileLabelNode = onCadFileLabelClick && cadFileLabel && cadFileLabel !== '—' ? (
                <button
                  type="button"
                  title="Open Parts map for this CAD"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCadFileLabelClick(cadFileLabel);
                  }}
                  style={{
                    display: 'block',
                    width: 'max-content',
                    maxWidth: '100%',
                    minWidth: 0,
                    fontSize: fileFs,
                    fontWeight: 500,
                    color: '#4F6EF7',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.25,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    padding: 0,
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                  }}
                >
                  {cadFileLabel}
                </button>
              ) : (
                <div
                  title={cadFileLabel || undefined}
                  style={{
                    display: 'block',
                    width: 'max-content',
                    maxWidth: '100%',
                    minWidth: 0,
                    fontSize: fileFs,
                    fontWeight: 500,
                    color: '#374151',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.25,
                  }}
                >
                  {cadFileLabel || '—'}
                </div>
              );
              const statusNode = showStatusTag ? (
                <Des36PrdDocStatusTag
                  stateLabel={stateLabel}
                  lastUpdated={lastUpdated}
                  accentKey={accentKey}
                  cadVersion={cadVersion}
                />
              ) : null;
              const linkedRecency = lastUpdated != null
                && String(lastUpdated).trim() !== ''
                && lastUpdated !== '—';
              if (linkedCaption) {
                return (
                  <>
                    <div style={{
                      minWidth: 0,
                      overflow: 'hidden',
                      marginBottom: 2,
                    }}
                    >
                      {fileLabelNode}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      minWidth: 0,
                      marginBottom: statusMb,
                    }}
                    >
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: 10,
                          fontWeight: 500,
                          color: '#9CA3AF',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={linkedRecency ? `Linked ${lastUpdated}` : 'Not linked to a CAD file'}
                      >
                        {linkedRecency ? (
                          <>
                            <span style={{ color: '#6B7280', fontWeight: 600 }}>Linked</span>
                            {' — '}
                            {lastUpdated}
                          </>
                        ) : (
                          <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Not linked</span>
                        )}
                      </span>
                      {statusNode ? (
                        <div style={{ flexShrink: 0 }}>{statusNode}</div>
                      ) : null}
                    </div>
                  </>
                );
              }
              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 0,
                  marginBottom: statusMb,
                }}
                >
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>{fileLabelNode}</div>
                  {statusNode ? (
                    <div style={{ flexShrink: 0 }}>{statusNode}</div>
                  ) : null}
                </div>
              );
            })()}
          </div>
          <div style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '6px 12px 7px',
          }}
          >
            <Des36PrdDocCadChangeInline
              style={{ marginBottom: 0, flexShrink: 0 }}
              accentKey={accentKey}
              cadDiffAdded={cadDiffAdded}
              cadDiffRemoved={cadDiffRemoved}
              cadDiffModified={cadDiffModified}
              cadChangeSummary={cadChangeSummary}
            />
            {showFooter && !mergeSelectMode ? (
              <div style={{
                marginTop: 'auto',
                paddingTop: footerPt,
                borderTop: '1px solid #F3F4F6',
                flexShrink: 0,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '6px 10px',
              }}
              >
                <span
                  style={{ fontSize: opFs, color: '#9CA3AF', lineHeight: 1.3 }}
                  title="Number of operations (steps) in this document"
                >
                  {operationCount === 1 ? '1 operation' : `${operationCount} operations`}
                </span>
              </div>
            ) : null}
          </div>
        </div>
        {showDel && (
          <button
            type="button"
            title="Delete document"
            aria-label={`Delete ${name}`}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 7,
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid #E5E7EB',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              color: '#6B7280',
              opacity: hov ? 1 : 0,
              pointerEvents: hov ? 'auto' : 'none',
              transition: 'opacity 0.15s ease',
            }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
