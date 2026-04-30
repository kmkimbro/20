import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Home, Plus, Users, FolderOpen,
  ChevronRight, ChevronDown, X, Library, Wrench, Trash2, Plug, Check,
  LayoutGrid, List, Boxes, GitBranch, Sparkles, GitMerge, Layers, FileText, Link2,
  ClipboardList, Upload,
} from 'lucide-react';
import Header from '../components/Header.jsx';
import PrototypeSwitcher from '../components/PrototypeSwitcher.jsx';
import { TOOLS_BOM_INITIAL } from '../data/toolsBom.js';
import Des36PrdDocCard from './des36/Des36PrdDocCard.jsx';
import MergedPackageTag from '../components/MergedPackageTag.jsx';
import Des36PrdDocCadChangeInline from './des36/Des36PrdDocCadChangeInline.jsx';
import Des36PrdDocStatusTag from './des36/Des36PrdDocStatusTag.jsx';
import CadThumb from './des36/CadThumb.jsx';
import { Des36PrdCadOnboarding } from './des36/Des36PrdOnboarding.jsx';
import DocumentConnectionsPanel from './des36/DocumentConnectionsPanel.jsx';
import {
  PART_ASSEMBLY_CATALOG,
  DEFAULT_PARTS_ASSEMBLY_ID,
  getAssemblyById,
} from '../data/partsAssemblyCatalog.js';
import { allPartLibraryRows } from '../lib/partsLibraryTable.js';
import { applyOnboarding2MockMerge, MOCK_WELD_FRAME_PROJECT_ID } from '../data/onboarding2MockBootstrap.js';
import { mockWeldFrameProject } from '../data/mockWeldFrameProjectGraph.js';
import { ProjectConnectionGraphCanvas } from '../components/graph';

function LayersPlusIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 .83.18 2 2 0 0 0 .83-.18l8.58-3.9a1 1 0 0 0 0-1.83z" />
      <path d="M16 17h6" />
      <path d="M19 14v6" />
      <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 .825.178" />
      <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l2.116-.962" />
    </svg>
  );
}

function FilePlusCornerIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11.35 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v5.35" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
      <path d="M14 19h6" />
      <path d="M17 16v6" />
    </svg>
  );
}

/**
 * After onboarding (DES 36 / DES 36 v2), open the combined prototype: parts + tools table,
 * CAD view, screenshots, Tools Library — same app as /prototype/des-combined-3.
 */
const DEFAULT_EDITOR_PATH = '/prototype/des-combined-3';

/** Map illustrative CAD file names to a demo assembly for the Parts map. */
function partsAssemblyIdForCadLabel(label) {
  if (!label || typeof label !== 'string') return DEFAULT_PARTS_ASSEMBLY_ID;
  const t = label.toLowerCase();
  if (t.includes('door') || t.includes('latch') || t.includes('bracket_1045')) return 'asm-door-latch';
  if (t.includes('valve') || t.includes('fixture') || t.includes('gearbox') || t.includes('motor_mount')) {
    return 'asm-test-rig';
  }
  if (
    t.includes('pump')
    || t.includes('hydraulic')
    || t.includes('manifold')
    || t.includes('chassis')
    || (t.includes('weldment') && t.includes('frame'))
  ) {
    return 'asm-pump-skid';
  }
  return DEFAULT_PARTS_ASSEMBLY_ID;
}

function editorHref(docName, empty = false, editorPath = DEFAULT_EDITOR_PATH, extra = {}) {
  const nav = extra?.nav != null && extra.nav !== '' ? String(extra.nav) : 'cad';
  const q = new URLSearchParams({ nav, docName });
  if (empty) q.set('empty', '1');
  Object.entries(extra).forEach(([k, v]) => {
    if (k === 'nav') return;
    if (v != null && v !== '') q.set(k, String(v));
  });
  return `${editorPath}?${q.toString()}`;
}

/* ─── Palette ────────────────────────────────────────────────────────────── */
const C = {
  blue:      '#4F6EF7',
  blueLight: '#EEF1FE',
  sidebar:   '#ffffff',
  sidebarBdr:'#E5E7EB',
  bg:        '#F0F2F7',
  card:      '#ffffff',
  cardBdr:   '#E5E7EB',
  text:      '#111827',
  sub:       '#6B7280',
  muted:     '#9CA3AF',
};

/** Outline style for Merge documents (primary action stays New document). */
function mergeDocumentsSecondaryBtnStyle(disabled) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 7,
    border: `1px solid ${disabled ? C.cardBdr : 'rgba(79, 110, 247, 0.35)'}`,
    background: '#fff',
    color: disabled ? C.muted : C.blue,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
  };
}

function docLayoutSegmentBtnStyle(active) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 10px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    fontFamily: 'inherit',
    background: active ? '#fff' : 'transparent',
    color: active ? C.text : C.muted,
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
  };
}

/** Bleed list/table to full width of main pane (cancels parent horizontal padding). */
const DOC_LIST_BLEED_PAD = 44;
/** Inset so the table is not flush against the main pane edges. */
const DOC_LIST_TABLE_MARGIN_X = 24;

const docListTableBleedWrap = {
  boxSizing: 'border-box',
  marginLeft: -DOC_LIST_BLEED_PAD,
  marginRight: -DOC_LIST_BLEED_PAD,
  width: `calc(100% + ${DOC_LIST_BLEED_PAD * 2}px)`,
  paddingLeft: DOC_LIST_TABLE_MARGIN_X,
  paddingRight: DOC_LIST_TABLE_MARGIN_X,
  paddingTop: 16,
};

const docListThStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: C.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  textAlign: 'left',
  padding: '11px 16px',
  borderBottom: `1px solid ${C.cardBdr}`,
  background: '#F9FAFB',
  whiteSpace: 'nowrap',
};

const docListTdText = {
  fontSize: 13,
  color: C.text,
  fontWeight: 600,
  padding: '12px 16px',
  borderBottom: `1px solid ${C.cardBdr}`,
  verticalAlign: 'middle',
  maxWidth: 0,
};

const docListTdMuted = {
  fontSize: 13,
  color: C.sub,
  padding: '12px 16px',
  borderBottom: `1px solid ${C.cardBdr}`,
  verticalAlign: 'middle',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 0,
};

const docListTdMeta = {
  fontSize: 13,
  color: C.muted,
  padding: '12px 16px',
  borderBottom: `1px solid ${C.cardBdr}`,
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
};

const docListTdRight = {
  fontSize: 13,
  color: C.muted,
  padding: '12px 16px',
  borderBottom: `1px solid ${C.cardBdr}`,
  verticalAlign: 'middle',
  textAlign: 'right',
  whiteSpace: 'nowrap',
  width: 1,
};

const docListTdStatus = {
  fontSize: 13,
  padding: '12px 16px',
  borderBottom: `1px solid ${C.cardBdr}`,
  verticalAlign: 'top',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
};

const docListTdCadFile = {
  ...docListTdMuted,
  fontSize: 11,
  fontWeight: 500,
  color: '#374151',
};

/* ─── Small reusable pieces ──────────────────────────────────────────────── */
function NavItem({ icon, label, active }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
      color: active ? C.blue : C.sub, fontWeight: active ? 500 : 400,
      background: active ? C.blueLight : 'transparent', fontSize: 13,
    }}>
      {icon}
      {label}
    </div>
  );
}

function DocTile({
  name,
  subtitle,
  onClick,
  onDelete,
  onOpenDocumentLinks,
  mergeSelectMode = false,
  mergeSelected = false,
  onMergeToggle,
  mergeSelectionViaCheckboxOnly = false,
  mergeDraggable = false,
  onMergeDragStart,
  onDocRefDragStart,
  inDocumentPackage = false,
}) {
  const [hov, setHov] = useState(false);
  const docRefDraggable = Boolean(onDocRefDragStart);
  const tileDraggable = mergeDraggable || docRefDraggable;
  return (
    <div
      draggable={tileDraggable}
      onDragStart={(e) => {
        onDocRefDragStart?.(e);
        if (mergeDraggable && onMergeDragStart) onMergeDragStart(e);
      }}
      style={{
        position: 'relative',
        width: 148,
        flexShrink: 0,
        alignSelf: 'stretch',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        cursor: tileDraggable ? 'grab' : undefined,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {mergeSelectMode ? (
        <label
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            left: 'auto',
            zIndex: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 6,
            background: '#fff',
            border: `1px solid ${C.cardBdr}`,
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
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
      >
        {onDelete && !mergeSelectMode && (
          <button
            type="button"
            title="Delete document"
            aria-label={`Delete ${name}`}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              zIndex: 2,
              width: 28,
              height: 28,
              borderRadius: 6,
              border: `1px solid ${C.cardBdr}`,
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              color: C.muted,
              opacity: hov ? 1 : 0,
              pointerEvents: hov ? 'auto' : 'none',
              transition: 'opacity 0.15s ease',
            }}
          >
            <Trash2 size={14} />
          </button>
        )}
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
            width: '100%',
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            background: C.card,
            border: mergeSelected
              ? `2px solid ${C.blue}`
              : `1px solid ${hov ? C.blue : C.cardBdr}`,
            borderRadius: 10,
            cursor: 'pointer',
            padding: mergeSelectMode ? '10px 10px 10px 10px' : 10,
            boxShadow: mergeSelected
              ? '0 0 0 1px rgba(79, 110, 247, 0.2)'
              : (hov ? `0 0 0 2px ${C.blueLight}` : '0 1px 4px rgba(0,0,0,0.07)'),
            transition: 'border 0.15s, box-shadow 0.15s',
            textAlign: 'left',
            fontFamily: 'inherit',
            color: 'inherit',
          }}
        >
          <CadThumb borderColor={C.cardBdr} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 0,
              width: '100%',
            }}
          >
            <span style={{
              flex: 1,
              minWidth: 0,
              fontSize: 12, fontWeight: 500, color: C.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            >
              {name}
            </span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
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
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    border: '1px solid rgba(79, 110, 247, 0.25)',
                    background: '#fff',
                    cursor: 'pointer',
                    color: C.blue,
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  <GitBranch size={13} aria-hidden />
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
                    color: C.muted,
                  }}
                >
                  <Link2 size={12} strokeWidth={2.25} aria-hidden />
                </span>
              ) : null}
            </div>
          </div>
          {subtitle && (
            <span style={{
              fontSize: 11, color: C.muted, marginTop: -4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Templates shown in the create-document modal (prototype — drives initial PRD card shape). */
const DOCUMENT_CREATE_TEMPLATES = [
  { id: 'blank', label: 'Blank document', description: 'Minimal doc. Leave CAD empty to start without a linked file.' },
  { id: 'work_instruction', label: 'Work instruction (WI)', description: 'Typical WI with more operation placeholders.' },
  { id: 'quality_checklist', label: 'Quality checklist (QC)', description: 'QC-focused steps and verifications.' },
  { id: 'drawing_release', label: 'Drawing release package', description: 'Released set with sample revision / diff badges.' },
];

/**
 * Initial {@link Des36PrdDocCard} seed from template + user CAD name (passed through {@link clonePrdCard}).
 */
function prdDefaultsForTemplate(templateId, cadNameInput, documentName) {
  const t = (cadNameInput || '').trim();
  const baseAsm = assemblyBaseFromDocName(documentName);
  const derivedCad = `${baseAsm.replace(/\s+/g, '_')}.stp`;

  if (!t && templateId === 'blank') {
    return {
      stateLabel: 'No CAD linked',
      lastUpdated: '—',
      documentLastEdited: 'Just now',
      accentKey: 'no_cad',
      operationCount: 3,
      cadFileLabel: 'No CAD file linked',
    };
  }

  const cadFileLabel = t || derivedCad;

  switch (templateId) {
    case 'work_instruction':
      return {
        stateLabel: 'In sync',
        lastUpdated: 'Just now',
        documentLastEdited: 'Just now',
        accentKey: 'in_sync',
        operationCount: 8,
        cadFileLabel,
      };
    case 'quality_checklist':
      return {
        stateLabel: 'In sync',
        lastUpdated: 'Just now',
        documentLastEdited: '12m ago',
        accentKey: 'in_sync',
        operationCount: 5,
        cadFileLabel,
      };
    case 'drawing_release':
      return {
        stateLabel: 'Auto-updated',
        lastUpdated: 'Today',
        documentLastEdited: 'Yesterday',
        accentKey: 'auto_updated',
        operationCount: 12,
        cadFileLabel,
        cadVersion: 'Rev A',
        cadDiffAdded: 0,
        cadDiffRemoved: 0,
        cadDiffModified: 1,
        cadChangeSummary: 'Initial release created from template.',
      };
    case 'blank':
    default:
      return {
        stateLabel: 'In sync',
        lastUpdated: 'Just now',
        documentLastEdited: 'Just now',
        accentKey: 'in_sync',
        operationCount: 1,
        cadFileLabel,
      };
  }
}

function CreateDocModal({
  documentName,
  cadName,
  templateId,
  templates,
  onDocumentNameChange,
  onCadNameChange,
  onTemplateChange,
  onCreate,
  onClose,
}) {
  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10050,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="create-doc-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.card,
          borderRadius: 12,
          width: 'min(480px, 92vw)',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          fontFamily: 'inherit',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${C.cardBdr}`,
        }}
        >
          <span id="create-doc-modal-title" style={{ fontWeight: 600, fontSize: 15, color: C.text }}>
            Create new document
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sub, padding: 4, borderRadius: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 20px 8px' }}>
          <label htmlFor="create-doc-name" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>
            Document name
          </label>
          <input
            id="create-doc-name"
            value={documentName}
            onChange={(e) => onDocumentNameChange(e.target.value)}
            placeholder="e.g. WI-014 — Torque sequence"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: `1px solid ${C.cardBdr}`,
              borderRadius: 7,
              padding: '8px 12px',
              fontSize: 13,
              color: C.text,
              outline: 'none',
              marginBottom: 16,
              fontFamily: 'inherit',
            }}
          />

          <label htmlFor="create-doc-cad" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>
            CAD file name
          </label>
          <input
            id="create-doc-cad"
            value={cadName}
            onChange={(e) => onCadNameChange(e.target.value)}
            placeholder="e.g. weldment_frame_v4.stp (optional for blank template)"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: `1px solid ${C.cardBdr}`,
              borderRadius: 7,
              padding: '8px 12px',
              fontSize: 13,
              color: C.text,
              outline: 'none',
              marginBottom: 8,
              fontFamily: 'inherit',
            }}
          />
          <p style={{ margin: '0 0 16px', fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
            Shown on the PRD card as the linked assembly. You can use any label for this prototype (no file upload).
          </p>

          <label htmlFor="create-doc-template" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>
            Template
          </label>
          <select
            id="create-doc-template"
            value={templateId}
            onChange={(e) => onTemplateChange(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: `1px solid ${C.cardBdr}`,
              borderRadius: 7,
              padding: '8px 10px',
              fontSize: 13,
              color: C.text,
              background: '#fff',
              fontFamily: 'inherit',
              marginBottom: 10,
              cursor: 'pointer',
            }}
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>{tpl.label}</option>
            ))}
          </select>
          {(() => {
            const meta = templates.find((x) => x.id === templateId);
            return meta ? (
              <p style={{ margin: '0 0 8px', fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
                {meta.description}
              </p>
            ) : null;
          })()}
        </div>

        <div style={{
          padding: '12px 20px 20px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          flexWrap: 'wrap',
          borderTop: `1px solid ${C.cardBdr}`,
        }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#fff',
              color: C.text,
              border: `1px solid ${C.cardBdr}`,
              borderRadius: 8,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCreate}
            style={{
              background: C.blue,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 22px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Create document
          </button>
        </div>
      </div>
    </div>
  );
}

export const DEFAULT_DES36_STORAGE_KEY = 'des36_state';

/** Merge into persisted blob so we never wipe toolLibrary, openedDocs, etc. */
function mergePersistState(patch, storageKey = DEFAULT_DES36_STORAGE_KEY) {
  try {
    const raw = localStorage.getItem(storageKey);
    const prev = raw ? JSON.parse(raw) : {};
    localStorage.setItem(storageKey, JSON.stringify({ ...prev, ...patch }));
  } catch { /* non-critical */ }
}

function loadState(storageKey = DEFAULT_DES36_STORAGE_KEY) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Each project id maps to an array of docs; coerce bad persisted shapes to []. */
function normalizeProjectDocs(raw) {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = Array.isArray(v) ? v : [];
  }
  return out;
}

function projectDocList(projectDocs, projectId) {
  if (!projectId) return [];
  const v = projectDocs?.[projectId];
  return Array.isArray(v) ? v : [];
}

function visibleProjectDocList(projectDocs, projectId) {
  return projectDocList(projectDocs, projectId).filter((d) => !d?.uploaded);
}

/** Drag payload for merge → project-owned package (toc-hub). */
const MERGE_DOC_KEYS_DRAG_TYPE = 'application/x-q20-merge-doc-keys';
/** Single document drag → drop onto an existing merged package (any project). */
const MERGE_DOC_DOC_REF_TYPE = 'application/x-q20-doc-ref';

/** Drop-target id for the open merged-package member list (append to current package). */
function mergedPackageMainDropKey(megaId) {
  return megaId ? `main:${megaId}` : '';
}

function dataTransferHasMergeDocKeys(dataTransfer) {
  const types = dataTransfer?.types;
  if (!types) return false;
  return typeof types.includes === 'function'
    ? types.includes(MERGE_DOC_KEYS_DRAG_TYPE)
    : Array.from(types).includes(MERGE_DOC_KEYS_DRAG_TYPE);
}

function dataTransferHasDocRef(dataTransfer) {
  const types = dataTransfer?.types;
  if (!types) return false;
  return typeof types.includes === 'function'
    ? types.includes(MERGE_DOC_DOC_REF_TYPE)
    : Array.from(types).includes(MERGE_DOC_DOC_REF_TYPE);
}

function dataTransferHasDocRefOrMergeKeys(dataTransfer) {
  return dataTransferHasMergeDocKeys(dataTransfer) || dataTransferHasDocRef(dataTransfer);
}

function mergeDocSelectionKey(projectId, docId) {
  return `${projectId}\t${docId}`;
}

function parseMergeDocSelectionKey(key) {
  if (typeof key !== 'string') return null;
  const i = key.indexOf('\t');
  if (i <= 0) return null;
  const projectId = key.slice(0, i);
  const docId = key.slice(i + 1);
  if (!projectId || !docId) return null;
  return { projectId, docId };
}

function parseDocRefDragPayload(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const o = JSON.parse(raw);
    if (o && typeof o.projectId === 'string' && typeof o.docId === 'string') {
      return { projectId: o.projectId, docId: o.docId };
    }
  } catch { /* ignore */ }
  return null;
}

/** Build unique { projectId, docId }[] from merge-keys JSON and/or single doc-ref JSON. */
function collectRefsFromPackageDropDataTransfer(dataTransfer) {
  const out = [];
  const seen = new Set();
  const add = (r) => {
    if (!r?.projectId || !r?.docId) return;
    const k = mergeDocSelectionKey(r.projectId, r.docId);
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ projectId: r.projectId, docId: r.docId });
  };
  try {
    const mergeRaw = dataTransfer.getData(MERGE_DOC_KEYS_DRAG_TYPE);
    if (mergeRaw) {
      const parsed = JSON.parse(mergeRaw);
      if (Array.isArray(parsed.keys)) {
        for (const key of parsed.keys) {
          const r = parseMergeDocSelectionKey(key);
          if (r) add(r);
        }
      }
    }
  } catch { /* ignore */ }
  try {
    const refRaw = dataTransfer.getData(MERGE_DOC_DOC_REF_TYPE);
    const r = parseDocRefDragPayload(refRaw);
    if (r) add(r);
  } catch { /* ignore */ }
  return out;
}

/** Current member refs for a mega (for append). */
function megaSourceRefsForAppend(mega, packageProjectId) {
  if (Array.isArray(mega.sourceRefs) && mega.sourceRefs.length >= 1) {
    return mega.sourceRefs.map((r) => ({ projectId: r.projectId, docId: r.docId }));
  }
  if (Array.isArray(mega.sourceDocIds) && mega.sourceDocIds.length >= 1) {
    return mega.sourceDocIds.map((docId) => ({ projectId: packageProjectId, docId }));
  }
  return [];
}

function resolveMegaSourceDocNames(projectDocs, packageProjectId, mega) {
  if (Array.isArray(mega.sourceRefs) && mega.sourceRefs.length >= 1) {
    return mega.sourceRefs.map((r) => {
      const list = projectDocList(projectDocs, r.projectId);
      return list.find((d) => d.id === r.docId)?.name;
    }).filter(Boolean);
  }
  return resolveSourceDocNames(projectDocs, packageProjectId, mega.sourceDocIds);
}

/** Member documents for a package (same-project or cross-project). */
function megaMemberDocuments(projectDocs, packageProjectId, mega) {
  if (Array.isArray(mega.sourceRefs) && mega.sourceRefs.length) {
    return mega.sourceRefs.map((r) => {
      const list = projectDocList(projectDocs, r.projectId);
      return list.find((d) => d.id === r.docId);
    }).filter(Boolean);
  }
  const list = projectDocList(projectDocs, packageProjectId);
  return (mega.sourceDocIds || []).map((sid) => list.find((d) => d.id === sid)).filter(Boolean);
}

/** Per-project merged “mega” documents: { id, editorDocName, sourceDocIds[], sourceRefs? } */
function normalizeProjectMergedDocs(raw) {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!Array.isArray(v)) {
      out[k] = [];
      continue;
    }
    out[k] = v
      .filter((m) => {
        if (!m || typeof m !== 'object' || typeof m.id !== 'string' || typeof m.editorDocName !== 'string') {
          return false;
        }
        const refsOk = Array.isArray(m.sourceRefs) && m.sourceRefs.length >= 1
          && m.sourceRefs.every((r) => r && typeof r.projectId === 'string' && typeof r.docId === 'string');
        const idsOk = Array.isArray(m.sourceDocIds) && m.sourceDocIds.length >= 1;
        return refsOk || idsOk;
      })
      .map((m) => {
        const base = {
          id: m.id,
          editorDocName: m.editorDocName,
          sourceDocIds: Array.isArray(m.sourceDocIds) ? [...m.sourceDocIds] : [],
        };
        if (Array.isArray(m.sourceRefs) && m.sourceRefs.length >= 1) {
          return {
            ...base,
            sourceRefs: m.sourceRefs.map((r) => ({ projectId: r.projectId, docId: r.docId })),
          };
        }
        return base;
      });
  }
  return out;
}

function buildDocumentPackageSeed(saved) {
  const hasProjects = Array.isArray(saved?.projects) && saved.projects.length > 0;
  if (hasProjects) return null;
  const ts = Date.now();
  const projectId = 'p-doc-package-sample';
  const docA = `d-${ts}-sample-a`;
  const docB = `d-${ts}-sample-b`;
  const megaId = `m-${ts}-sample`;
  return {
    projects: [{ id: projectId, name: 'Drone assembly' }],
    selectedId: projectId,
    view: 'project',
    projectMainTab: 'documents',
    projectDocs: {
      [projectId]: [
        { id: docA, name: 'Work instruction — Battery mount' },
        { id: docB, name: 'Drawing — Battery tray rev C' },
      ],
    },
    projectMergedDocuments: {
      [projectId]: [
        {
          id: megaId,
          editorDocName: 'Battery mount package',
          sourceRefs: [
            { projectId, docId: docA },
            { projectId, docId: docB },
          ],
          sourceDocIds: [docA, docB],
        },
      ],
    },
    projectCadOnboarding: {
      [projectId]: { phase: 'complete' },
    },
  };
}

function mergedDocsList(projectMergedDocs, projectId) {
  if (!projectId) return [];
  const v = projectMergedDocs?.[projectId];
  return Array.isArray(v) ? v : [];
}

/** True if this document is a member of any merged package (any owning project). */
function isDocInMergedPackage(projectMergedDocs, docProjectId, docId) {
  if (!docProjectId || !docId || !projectMergedDocs) return false;
  for (const ownerId of Object.keys(projectMergedDocs)) {
    for (const m of mergedDocsList(projectMergedDocs, ownerId)) {
      if (Array.isArray(m.sourceRefs) && m.sourceRefs.length) {
        if (m.sourceRefs.some((r) => r.projectId === docProjectId && r.docId === docId)) return true;
      } else if (ownerId === docProjectId && Array.isArray(m.sourceDocIds) && m.sourceDocIds.includes(docId)) {
        return true;
      }
    }
  }
  return false;
}

/** Names of source docs for a merged entry (for card title). */
function resolveSourceDocNames(projectDocs, projectId, sourceDocIds) {
  const list = projectDocList(projectDocs, projectId);
  return (sourceDocIds || []).map((sid) => list.find((d) => d.id === sid)?.name).filter(Boolean);
}

/** Merged packages for Recent files (home): each item includes owning project. */
function allMergedDocsAcrossProjects(projectMergedDocs, projects, projectDocs) {
  return projects.flatMap((p) =>
    mergedDocsList(projectMergedDocs, p.id).map((mega) => ({
      mega,
      projectId: p.id,
      projectName: p.name,
    })),
  ).sort((a, b) => {
    const parseTs = (id) => {
      const m = String(id || '').match(/m-(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    };
    return parseTs(b.mega.id) - parseTs(a.mega.id);
  });
}

function uniqueMergedEditorName(projectDocs, projectMergedDocs, projectId, base) {
  const names = new Set(projectDocList(projectDocs, projectId).map((d) => d.name));
  mergedDocsList(projectMergedDocs, projectId).forEach((m) => names.add(m.editorDocName));
  if (!names.has(base)) return base;
  let i = 2;
  let candidate = `${base} (${i})`;
  while (names.has(candidate)) {
    i += 1;
    candidate = `${base} (${i})`;
  }
  return candidate;
}

/* ─── Tool Library helpers (same storage key as ProjectHome persist blob) ─ */
function loadToolLibraryState(storageKey = DEFAULT_DES36_STORAGE_KEY) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveToolLibraryState(updater, storageKey = DEFAULT_DES36_STORAGE_KEY) {
  try {
    const prev = loadToolLibraryState(storageKey);
    const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch { /* non-critical */ }
}

/** Same 50 doc names on every design-review row (Megadocument 2). */
const USED_IN_DESIGN_REVIEW_GROUPS = [
  { project: 'Alpha — Weld frame', prefix: 'WF', count: 15 },
  { project: 'Beta — Door latch', prefix: 'DL', count: 20 },
  { project: 'Gamma — Hydraulic skid', prefix: 'HY', count: 15 },
].map((g) => ({
  project: g.project,
  docs: Array.from({ length: g.count }, (_, j) => `${g.prefix}-WP-${String(j + 1).padStart(2, '0')}`),
}));

const USED_IN_DESIGN_REVIEW_DOCS = USED_IN_DESIGN_REVIEW_GROUPS.flatMap((g) => g.docs);
const USED_IN_DESIGN_REVIEW_TOTAL = USED_IN_DESIGN_REVIEW_DOCS.length;
const USED_IN_CHIP_PREVIEW = 3;
const USED_IN_MORE_COUNT = USED_IN_DESIGN_REVIEW_TOTAL - USED_IN_CHIP_PREVIEW;

const usedInChipStyle = {
  fontSize: 11,
  fontWeight: 500,
  background: C.blueLight,
  color: C.blue,
  borderRadius: 20,
  padding: '2px 9px',
  whiteSpace: 'nowrap',
};

function UsedInDesignReviewDocPopover({ open, onClose, title, flatDocs, grouped }) {
  const [q, setQ] = useState('');
  useEffect(() => {
    if (open) setQ('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  const filteredFlat = useMemo(() => {
    if (!flatDocs || grouped) return flatDocs;
    const qq = q.trim().toLowerCase();
    if (!qq) return flatDocs;
    return flatDocs.filter((d) => d.toLowerCase().includes(qq));
  }, [flatDocs, q, grouped]);

  const filteredGrouped = useMemo(() => {
    if (!grouped) return null;
    const qq = q.trim().toLowerCase();
    if (!qq) return grouped;
    return grouped
      .map((g) => ({
        project: g.project,
        docs: g.docs.filter((d) => d.toLowerCase().includes(qq)),
      }))
      .filter((g) => g.docs.length > 0);
  }, [grouped, q]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
          width: '100%',
          maxWidth: 420,
          maxHeight: 'min(72vh, 520px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '14px 16px 10px',
          borderBottom: `1px solid ${C.cardBdr}`,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.muted,
              padding: 4,
              borderRadius: 4,
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.cardBdr}` }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#FAFAFA',
            border: `1px solid ${C.cardBdr}`,
            borderRadius: 8,
            padding: '6px 10px',
          }}
          >
            <Search size={14} color={C.muted} />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter documents…"
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 13,
                color: C.text,
                width: '100%',
              }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 16px' }}>
          {grouped && filteredGrouped ? (
            filteredGrouped.map((g) => (
              <div key={g.project} style={{ marginBottom: 18 }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                }}
                >
                  {g.project}
                  <span style={{ fontWeight: 500, marginLeft: 6 }}>({g.docs.length})</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.text, lineHeight: 1.55 }}>
                  {g.docs.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.text, lineHeight: 1.55 }}>
              {(filteredFlat || []).map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolLibraryUsedInDesignReviewDemo() {
  const [popover, setPopover] = useState(null);

  const openFlat = (title) => setPopover({
    title,
    flatDocs: USED_IN_DESIGN_REVIEW_DOCS,
    grouped: null,
  });

  const openGrouped = (title) => setPopover({
    title,
    flatDocs: null,
    grouped: USED_IN_DESIGN_REVIEW_GROUPS.map((g) => ({ project: g.project, docs: g.docs })),
  });

  const closePopover = () => setPopover(null);

  const demoRow = (label, usedInCell) => (
    <div
      key={label}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '10px 16px',
        borderBottom: `1px solid ${C.cardBdr}`,
      }}
    >
      <Sparkles size={14} color={C.blue} style={{ flexShrink: 0, marginTop: 2 }} />
      <span style={{
        fontSize: 13,
        fontWeight: 600,
        color: C.text,
        minWidth: 200,
        maxWidth: 260,
        lineHeight: 1.35,
      }}
      >
        {label}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>{usedInCell}</div>
      <div style={{ width: 22, flexShrink: 0 }} title="Demo row — no delete" />
    </div>
  );

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        background: '#fff',
        border: `1px solid ${C.cardBdr}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 16px',
          borderBottom: `1px solid ${C.cardBdr}`,
          background: '#FAFAFA',
        }}
        >
          <div style={{ width: 14, flexShrink: 0 }} />
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: C.muted,
            minWidth: 200,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
          >
            Pattern
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: C.muted,
            flex: 1,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
          >
            Used in
          </span>
          <div style={{ width: 22, flexShrink: 0 }} />
        </div>

        {demoRow('A — All chips (wrap)', (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {USED_IN_DESIGN_REVIEW_DOCS.map((docName) => (
              <span key={docName} style={usedInChipStyle}>{docName}</span>
            ))}
          </div>
        ))}

        {demoRow('B — Three chips + “+N more”', (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {USED_IN_DESIGN_REVIEW_DOCS.slice(0, USED_IN_CHIP_PREVIEW).map((docName) => (
              <span key={docName} style={usedInChipStyle}>{docName}</span>
            ))}
            <button
              type="button"
              onClick={() => openFlat('Documents using this tool')}
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: '#fff',
                color: C.blue,
                border: `1px solid rgba(79, 110, 247, 0.45)`,
                borderRadius: 20,
                padding: '2px 10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              +
              {USED_IN_MORE_COUNT}
              {' '}
              more
            </button>
          </div>
        ))}

        {demoRow('C — Count + list', (
          <button
            type="button"
            onClick={() => openFlat('Documents using this tool')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
              color: C.blue,
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            {USED_IN_DESIGN_REVIEW_TOTAL}
            {' '}
            documents
          </button>
        ))}

        {demoRow('D — Icon + badge', (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={18} color={C.blue} strokeWidth={1.75} />
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                background: C.blueLight,
                color: C.blue,
                borderRadius: 8,
                padding: '2px 8px',
                minWidth: 24,
                textAlign: 'center',
              }}
              >
                {USED_IN_DESIGN_REVIEW_TOTAL}
              </span>
            </div>
            <button
              type="button"
              onClick={() => openFlat('Documents using this tool')}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.sub,
                background: '#F3F4F6',
                border: `1px solid ${C.cardBdr}`,
                borderRadius: 6,
                padding: '4px 10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              View
            </button>
          </div>
        ))}

        {demoRow('E — Grouped by project', (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.text, lineHeight: 1.45 }}>
              {USED_IN_DESIGN_REVIEW_GROUPS.map((g, i) => (
                <span key={g.project}>
                  {i > 0 ? ' · ' : ''}
                  <span style={{ fontWeight: 600 }}>{g.project.split(' —')[0]}</span>
                  {' '}
                  <span style={{ color: C.muted }}>({g.docs.length})</span>
                </span>
              ))}
            </span>
            <button
              type="button"
              onClick={() => openGrouped('Documents by project')}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.blue,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                padding: 0,
              }}
            >
              View all
            </button>
          </div>
        ))}
      </div>

      <UsedInDesignReviewDocPopover
        open={popover != null}
        onClose={closePopover}
        title={popover?.title ?? ''}
        flatDocs={popover?.flatDocs}
        grouped={popover?.grouped}
      />
    </div>
  );
}

/** Dashed empty / “import” target for megadocument sections (prototype only). */
function EmptyImportPanel({
  title,
  description,
  browseLabel = 'Browse files',
  hint = 'or drag files here',
  inputAccept,
  onFilesSelected,
  secondaryLabel,
  onSecondaryClick,
  /** When false, no file picker — use primary CTA only (e.g. Create project). */
  showFilePicker = true,
  /** Shown in the circle when showFilePicker is false (defaults to parts-style icon). */
  leadIcon,
  ctaLabel,
  onCtaClick,
  /** Multiple CTAs when showFilePicker is false (e.g. home empty state). */
  ctaButtons,
  maxWidth = 440,
}) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const deliverFiles = (files) => {
    if (files?.length) onFilesSelected?.(files);
  };

  const shellProps = showFilePicker
    ? {
        onDragEnter: (e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        },
        onDragOver: (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'copy';
        },
        onDragLeave: (e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDragActive(false);
        },
        onDrop: (e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
          deliverFiles(e.dataTransfer?.files);
        },
      }
    : {};

  return (
    <div
      {...shellProps}
      style={{
        border: `2px dashed ${dragActive ? C.blue : C.cardBdr}`,
        borderRadius: 12,
        padding: '36px 28px',
        textAlign: 'center',
        background: dragActive ? '#F5F7FF' : '#FAFBFC',
        maxWidth,
        margin: '0 auto',
        transition: 'border-color 0.15s ease, background 0.15s ease',
      }}
    >
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: C.blueLight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
      }}
      >
        {showFilePicker ? (
          <Upload size={22} color={C.blue} aria-hidden />
        ) : (
          leadIcon ?? <Boxes size={22} color={C.blue} aria-hidden />
        )}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>{title}</div>
      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 20px', lineHeight: 1.55 }}>{description}</p>
      {showFilePicker ? (
        <input
          ref={inputRef}
          type="file"
          accept={inputAccept}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            deliverFiles(e.target.files);
            e.target.value = '';
          }}
        />
      ) : null}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
      }}
      >
        {showFilePicker ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: C.blue,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Upload size={16} aria-hidden />
            {browseLabel}
          </button>
        ) : Array.isArray(ctaButtons) && ctaButtons.length > 0 ? (
          ctaButtons.map((btn, i) => {
            const BtnIcon = btn.Icon ?? Plus;
            const isOutline = btn.variant === 'outline';
            return (
              <button
                key={`${btn.label}-${i}`}
                type="button"
                onClick={btn.onClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: isOutline ? '#fff' : C.blue,
                  color: isOutline ? C.blue : '#fff',
                  border: isOutline ? `1px solid rgba(79, 110, 247, 0.45)` : 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <BtnIcon size={16} aria-hidden />
                {btn.label}
              </button>
            );
          })
        ) : ctaLabel && typeof onCtaClick === 'function' ? (
          <button
            type="button"
            onClick={onCtaClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: C.blue,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Plus size={16} aria-hidden />
            {ctaLabel}
          </button>
        ) : null}
        {!showFilePicker && Array.isArray(ctaButtons) && ctaButtons.length > 0 ? null : secondaryLabel && typeof onSecondaryClick === 'function' ? (
          <button
            type="button"
            onClick={onSecondaryClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#fff',
              color: C.blue,
              border: `1px solid rgba(79, 110, 247, 0.45)`,
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Plus size={16} aria-hidden />
            {secondaryLabel}
          </button>
        ) : null}
      </div>
      {hint ? (
        <div style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>{hint}</div>
      ) : null}
    </div>
  );
}

/* ─── Parts Library view (table — CAD / part → documents) ───────────────── */
function PartsLibraryView({
  storageKey = DEFAULT_DES36_STORAGE_KEY,
  navigate,
  editorPrototypePath = DEFAULT_EDITOR_PATH,
  /** Megadocument empty: no sample catalog — dashed placeholder + Create project only. */
  placeholderOnly = false,
  onCreateProject,
}) {
  const [openedDocs, setOpenedDocs] = useState(() => loadToolLibraryState(storageKey).openedDocs || []);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const refresh = () => {
      setOpenedDocs(loadToolLibraryState(storageKey).openedDocs || []);
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [storageKey]);

  if (placeholderOnly) {
    return (
      <div style={{ padding: '40px 44px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: '0 0 22px' }}>Parts Library</h2>
        <EmptyImportPanel
          showFilePicker={false}
          title="No parts in Library"
          description="To add parts to your library, create projects and upload parts. They will automatically appear here and can be reused in other documents."
          ctaLabel="Create project"
          onCtaClick={onCreateProject}
          hint=""
        />
      </div>
    );
  }

  const rowsAll = useMemo(() => allPartLibraryRows(PART_ASSEMBLY_CATALOG), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rowsAll;
    return rowsAll.filter((r) => {
      if (r.assemblyName.toLowerCase().includes(q)) return true;
      if (r.partLabel.toLowerCase().includes(q)) return true;
      if (r.cadFile.toLowerCase().includes(q)) return true;
      return r.treeDocNames.some((d) => d.toLowerCase().includes(q));
    });
  }, [rowsAll, search]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc, r) => {
      const k = r.assemblyName;
      if (!acc[k]) acc[k] = [];
      acc[k].push(r);
      return acc;
    }, {});
  }, [filtered]);

  const docChipStyle = {
    fontSize: 11,
    fontWeight: 500,
    background: C.blueLight,
    color: C.blue,
    borderRadius: 20,
    padding: '2px 9px',
    whiteSpace: 'nowrap',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  };

  const usedInDocs = (row) => {
    const s = new Set(row.treeDocNames || []);
    (openedDocs || []).forEach((d) => s.add(d));
    return [...s];
  };

  return (
    <div style={{ padding: '40px 44px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>Parts Library</h2>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5, maxWidth: 640 }}>
            You don&apos;t upload CAD here. Create or open a document, attach or link a CAD file there, and this library
            will reflect parts, files, and which documents use them. The rows below include sample assemblies for layout;
            <strong style={{ color: C.text, fontWeight: 600 }}> Used in </strong>
            fills in as you work in documents.
          </p>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#fff',
        border: `1px solid ${C.cardBdr}`,
        borderRadius: 8,
        padding: '7px 12px',
        marginBottom: 28,
        maxWidth: 380,
      }}
      >
        <Search size={14} color={C.muted} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search parts, CAD files, assemblies, documents…"
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 13,
            color: C.text,
            width: '100%',
          }}
        />
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted, fontSize: 14 }}>
          No rows match your search.
        </div>
      ) : null}

      {Object.entries(grouped).map(([assemblyName, asmRows]) => (
        <div key={assemblyName} style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            marginBottom: 8,
          }}
          >
            {assemblyName}
          </div>
          <div style={{
            background: '#fff',
            border: `1px solid ${C.cardBdr}`,
            borderRadius: 10,
            overflow: 'hidden',
          }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '6px 16px',
              borderBottom: `1px solid ${C.cardBdr}`,
              background: '#FAFAFA',
            }}
            >
              <div style={{ width: 14, flexShrink: 0 }} />
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.muted,
                flex: '0 0 22%',
                minWidth: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
              >
                Part
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.muted,
                flex: '0 0 20%',
                minWidth: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
              >
                CAD file
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.muted,
                flex: 1,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
              >
                Used in
              </span>
            </div>
            {asmRows.map((row, i) => (
              <div
                key={row.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 16px',
                  borderBottom: i < asmRows.length - 1 ? `1px solid ${C.cardBdr}` : 'none',
                }}
              >
                <Boxes size={14} color={C.muted} style={{ flexShrink: 0 }} aria-hidden />
                <div style={{ flex: '0 0 22%', minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{row.partLabel}</span>
                </div>
                <div style={{ flex: '0 0 20%', minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: C.sub,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    }}
                  >
                    {row.cadFile}
                  </span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 6, minWidth: 0 }}>
                  {usedInDocs(row).length === 0 ? (
                    <span style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>Not used in any document</span>
                  ) : (
                    usedInDocs(row).map((docName) => (
                      <button
                        key={`${row.id}:${docName}`}
                        type="button"
                        style={docChipStyle}
                        title={`Open ${docName}`}
                        onClick={() => navigate(editorHref(docName, false, editorPrototypePath))}
                      >
                        {docName}
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Tool Library view ─────────────────────────────────────────────────── */
function ToolLibraryView({
  storageKey = DEFAULT_DES36_STORAGE_KEY,
  showUsedInDesignReview = false,
  preferEmptyToolLibrary = false,
  requestOpenAddToolModal = 0,
}) {
  const pickToolsFromStorage = (lib) => {
    if (lib.toolLibrary?.length) return lib.toolLibrary;
    return preferEmptyToolLibrary ? [] : [...TOOLS_BOM_INITIAL];
  };
  // Read real tools + doc-usage from localStorage (written by the editor)
  const [tools, setTools] = useState(() => {
    const lib = loadToolLibraryState(storageKey);
    return pickToolsFromStorage(lib);
  });
  // openedDocs: every document name that has ever been opened in the editor
  const [openedDocs, setOpenedDocs] = useState(() => loadToolLibraryState(storageKey).openedDocs || []);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [addToolModalOpen, setAddToolModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const addInputRef = useRef(null);
  const addToolModalInputRef = useRef(null);
  const editInputRef = useRef(null);

  // Refresh from localStorage on mount and on window focus (user may have come back from the editor)
  useEffect(() => {
    const refresh = () => {
      const s = loadToolLibraryState(storageKey);
      setTools(pickToolsFromStorage(s));
      setOpenedDocs(s.openedDocs || []);
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [storageKey, preferEmptyToolLibrary]);

  // All tools appear in every opened document — return the full openedDocs list for every tool
  const usedInForTool = () => openedDocs;

  const filtered = tools.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  // Flat list (no categories from the editor data, unless added manually)
  const grouped = filtered.reduce((acc, t) => {
    const cat = t.category || 'All tools';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  const confirmRemoveTool = (id) => setConfirmDeleteId(id);

  const removeTool = (id) => {
    setTools(prev => {
      const next = prev.filter(t => t.id !== id);
      saveToolLibraryState(s => ({ ...s, toolLibrary: next }), storageKey);
      return next;
    });
    setConfirmDeleteId(null);
  };

  const startEdit = (tool) => {
    setEditingId(tool.id);
    setEditValue(tool.name);
    setTimeout(() => { editInputRef.current?.focus(); editInputRef.current?.select(); }, 0);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && editingId) {
      setTools(prev => {
        const next = prev.map(t => t.id === editingId ? { ...t, name: trimmed } : t);
        saveToolLibraryState(s => ({ ...s, toolLibrary: next }), storageKey);
        return next;
      });
    }
    setEditingId(null);
    setEditValue('');
  };

  const commitAdd = () => {
    const name = newName.trim();
    if (name) {
      setTools(prev => {
        const next = [...prev, { id: `t-${Date.now()}`, name }];
        saveToolLibraryState(s => ({ ...s, toolLibrary: next }), storageKey);
        return next;
      });
      setAddToolModalOpen(false);
    }
    setNewName('');
    setAdding(false);
  };

  const openAddToolModal = useCallback(() => {
    setNewName('');
    setAddToolModalOpen(true);
    setTimeout(() => addToolModalInputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (requestOpenAddToolModal <= 0) return;
    openAddToolModal();
  }, [requestOpenAddToolModal, openAddToolModal]);

  const toolToDelete = confirmDeleteId ? tools.find(t => t.id === confirmDeleteId) : null;

  return (
    <div style={{ padding: '40px 44px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>Tool Library</h2>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            Manage the tools available across all your projects and documents.
          </p>
        </div>
        {!(preferEmptyToolLibrary && tools.length === 0) ? (
          <button
            type="button"
            onClick={() => {
              if (preferEmptyToolLibrary) openAddToolModal();
              else {
                setAdding(true);
                setTimeout(() => addInputRef.current?.focus(), 0);
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: C.blue, color: '#fff', border: 'none',
              borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Plus size={14} />
            Add tool
          </button>
        ) : null}
      </div>

      {showUsedInDesignReview && !(preferEmptyToolLibrary && tools.length === 0) ? (
        <ToolLibraryUsedInDesignReviewDemo />
      ) : null}

      {preferEmptyToolLibrary && tools.length === 0 ? (
        <div style={{ marginBottom: 28 }}>
          <EmptyImportPanel
            showFilePicker={false}
            leadIcon={<Wrench size={22} color={C.blue} aria-hidden />}
            title="No tools in library"
            description="To add a tool, press the Add tool button below."
            ctaLabel="Add tool"
            onCtaClick={openAddToolModal}
            hint=""
          />
        </div>
      ) : null}

      {/* Search */}
      {!(preferEmptyToolLibrary && tools.length === 0) ? (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#fff', border: `1px solid ${C.cardBdr}`,
        borderRadius: 8, padding: '7px 12px', marginBottom: 28, maxWidth: 380,
      }}>
        <Search size={14} color={C.muted} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tools…"
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: C.text, width: '100%',
          }}
        />
      </div>
      ) : null}

      {/* Add tool inline row (non–empty-library prototypes only) */}
      {adding && !preferEmptyToolLibrary && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', border: `1px solid ${C.blue}`,
          borderRadius: 8, padding: '10px 14px', marginBottom: 20,
          boxShadow: `0 0 0 3px ${C.blueLight}`,
        }}>
          <Wrench size={15} color={C.blue} />
          <input
            ref={addInputRef}
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitAdd();
              if (e.key === 'Escape') { setAdding(false); setNewName(''); }
            }}
            placeholder="Tool name…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: C.text,
            }}
          />
          <button
            type="button"
            onClick={commitAdd}
            style={{
              background: C.blue, color: '#fff', border: 'none',
              borderRadius: 6, padding: '5px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setNewName(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tool groups */}
      {Object.entries(grouped).map(([category, categoryTools]) => (
        <div key={category} style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase',
            letterSpacing: '0.07em', marginBottom: 8,
          }}>
            {category}
          </div>
          <div style={{
            background: '#fff', border: `1px solid ${C.cardBdr}`,
            borderRadius: 10, overflow: 'hidden',
          }}>
            {/* Column headers */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '6px 16px', borderBottom: `1px solid ${C.cardBdr}`,
              background: '#FAFAFA',
            }}>
              <div style={{ width: 14, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, minWidth: 200, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tool</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, flex: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Used in</span>
              <div style={{ width: 22, flexShrink: 0 }} />
            </div>
            {categoryTools.map((tool, i) => (
              <div
                key={tool.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px',
                  borderBottom: i < categoryTools.length - 1 ? `1px solid ${C.cardBdr}` : 'none',
                }}
              >
                <Wrench size={14} color={C.muted} style={{ flexShrink: 0 }} />
                {editingId === tool.id ? (
                  <input
                    ref={editInputRef}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') { setEditingId(null); setEditValue(''); }
                    }}
                    style={{
                      fontSize: 14, color: C.text, minWidth: 200, maxWidth: 260,
                      border: 'none', borderBottom: `2px solid ${C.blue}`,
                      outline: 'none', background: 'transparent',
                      padding: '0 0 1px', fontFamily: 'inherit',
                    }}
                  />
                ) : (
                  <span
                    onDoubleClick={() => startEdit(tool)}
                    title="Double-click to rename"
                    style={{ fontSize: 14, color: C.text, minWidth: 200, cursor: 'text' }}
                  >
                    {tool.name}
                  </span>
                )}
                {/* Used in documents */}
                <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {usedInForTool(tool.id).length === 0 ? (
                    <span style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>Not used in any document</span>
                  ) : usedInForTool(tool.id).map(docName => (
                    <span
                      key={docName}
                      style={{
                        fontSize: 11, fontWeight: 500,
                        background: C.blueLight, color: C.blue,
                        borderRadius: 20, padding: '2px 9px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {docName}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => confirmRemoveTool(tool.id)}
                  title="Remove tool"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: C.muted, padding: 4, borderRadius: 4,
                    display: 'flex', alignItems: 'center',
                    opacity: 0.5, flexShrink: 0,
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {tools.length === 0 && !preferEmptyToolLibrary ? (
        <div style={{ padding: '60px 0' }}>
          <div style={{ textAlign: 'center', color: C.muted, fontSize: 14 }}>
            <Library size={32} color={C.muted} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ marginBottom: 6, fontWeight: 500, color: C.sub }}>No tools yet</div>
            <div style={{ fontSize: 13 }}>
              Open a document and add tools to steps — they&apos;ll appear here automatically.
            </div>
          </div>
        </div>
      ) : null}
      {tools.length > 0 && filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: C.muted, fontSize: 14,
        }}>
          No tools match your search.
        </div>
      )}

      {/* Add tool modal (empty / megadocument-first-login tool library) */}
      {addToolModalOpen && (
        <div
          role="presentation"
          onClick={() => { setAddToolModalOpen(false); setNewName(''); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            role="dialog"
            aria-labelledby="add-tool-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 12,
              padding: '28px 28px 22px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
              maxWidth: 400, width: '90%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Wrench size={20} color={C.blue} aria-hidden />
              <span id="add-tool-modal-title" style={{ fontSize: 17, fontWeight: 700, color: C.text }}>
                Add tool
              </span>
            </div>
            <label htmlFor="add-tool-modal-name" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>
              Tool name
            </label>
            <input
              id="add-tool-modal-name"
              ref={addToolModalInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitAdd();
                if (e.key === 'Escape') { setAddToolModalOpen(false); setNewName(''); }
              }}
              placeholder='e.g. Torque wrench 3/8"'
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${C.cardBdr}`,
                fontSize: 14,
                color: C.text,
                fontFamily: 'inherit',
                marginBottom: 22,
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setAddToolModalOpen(false); setNewName(''); }}
                style={{
                  padding: '8px 18px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                  border: `1px solid ${C.cardBdr}`, background: '#fff',
                  color: C.text, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitAdd}
                style={{
                  padding: '8px 18px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                  border: 'none', background: C.blue,
                  color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Add tool
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {toolToDelete && (
        <div
          onClick={() => setConfirmDeleteId(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 12,
              padding: '28px 28px 22px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
              maxWidth: 380, width: '90%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Trash2 size={18} color="#EF4444" />
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Delete tool?</span>
            </div>
            <p style={{ fontSize: 14, color: C.sub, margin: '0 0 22px', lineHeight: 1.5 }}>
              Deleting <strong style={{ color: C.text }}>{toolToDelete.name || 'this tool'}</strong> will remove it from all documents. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  padding: '8px 18px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                  border: `1px solid ${C.cardBdr}`, background: '#fff',
                  color: C.text, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => removeTool(confirmDeleteId)}
                style={{
                  padding: '8px 18px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                  border: 'none', background: '#EF4444',
                  color: '#fff', cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
/** Stable hash for demo variety (same doc → same fake card). */
function hashDocSeed(doc) {
  const str = `${doc.id}\0${doc.name || ''}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function clonePrdCard(p) {
  const {
    footerDocCount,
    operationCount: oc,
    stateLabel: rawState,
    lastUpdated,
    documentLastEdited,
    accentKey: rawAccent,
    cadFileLabel,
    cadVersion,
    cadChangeSummary,
    cadDiffAdded,
    cadDiffRemoved,
    cadDiffModified,
  } = p;
  const accentKey = rawAccent === 'needs_review' ? 'in_sync' : rawAccent;
  const stateLabel = rawState === 'Needs review' ? 'In sync' : rawState;
  const toDiff = (n) => {
    if (n == null || n === '') return undefined;
    const v = Number(n);
    return Number.isFinite(v) ? v : undefined;
  };
  const da = toDiff(cadDiffAdded);
  const dr = toDiff(cadDiffRemoved);
  const dm = toDiff(cadDiffModified);
  const trimmedDocEdited = documentLastEdited != null && String(documentLastEdited).trim() !== ''
    ? String(documentLastEdited).trim()
    : null;
  const cadRecency = lastUpdated != null && String(lastUpdated).trim() !== '' && lastUpdated !== '—'
    ? String(lastUpdated).trim()
    : null;
  /** Legacy prdCard blobs (pre–document-last-edited) only had lastUpdated; reuse for Edited line. */
  const documentLastEditedResolved = trimmedDocEdited ?? cadRecency;
  return {
    stateLabel,
    lastUpdated,
    ...(documentLastEditedResolved ? { documentLastEdited: documentLastEditedResolved } : {}),
    accentKey,
    operationCount: oc ?? footerDocCount ?? 1,
    ...(cadFileLabel != null && cadFileLabel !== '' ? { cadFileLabel } : {}),
    ...(cadVersion != null && String(cadVersion).trim() !== '' ? { cadVersion: String(cadVersion).trim() } : {}),
    ...(cadChangeSummary != null && String(cadChangeSummary).trim() !== ''
      ? { cadChangeSummary: String(cadChangeSummary).trim() }
      : {}),
    ...(da !== undefined ? { cadDiffAdded: da } : {}),
    ...(dr !== undefined ? { cadDiffRemoved: dr } : {}),
    ...(dm !== undefined ? { cadDiffModified: dm } : {}),
  };
}

function assemblyBaseFromDocName(name) {
  return (name || 'Assembly').replace(/\s+—\s+.*$/, '').trim() || 'Assembly';
}

/** Ensure every resolved card shows which CAD file / source it uses (prototype + legacy data). */
function withCadFileLabel(doc, prd) {
  if (prd.cadFileLabel) return prd;
  const base = assemblyBaseFromDocName(doc.name);
  if (prd.accentKey === 'no_cad') {
    return { ...prd, cadFileLabel: 'No CAD file linked' };
  }
  return { ...prd, cadFileLabel: `${base.replace(/\s+/g, '_')}.stp` };
}

/** Rotating fake library cards for demos — sync states, operation counts, CAD labels. */
const FAKE_PRD_PRESETS = [
  {
    stateLabel: 'In sync',
    lastUpdated: 'Just now',
    documentLastEdited: '2d ago',
    accentKey: 'in_sync',
    operationCount: 8,
    cadFileLabel: 'motor_mount_v2.stp',
  },
  {
    stateLabel: 'Auto-updated',
    lastUpdated: '14m ago',
    documentLastEdited: 'Yesterday 4:20p',
    accentKey: 'auto_updated',
    operationCount: 14,
    cadFileLabel: 'motor_mount_v2.stp',
    cadVersion: 'V22',
    cadDiffAdded: 34,
    cadDiffRemoved: 2,
    cadDiffModified: 45,
    cadChangeSummary: 'Base plate: added M4 clearance pattern; two hole mates updated to fixed references.',
  },
  {
    stateLabel: 'In sync',
    lastUpdated: 'Yesterday',
    documentLastEdited: 'Today 8:05a',
    accentKey: 'in_sync',
    operationCount: 22,
    cadFileLabel: 'pump_housing.step',
  },
  {
    stateLabel: 'In sync',
    lastUpdated: 'Wed 9:12a',
    documentLastEdited: 'Tue 2:40p',
    accentKey: 'in_sync',
    operationCount: 11,
    cadFileLabel: 'hydraulic_manifold.iges',
  },
  {
    stateLabel: 'Auto-updated',
    lastUpdated: '3h ago',
    documentLastEdited: 'Mon',
    accentKey: 'auto_updated',
    operationCount: 19,
    cadFileLabel: 'chassis_assembly_A.stp',
    cadVersion: 'V19',
    cadDiffAdded: 8,
    cadDiffRemoved: 0,
    cadDiffModified: 21,
    cadChangeSummary: 'Rear crossmember sketch driven by new global variable; 4 derived features rebuilt.',
  },
  {
    stateLabel: 'In sync',
    lastUpdated: '2d ago',
    documentLastEdited: '1h ago',
    accentKey: 'in_sync',
    operationCount: 12,
    cadFileLabel: 'bracket_1045.step',
  },
  {
    stateLabel: 'In sync',
    lastUpdated: 'Jan 8',
    documentLastEdited: 'Jan 6',
    accentKey: 'in_sync',
    operationCount: 17,
    cadFileLabel: 'gearbox_main.f3d',
  },
  {
    stateLabel: 'No CAD linked',
    lastUpdated: '—',
    documentLastEdited: 'Fri 11:02a',
    accentKey: 'no_cad',
    operationCount: 5,
    cadFileLabel: 'No CAD file linked',
  },
  {
    stateLabel: 'In sync',
    lastUpdated: '6h ago',
    documentLastEdited: '33m ago',
    accentKey: 'in_sync',
    operationCount: 16,
    cadFileLabel: 'weldment_frame_v4.stp',
  },
  {
    stateLabel: 'Auto-updated',
    lastUpdated: 'Today',
    documentLastEdited: 'Last week',
    accentKey: 'auto_updated',
    operationCount: 6,
    cadFileLabel: 'weldment_frame_v4.stp',
    cadVersion: 'V31',
    cadDiffAdded: 3,
    cadDiffRemoved: 5,
    cadDiffModified: 12,
    cadChangeSummary: 'Tube cut list lengths recalculated; one corner gusset suppressed pending QC sign-off.',
  },
  {
    stateLabel: 'Auto-updated',
    lastUpdated: '52m ago',
    documentLastEdited: 'Today 9:18a',
    accentKey: 'auto_updated',
    operationCount: 9,
    cadFileLabel: 'valve_block.iges',
    cadVersion: 'V7',
    cadDiffAdded: 1,
    cadDiffRemoved: 0,
    cadDiffModified: 6,
    cadChangeSummary: 'Oil gallery diameter +0.5 mm; downstream hole wizard instances refreshed.',
  },
  {
    stateLabel: 'Auto-updated',
    lastUpdated: '1h ago',
    documentLastEdited: '3d ago',
    accentKey: 'auto_updated',
    operationCount: 20,
    cadFileLabel: 'valve_block.iges',
    cadVersion: 'V8',
    cadDiffAdded: 22,
    cadDiffRemoved: 4,
    cadDiffModified: 18,
    cadChangeSummary: 'Imported STEP replaced body 2 of 3; mate connectors on body 1 reattached automatically.',
  },
  {
    stateLabel: 'No CAD linked',
    lastUpdated: '—',
    documentLastEdited: 'Thu 3:15p',
    accentKey: 'no_cad',
    operationCount: 4,
    cadFileLabel: 'No CAD file linked',
  },
  {
    stateLabel: 'In sync',
    lastUpdated: '4d ago',
    documentLastEdited: '5d ago',
    accentKey: 'in_sync',
    operationCount: 13,
    cadFileLabel: 'door_latch_asm.step',
  },
];

/** Workflow 2: every doc on DES-36 uses PRD cards; fake rich variety when prdCard was never stored. */
function resolvePrdCard(doc, prdOnboarding) {
  if (!prdOnboarding) return null;
  const raw = doc.prdCard
    ? clonePrdCard(doc.prdCard)
    : clonePrdCard(FAKE_PRD_PRESETS[hashDocSeed(doc) % FAKE_PRD_PRESETS.length]);
  return withCadFileLabel(doc, raw);
}

function PrdDocTableEditedUnderName({ prd }) {
  if (!prd?.documentLastEdited) return null;
  const v = String(prd.documentLastEdited).trim();
  if (!v || v === '—') return null;
  return (
    <div
      title="Last time this document was edited"
      style={{ fontSize: 10, color: '#6B7280', marginTop: 4, lineHeight: 1.35 }}
    >
      <span style={{ fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.03em' }}>Edited</span>
      {' · '}
      <span style={{ fontWeight: 500 }}>{v}</span>
    </div>
  );
}

function PrdDocTableStatusStack({ prd }) {
  if (!prd) return '—';
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 6,
      minWidth: 0,
    }}
    >
      <Des36PrdDocStatusTag
        stateLabel={prd.stateLabel}
        lastUpdated={prd.lastUpdated}
        accentKey={prd.accentKey}
        cadVersion={prd.cadVersion}
      />
      <Des36PrdDocCadChangeInline
        accentKey={prd.accentKey}
        cadDiffAdded={prd.cadDiffAdded}
        cadDiffRemoved={prd.cadDiffRemoved}
        cadDiffModified={prd.cadDiffModified}
        cadChangeSummary={prd.cadChangeSummary}
      />
    </div>
  );
}

export default function ProjectHome({
  editorPrototypePath = DEFAULT_EDITOR_PATH,
  allowDeleteProjectsAndDocuments = false,
  prdOnboarding = false,
  storageKey = DEFAULT_DES36_STORAGE_KEY,
  /** When true (document-connection sandbox only), enable doc↔doc links + graph persisted under storageKey. */
  documentConnectionSandbox = false,
  /** When false, hide the top “How to use this sandbox” bar (document-connection mode only). */
  documentConnectionShowSandboxBanner = true,
  /** When false, hide the sidebar Parts section and Parts library view (not used with projectConnectionGraph). */
  showPartsSidebarSection = true,
  /** When false, hide PRD document card footers (operations + Link…) and per-card / list-row link affordances. */
  showDocumentCardFooter = true,
  /** When false, hide the sidebar “Document links” entry and the full-screen links workspace (document-connection mode). */
  showDocumentLinksInSidebar = true,
  /** When true (DES 36 Onboarding 2), seed mock weld project + connection graph tab inside the project. */
  projectConnectionGraph = false,
  /**
   * Merged packages: `mega-editor` opens combined editor (?megaOf=…).
   * `toc-hub` opens a table-of-contents page (Megadocument 2 / CEO model).
   */
  mergedPackageNavigation = 'mega-editor',
  /** Section heading above merged / package cards (home + project). */
  mergedDocumentsSectionTitle = 'Merged documents',
  /** Megadocument 2: show Tool Library “Used in” pattern comparison rows for design review. */
  toolLibraryUsedInDesignReview = false,
  /** Seed a starter package when this prototype has no saved data yet. */
  seedDocumentPackageSample = false,
  /**
   * Megadocument empty-state prototype: when localStorage has no saved blob yet, start with no projects,
   * documents, or seeded tool rows. After the user adds data, the normal persist slot applies.
   */
  megadocumentEmptyState = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const showDocLinkOnCards = documentConnectionSandbox && showDocumentCardFooter;

  const openPartsMapForCad = useCallback((cadLabel) => {
    if (projectConnectionGraph || !showPartsSidebarSection) return;
    const id = partsAssemblyIdForCadLabel(cadLabel);
    if (PART_ASSEMBLY_CATALOG.some((a) => a.id === id)) setPartsAssemblyId(id);
    setView('parts-library');
  }, [projectConnectionGraph, showPartsSidebarSection]);

  const savedSnapshot = loadState(storageKey);
  const saved = megadocumentEmptyState && savedSnapshot == null ? null : (savedSnapshot || {});
  let onboarding2Merged = null;
  try {
    onboarding2Merged = projectConnectionGraph ? applyOnboarding2MockMerge(savedSnapshot) : null;
  } catch {
    onboarding2Merged = projectConnectionGraph ? applyOnboarding2MockMerge(null) : null;
  }
  const documentPackageSeed = seedDocumentPackageSample ? buildDocumentPackageSeed(savedSnapshot) : null;
  const initialProjects = documentPackageSeed?.projects ?? onboarding2Merged?.projects ?? saved?.projects ?? [];
  const [projects, setProjects]         = useState(Array.isArray(initialProjects) ? initialProjects : []);
  const [selectedId, setSelectedId]     = useState(
    documentPackageSeed?.selectedId ?? onboarding2Merged?.selectedId ?? saved?.selectedId ?? null,
  );
  const [view, setView]                 = useState(documentPackageSeed?.view ?? onboarding2Merged?.view ?? saved?.view ?? 'home'); // 'home' | 'project' | 'merged-package' | 'tool-library' | 'reusable-procedures' | 'parts-library' | 'doc-connections'
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [partsAssemblyId, setPartsAssemblyId] = useState(() => {
    const sid = saved?.partsLibraryAssemblyId;
    return PART_ASSEMBLY_CATALOG.some((a) => a.id === sid) ? sid : DEFAULT_PARTS_ASSEMBLY_ID;
  });
  const [editing, setEditing]           = useState(null);
  const [projectDocs, setProjectDocs]   = useState(() => (
    normalizeProjectDocs(documentPackageSeed?.projectDocs ?? onboarding2Merged?.projectDocs ?? saved?.projectDocs ?? {})
  ));
  const [projectMergedDocs, setProjectMergedDocs] = useState(() => (
    normalizeProjectMergedDocs(documentPackageSeed?.projectMergedDocuments ?? saved?.projectMergedDocuments ?? {})
  ));
  const [projectCadOnboarding, setProjectCadOnboarding] = useState(
    documentPackageSeed?.projectCadOnboarding ?? onboarding2Merged?.projectCadOnboarding ?? saved?.projectCadOnboarding ?? {},
  );
  const [projectMainTab, setProjectMainTab] = useState(
    () => documentPackageSeed?.projectMainTab ?? onboarding2Merged?.projectMainTab ?? saved?.projectMainTab ?? 'documents',
  );
  const [projectDocViewMode, setProjectDocViewMode] = useState(() => (
    saved?.projectDocViewMode && typeof saved.projectDocViewMode === 'object'
      ? saved.projectDocViewMode
      : {}
  ));
  const [projectListRowHover, setProjectListRowHover] = useState(null);
  const [recentListRowHover, setRecentListRowHover] = useState(null);
  const [recentFilesViewMode, setRecentFilesViewMode] = useState(() => (
    saved?.recentFilesViewMode === 'list' || saved?.recentFilesViewMode === 'tiles'
      ? saved.recentFilesViewMode
      : 'tiles'
  ));
  const [showModal, setShowModal]       = useState(false);
  const [newDocName, setNewDocName]     = useState('');
  const [newDocCadName, setNewDocCadName] = useState('');
  const [newDocTemplateId, setNewDocTemplateId] = useState('blank');
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null); // { projectId, doc }
  const [hoveredProjectId, setHoveredProjectId] = useState(null);
  const [collapsedProjectIds, setCollapsedProjectIds] = useState(() => new Set());
  const [addPluginModalOpen, setAddPluginModalOpen] = useState(false);
  /** Increment from home empty “Add tool” so Tool Library opens its add modal after navigation. */
  const [homeToolModalRequest, setHomeToolModalRequest] = useState(0);
  /** Selection keys `projectId\\tdocId` — supports cross-project merge (toc-hub). */
  const [mergeSelectedKeys, setMergeSelectedKeys] = useState(() => new Set());
  /** toc-hub: project row in sidebar highlighted while dragging to create a package under that project. */
  const [mergeSidebarDropProjectId, setMergeSidebarDropProjectId] = useState(null);
  /** Sidebar merged-package row (or main) highlighted while dragging a doc onto it. */
  const [megaAppendDropRowKey, setMegaAppendDropRowKey] = useState(null);
  /** Megadocument 2: selected package for sidebar TOC (not a separate screen). */
  const [tocHubPackage, setTocHubPackage] = useState(null);
  const [hoveredMergedPackageKey, setHoveredMergedPackageKey] = useState(null);
  const [hoveredSidebarDocKey, setHoveredSidebarDocKey] = useState(null);
  const [hoveredSidebarActionKey, setHoveredSidebarActionKey] = useState(null);
  const [packageDocVersionById, setPackageDocVersionById] = useState({});
  const [addFromProjectOpen, setAddFromProjectOpen] = useState(false);
  const [addFromProjectSelection, setAddFromProjectSelection] = useState(() => new Set());
  const [solidworksConnected, setSolidworksConnected] = useState(false);
  const [solidworksConnecting, setSolidworksConnecting] = useState(false);
  const solidworksConnectTimerRef = useRef(null);
  const cadFileInputRef = useRef(null);
  const [documentLinks, setDocumentLinks] = useState(() => (
    Array.isArray(saved?.documentLinks) ? saved.documentLinks : []
  ));
  const [linkSourceDraft, setLinkSourceDraft] = useState(null);
  const [docLinkGuideDismissed, setDocLinkGuideDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('des36_doc_link_guide_dismiss') === '1';
    } catch {
      return false;
    }
  });

  const projectsSafe = Array.isArray(projects) ? projects : [];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projectIdParam = params.get('projectId');
    const viewParam = params.get('view');
    if (!projectIdParam) return;
    if (!projectsSafe.some((p) => p.id === projectIdParam)) return;
    setSelectedId(projectIdParam);
    if (viewParam === 'project') setView('project');
  }, [location.search, projectsSafe]);

  const dismissDocLinkGuide = () => {
    try {
      sessionStorage.setItem('des36_doc_link_guide_dismiss', '1');
    } catch { /* ignore */ }
    setDocLinkGuideDismissed(true);
  };

  const consumeLinkDraft = useCallback(() => setLinkSourceDraft(null), []);

  const goToDocumentLinksFromDoc = useCallback((projectId, docId) => {
    setLinkSourceDraft({ projectId, docId });
    setSelectedId(null);
    setView('doc-connections');
  }, []);

  const loadSampleConnectionDemo = useCallback(() => {
    const ts = Date.now();
    const pid = `p-sample-${ts}`;
    const d1 = `d-${ts}-1`;
    const d2 = `d-${ts}-2`;
    const d3 = `d-${ts}-3`;
    setProjects((prev) => [...prev, { id: pid, name: 'Sample — link demo' }]);
    setProjectDocs((prev) => ({
      ...prev,
      [pid]: [
        { id: d1, name: 'Work instruction — Install' },
        { id: d2, name: 'Drawing — Housing' },
        { id: d3, name: 'Test — Torque check' },
      ],
    }));
    setDocumentLinks([
      { id: `dl-${ts}-a`, fromProjectId: pid, fromDocId: d1, toProjectId: pid, toDocId: d2, kind: 'references' },
      { id: `dl-${ts}-b`, fromProjectId: pid, fromDocId: d2, toProjectId: pid, toDocId: d3, kind: 'verifies' },
    ]);
    setSelectedId(pid);
    setView('doc-connections');
  }, []);

  const simulateImportProjectPack = useCallback(() => {
    const ts = Date.now();
    const pid = `p-import-${ts}`;
    setProjects((prev) => [...prev, { id: pid, name: `Imported package (${new Date().toLocaleDateString()})` }]);
    setProjectDocs((prev) => ({
      ...prev,
      [pid]: [
        { id: `d-${ts}-a`, name: 'Work instruction — draft' },
        { id: `d-${ts}-b`, name: 'BOM excerpt' },
      ],
    }));
    setSelectedId(pid);
    setView('project');
    if (prdOnboarding) {
      setProjectCadOnboarding((prev) => ({
        ...prev,
        [pid]: { ...(prev[pid] || {}), phase: 'complete' },
      }));
    }
  }, [prdOnboarding]);

  /** Prototype: add two docs + one merged package row (toc-hub) without using the merge picker. */
  const simulateMergedPackageImport = useCallback(() => {
    const ts = Date.now();
    const pid = `p-pkg-${ts}`;
    const d1 = `d-${ts}-1`;
    const d2 = `d-${ts}-2`;
    const mid = `m-${ts}`;
    const editorDocName = 'Merged package — import';
    setProjects((prev) => [...prev, { id: pid, name: `Package import (${new Date().toLocaleDateString()})` }]);
    setProjectDocs((prev) => ({
      ...prev,
      [pid]: [
        { id: d1, name: 'Package member — Work instruction' },
        { id: d2, name: 'Package member — Drawing' },
      ],
    }));
    setProjectMergedDocs((prev) => ({
      ...prev,
      [pid]: [...mergedDocsList(prev, pid), {
        id: mid,
        editorDocName,
        sourceRefs: [
          { projectId: pid, docId: d1 },
          { projectId: pid, docId: d2 },
        ],
        sourceDocIds: [d1, d2],
      }],
    }));
  }, []);

  const simulateImportDocsIntoCurrentProject = useCallback(() => {
    if (!selectedId) return;
    const ts = Date.now();
    setProjectDocs((prev) => ({
      ...prev,
      [selectedId]: [
        ...(prev[selectedId] || []),
        { id: `d-${ts}-a`, name: 'Imported — Work instruction' },
        { id: `d-${ts}-b`, name: 'Imported — Checklist' },
      ],
    }));
  }, [selectedId]);

  const closeAddPluginModal = () => {
    if (solidworksConnectTimerRef.current != null) {
      clearTimeout(solidworksConnectTimerRef.current);
      solidworksConnectTimerRef.current = null;
    }
    setSolidworksConnecting(false);
    setAddPluginModalOpen(false);
  };

  const tryOpenSolidWorksDesktop = () => {
    /* When an add-in registers a custom URL scheme, the OS can open the real SolidWorks process from the browser. */
    try {
      const w = window.open('solidworks://', '_blank', 'noopener,noreferrer');
      if (w) w.opener = null;
    } catch {
      /* ignore */
    }
  };

  const handleConnectSolidworks = () => {
    if (solidworksConnecting || solidworksConnected) return;
    tryOpenSolidWorksDesktop();
    setSolidworksConnecting(true);
    solidworksConnectTimerRef.current = window.setTimeout(() => {
      solidworksConnectTimerRef.current = null;
      setSolidworksConnecting(false);
      setSolidworksConnected(true);
    }, 1600);
  };

  useEffect(() => () => {
    if (solidworksConnectTimerRef.current != null) {
      clearTimeout(solidworksConnectTimerRef.current);
    }
  }, []);

  const editInputRef = useRef(null);

  /* ── persist to localStorage whenever projects/docs/selection change ── */
  useEffect(() => {
    const patch = {
      projects,
      selectedId,
      projectDocs,
      projectMergedDocuments: projectMergedDocs,
      projectCadOnboarding,
      projectDocViewMode,
      recentFilesViewMode,
      partsLibraryAssemblyId: partsAssemblyId,
    };
    if (documentConnectionSandbox) patch.documentLinks = documentLinks;
    if (projectConnectionGraph) patch.projectMainTab = projectMainTab;
    mergePersistState(patch, storageKey);
  }, [projects, selectedId, projectDocs, projectMergedDocs, projectCadOnboarding, projectDocViewMode, recentFilesViewMode, partsAssemblyId, storageKey, documentConnectionSandbox, documentLinks, projectConnectionGraph, projectMainTab]);

  useEffect(() => {
    setProjectListRowHover(null);
    setRecentListRowHover(null);
  }, [selectedId, view]);

  useEffect(() => {
    if (!projectConnectionGraph) return;
    if (selectedId !== MOCK_WELD_FRAME_PROJECT_ID) setProjectMainTab('documents');
  }, [selectedId, projectConnectionGraph]);

  useEffect(() => {
    if (!projectConnectionGraph) return;
    if (view === 'parts-library') setView('project');
  }, [view, projectConnectionGraph]);

  useEffect(() => {
    if (!documentConnectionSandbox) return;
    if (showDocumentLinksInSidebar || showDocumentCardFooter) return;
    if (view === 'doc-connections') setView('home');
  }, [documentConnectionSandbox, showDocumentLinksInSidebar, showDocumentCardFooter, view]);

  useEffect(() => {
    if (mergedPackageNavigation === 'toc-hub') return;
    setMergeSelectedKeys(new Set());
  }, [selectedId, mergedPackageNavigation]);

  /* ── project actions ── */
  const openNewProject = () => {
    const id = `p-${Date.now()}`;
    const project = { id, name: 'Untitled Project' };
    setProjects((prev) => [...prev, project]);
    setSelectedId(id);
    setView('project');
    /* With PRD onboarding enabled, skip the CAD-empty state so the user lands on Documents + Add document. */
    if (prdOnboarding) {
      setProjectCadOnboarding((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), phase: 'complete' },
      }));
    }
  };

  const addProject = openNewProject;

  const commitEdit = () => {
    if (!editing) return;
    const trimmed = editing.value.trim() || 'Untitled Project';
    setProjects(prev => prev.map(p => p.id === editing.id ? { ...p, name: trimmed } : p));
    setEditing(null);
  };

  const startEdit = (project) => {
    setEditing({ id: project.id, value: project.name });
    setTimeout(() => editInputRef.current?.select(), 50);
  };

  const stripDocFromOpenedDocs = (docName) => {
    saveToolLibraryState((s) => ({
      ...s,
      openedDocs: (s.openedDocs || []).filter((n) => n !== docName),
    }), storageKey);
  };

  const performDeleteDocument = (projectId, doc) => {
    const listBefore = projectDocList(projectDocs, projectId);
    const nextList = listBefore.filter((d) => d.id !== doc.id);
    const updatedDocs = { ...projectDocs, [projectId]: nextList };
    setProjectDocs(updatedDocs);
    setProjectMergedDocs((prev) => {
      const nextAll = { ...prev };
      const idSet = new Set(nextList.map((d) => d.id));
      for (const ownerId of Object.keys(nextAll)) {
        const mlist = mergedDocsList(nextAll, ownerId);
        if (!mlist.length) continue;
        const nextMega = [];
        for (const m of mlist) {
          if (Array.isArray(m.sourceRefs) && m.sourceRefs.length) {
            const newRefs = m.sourceRefs.filter(
              (r) => !(r.projectId === projectId && r.docId === doc.id),
            );
            if (newRefs.length < 2) {
              if (m.editorDocName) stripDocFromOpenedDocs(m.editorDocName);
            } else {
              const sameProj = new Set(newRefs.map((r) => r.projectId)).size === 1;
              nextMega.push({
                ...m,
                sourceRefs: newRefs,
                sourceDocIds: sameProj ? newRefs.map((r) => r.docId) : [],
              });
            }
          } else if (ownerId === projectId) {
            const src = (m.sourceDocIds || []).filter((sid) => idSet.has(sid));
            if (src.length < 2) {
              if (m.editorDocName) stripDocFromOpenedDocs(m.editorDocName);
            } else {
              nextMega.push({ ...m, sourceDocIds: src });
            }
          } else {
            nextMega.push(m);
          }
        }
        nextAll[ownerId] = nextMega;
      }
      return nextAll;
    });
    if (documentConnectionSandbox) {
      setDocumentLinks((prev) => prev.filter(
        (L) => !(
          (L.fromProjectId === projectId && L.fromDocId === doc.id)
          || (L.toProjectId === projectId && L.toDocId === doc.id)
        ),
      ));
    }
    stripDocFromOpenedDocs(doc.name);
    setConfirmDeleteDoc(null);
  };

  const renameDocument = (projectId, docId, newName) => {
    const trimmed = (newName ?? '').trim();
    if (!trimmed) return;
    const list = projectDocList(projectDocs, projectId);
    const doc = list.find((d) => d.id === docId);
    if (!doc || doc.name === trimmed) return;
    const oldName = doc.name;
    const updatedDocs = {
      ...projectDocs,
      [projectId]: list.map((d) => (d.id === docId ? { ...d, name: trimmed } : d)),
    };
    setProjectDocs(updatedDocs);
    saveToolLibraryState((s) => ({
      ...s,
      openedDocs: (s.openedDocs || []).map((n) => (n === oldName ? trimmed : n)),
    }), storageKey);
    mergePersistState({ projects, selectedId, projectDocs: updatedDocs }, storageKey);
  };

  const performDeleteProject = (projectId) => {
    const names = projectDocList(projectDocs, projectId).map((d) => d.name);
    if (names.length) {
      saveToolLibraryState((s) => ({
        ...s,
        openedDocs: (s.openedDocs || []).filter((n) => !names.includes(n)),
      }), storageKey);
    }
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setProjectCadOnboarding((prev) => {
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
    setProjectDocs((prev) => {
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
    mergedDocsList(projectMergedDocs, projectId).forEach((m) => {
      if (m.editorDocName) stripDocFromOpenedDocs(m.editorDocName);
    });
    setProjectMergedDocs((prev) => {
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
    if (documentConnectionSandbox) {
      setDocumentLinks((prev) => prev.filter(
        (L) => L.fromProjectId !== projectId && L.toProjectId !== projectId,
      ));
    }
    setProjectDocViewMode((prev) => {
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
    if (selectedId === projectId) {
      setSelectedId(null);
      setView('home');
    }
    setConfirmDeleteProjectId(null);
  };

  /* ── document actions ── */
  const openCreateDocumentModal = useCallback(() => {
    setNewDocName('');
    setNewDocCadName('');
    setNewDocTemplateId('blank');
    setShowModal(true);
  }, []);

  const createBlankDocumentForProject = useCallback((projectId) => {
    if (!projectId) return;
    const ts = Date.now();
    setProjectDocs((prev) => {
      const list = projectDocList(prev, projectId);
      const names = new Set(list.map((d) => String(d.name || '').toLowerCase()));
      let name = 'Untitled Document';
      if (names.has(name.toLowerCase())) {
        let i = 2;
        while (names.has(`untitled document ${i}`)) i += 1;
        name = `Untitled Document ${i}`;
      }
      const doc = {
        id: `d-${ts}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        ...(prdOnboarding ? { prdCard: clonePrdCard(prdDefaultsForTemplate('blank', '', name)) } : {}),
      };
      return {
        ...prev,
        [projectId]: [...list, doc],
      };
    });
  }, [prdOnboarding]);

  const createEmptyPackageForProject = useCallback((projectId) => {
    if (!projectId) return;
    const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const editorDocName = uniqueMergedEditorName(
      projectDocs,
      projectMergedDocs,
      projectId,
      'Untitled Document Package',
    );
    const entry = {
      id,
      editorDocName,
      sourceRefs: [],
      sourceDocIds: [],
    };
    setProjectMergedDocs((prev) => ({
      ...prev,
      [projectId]: [...mergedDocsList(prev, projectId), entry],
    }));
  }, [projectDocs, projectMergedDocs]);

  const clearMergeDocSelection = useCallback(() => {
    setMergeSelectedKeys(new Set());
  }, []);

  const mergeIntoPackageFromKeys = useCallback((rawKeys, options = {}) => {
    const uniq = [...new Set(rawKeys)];
    const refs = uniq.map((k) => parseMergeDocSelectionKey(k)).filter(Boolean);
    if (refs.length < 1) return;
    const picked = refs.map((r) => {
      const list = projectDocList(projectDocs, r.projectId);
      return list.find((d) => d.id === r.docId);
    }).filter(Boolean);
    if (picked.length < 1) return;
    const forcedOwner = options.ownerProjectId;
    const ownerProjectId = (forcedOwner && projectsSafe.some((pr) => pr.id === forcedOwner))
      ? forcedOwner
      : ((selectedId && refs.some((r) => r.projectId === selectedId))
        ? selectedId
        : refs[0].projectId);
    const baseLabel = picked.map((d) => d.name).join(' · ');
    const truncated = baseLabel.length > 72 ? `${baseLabel.slice(0, 69)}…` : baseLabel;
    const editorDocName = uniqueMergedEditorName(
      projectDocs,
      projectMergedDocs,
      ownerProjectId,
      truncated,
    );
    const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const sameProject = new Set(refs.map((r) => r.projectId)).size === 1;
    const entry = {
      id,
      editorDocName,
      sourceRefs: refs.map((r) => ({ projectId: r.projectId, docId: r.docId })),
      sourceDocIds: sameProject ? refs.map((r) => r.docId) : [],
    };
    setProjectMergedDocs((prev) => ({
      ...prev,
      [ownerProjectId]: [...mergedDocsList(prev, ownerProjectId), entry],
    }));
    clearMergeDocSelection();
  }, [selectedId, projectsSafe, projectDocs, projectMergedDocs, clearMergeDocSelection]);

  const appendDocumentsToMega = useCallback((packageProjectId, megaId, refsToAdd) => {
    if (!refsToAdd?.length) return;
    setProjectMergedDocs((prev) => {
      const list = mergedDocsList(prev, packageProjectId);
      const mi = list.findIndex((m) => m.id === megaId);
      if (mi < 0) return prev;
      const mega = list[mi];
      const existing = megaSourceRefsForAppend(mega, packageProjectId);
      const seen = new Set(existing.map((r) => mergeDocSelectionKey(r.projectId, r.docId)));
      const merged = [...existing];
      for (const r of refsToAdd) {
        if (!r?.projectId || !r?.docId) continue;
        const k = mergeDocSelectionKey(r.projectId, r.docId);
        if (seen.has(k)) continue;
        const doc = projectDocList(projectDocs, r.projectId).find((d) => d.id === r.docId);
        if (!doc) continue;
        merged.push({ projectId: r.projectId, docId: r.docId });
        seen.add(k);
      }
      if (merged.length === existing.length) return prev;
      if (merged.length < 1) return prev;
      const sameProject = new Set(merged.map((r) => r.projectId)).size === 1;
      const onlyPid = sameProject ? merged[0].projectId : null;
      const nextMega = {
        ...mega,
        sourceRefs: merged,
        sourceDocIds: sameProject && onlyPid === packageProjectId
          ? merged.map((r) => r.docId)
          : [],
      };
      const nextList = [...list];
      nextList[mi] = nextMega;
      return { ...prev, [packageProjectId]: nextList };
    });
  }, [projectDocs]);

  const importFilesIntoCurrentPackage = useCallback((files) => {
    if (!tocHubPackage?.projectId || !tocHubPackage?.megaId) return;
    const incoming = Array.from(files || []).filter(Boolean);
    if (!incoming.length) return;
    const existing = projectDocList(projectDocs, tocHubPackage.projectId);
    const existingNames = new Set(existing.map((d) => String(d.name || '').toLowerCase()));
    const ts = Date.now();
    const docsToAdd = incoming.map((file, idx) => {
      const ext = String(file?.name || '').trim().match(/\.[^./\\]+$/)?.[0] || '';
      const baseLabel = 'User uploaded document';
      let candidate = `${baseLabel}${ext}`;
      let n = 2;
      while (existingNames.has(candidate.toLowerCase())) {
        candidate = `${baseLabel} (${n})${ext}`;
        n += 1;
      }
      existingNames.add(candidate.toLowerCase());
      return {
        id: `d-${ts}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        name: candidate,
        uploaded: true,
      };
    });
    if (!docsToAdd.length) return;
    setProjectDocs((prev) => ({
      ...prev,
      [tocHubPackage.projectId]: [...projectDocList(prev, tocHubPackage.projectId), ...docsToAdd],
    }));
    setProjectMergedDocs((prev) => {
      const list = mergedDocsList(prev, tocHubPackage.projectId);
      const mi = list.findIndex((m) => m.id === tocHubPackage.megaId);
      if (mi < 0) return prev;
      const mega = list[mi];
      const existing = megaSourceRefsForAppend(mega, tocHubPackage.projectId);
      const seen = new Set(existing.map((r) => mergeDocSelectionKey(r.projectId, r.docId)));
      const merged = [...existing];
      for (const d of docsToAdd) {
        const ref = { projectId: tocHubPackage.projectId, docId: d.id };
        const key = mergeDocSelectionKey(ref.projectId, ref.docId);
        if (seen.has(key)) continue;
        merged.push(ref);
        seen.add(key);
      }
      if (merged.length === existing.length) return prev;
      const nextMega = {
        ...mega,
        sourceRefs: merged,
        sourceDocIds: merged.map((r) => r.docId),
      };
      const nextList = [...list];
      nextList[mi] = nextMega;
      return { ...prev, [tocHubPackage.projectId]: nextList };
    });
  }, [tocHubPackage, projectDocs]);

  const fillTocHubDocRefDragTransfer = useCallback((e, projectId, docId) => {
    if (mergedPackageNavigation !== 'toc-hub') return;
    if (!projectId || !docId) return;
    try {
      e.dataTransfer.setData(MERGE_DOC_DOC_REF_TYPE, JSON.stringify({ projectId, docId }));
      e.dataTransfer.effectAllowed = 'copy';
    } catch { /* ignore */ }
  }, [mergedPackageNavigation]);

  const fillMergeDragDataTransfer = useCallback((e) => {
    const keys = [...mergeSelectedKeys];
    const minKeys = mergedPackageNavigation === 'toc-hub' ? 1 : 2;
    if (keys.length < minKeys) return;
    try {
      e.dataTransfer.setData(MERGE_DOC_KEYS_DRAG_TYPE, JSON.stringify({ keys }));
      e.dataTransfer.effectAllowed = 'copy';
    } catch { /* ignore */ }
  }, [mergeSelectedKeys, mergedPackageNavigation]);

  const performMergeDocuments = useCallback(() => {
    if (mergedPackageNavigation === 'toc-hub') {
      if (mergeSelectedKeys.size < 1) return;
      mergeIntoPackageFromKeys([...mergeSelectedKeys]);
      return;
    }
    if (!selectedId || mergeSelectedKeys.size < 2) return;
    const list = projectDocList(projectDocs, selectedId);
    const keysInProject = [...mergeSelectedKeys]
      .map((k) => parseMergeDocSelectionKey(k))
      .filter((r) => r && r.projectId === selectedId);
    const idSet = new Set(keysInProject.map((r) => r.docId));
    const picked = list.filter((d) => idSet.has(d.id));
    if (picked.length < 2) return;
    const baseLabel = picked.map((d) => d.name).join(' · ');
    const truncated = baseLabel.length > 72 ? `${baseLabel.slice(0, 69)}…` : baseLabel;
    const editorDocName = uniqueMergedEditorName(projectDocs, projectMergedDocs, selectedId, truncated);
    const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const entry = { id, editorDocName, sourceDocIds: picked.map((d) => d.id) };
    setProjectMergedDocs((prev) => ({
      ...prev,
      [selectedId]: [...mergedDocsList(prev, selectedId), entry],
    }));
    clearMergeDocSelection();
  }, [
    mergedPackageNavigation,
    mergeIntoPackageFromKeys,
    selectedId,
    mergeSelectedKeys,
    projectDocs,
    projectMergedDocs,
    clearMergeDocSelection,
  ]);

  const addSelectionToPackage = useCallback((targetMegaId = null) => {
    const minKeys = mergedPackageNavigation === 'toc-hub' ? 1 : 2;
    if (mergeSelectedKeys.size < minKeys) return;
    if (!targetMegaId) {
      mergeIntoPackageFromKeys(
        [...mergeSelectedKeys],
        selectedId ? { ownerProjectId: selectedId } : {},
      );
      return;
    }
    if (!selectedId) return;
    const refs = [...mergeSelectedKeys]
      .map((k) => parseMergeDocSelectionKey(k))
      .filter(Boolean);
    if (!refs.length) return;
    appendDocumentsToMega(selectedId, targetMegaId, refs);
    clearMergeDocSelection();
  }, [
    mergedPackageNavigation,
    mergeSelectedKeys,
    mergeIntoPackageFromKeys,
    selectedId,
    appendDocumentsToMega,
    clearMergeDocSelection,
  ]);

  const removeMergedDocument = useCallback((projectId, megaId) => {
    setProjectMergedDocs((prev) => {
      const mlist = mergedDocsList(prev, projectId);
      const removed = mlist.find((m) => m.id === megaId);
      const next = mlist.filter((m) => m.id !== megaId);
      if (removed?.editorDocName) stripDocFromOpenedDocs(removed.editorDocName);
      return { ...prev, [projectId]: next };
    });
  }, []);

  const openMergedPackage = useCallback((mega, projectIdForNav) => {
    if (mergedPackageNavigation === 'toc-hub') {
      setTocHubPackage({ projectId: projectIdForNav, megaId: mega.id });
      setView('merged-package');
      return;
    }
    const megaOfParam = Array.isArray(mega.sourceRefs) && mega.sourceRefs.length
      ? mega.sourceRefs.map((r) => r.docId).join(',')
      : (mega.sourceDocIds || []).join(',');
    navigate(editorHref(
      mega.editorDocName,
      false,
      editorPrototypePath,
      { megaOf: megaOfParam, nav: 'doc' },
    ));
  }, [mergedPackageNavigation, navigate, editorPrototypePath]);

  useEffect(() => {
    if (!tocHubPackage || mergedPackageNavigation !== 'toc-hub') return;
    const mlist = mergedDocsList(projectMergedDocs, tocHubPackage.projectId);
    const exists = mlist.some((m) => m.id === tocHubPackage.megaId);
    if (!exists) setTocHubPackage(null);
  }, [projectMergedDocs, tocHubPackage, mergedPackageNavigation]);

  useEffect(() => {
    setAddFromProjectOpen(false);
    setAddFromProjectSelection(new Set());
  }, [tocHubPackage?.projectId, tocHubPackage?.megaId]);

  useEffect(() => {
    if (mergedPackageNavigation !== 'toc-hub') return;
    if (tocHubPackage != null) return;
    if (view !== 'merged-package') return;
    setView(selectedId ? 'project' : 'home');
  }, [mergedPackageNavigation, tocHubPackage, view, selectedId]);

  const toggleMergeDocSelection = useCallback((projectId, docId) => {
    const key = mergeDocSelectionKey(projectId, docId);
    setMergeSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const createDoc = () => {
    if (!selectedId) return;
    const id = `d-${Date.now()}`;
    const resolvedName = newDocName.trim() || 'Untitled Document';
    const cadTrim = newDocCadName.trim();
    const prdSeed = prdDefaultsForTemplate(newDocTemplateId, cadTrim, resolvedName);
    const doc = {
      id,
      name: resolvedName,
      ...(prdOnboarding ? { prdCard: clonePrdCard(prdSeed) } : {}),
    };
    const updatedDocs = {
      ...projectDocs,
      [selectedId]: [...projectDocList(projectDocs, selectedId), doc],
    };
    setProjectDocs(updatedDocs);
    mergePersistState({ projects, selectedId, projectDocs: updatedDocs }, storageKey);
    setShowModal(false);
    setNewDocName('');
    setNewDocCadName('');
    setNewDocTemplateId('blank');
  };

  const handlePrdOnboardingUpdate = (next) => {
    if (!selectedId) return;
    setProjectCadOnboarding((prev) => ({ ...prev, [selectedId]: next }));
  };

  const handlePrdAnalysisDone = (asmName) => {
    if (!selectedId) return;
    setProjectCadOnboarding((prev) => ({
      ...prev,
      [selectedId]: {
        ...prev[selectedId],
        phase: 'review',
        assemblyName: asmName,
        summary: {
          partsExtracted: 24,
          partsKnown: 8,
          existingDocsConnected: 2,
          docsReadyToGenerate: 4,
          attention: 'One part spec changed since the last sync — confirm tolerances before publishing.',
        },
      },
    }));
  };

  const handlePrdGoToProject = () => {
    if (!selectedId) return;
    setProjectCadOnboarding((prev) => ({
      ...prev,
      [selectedId]: { ...prev[selectedId], phase: 'complete' },
    }));
  };

  const handlePrdGenerateComplete = () => {
    if (!selectedId) return;
    const proj = projectsSafe.find((p) => p.id === selectedId);
    if (!proj) return;
    const ob = projectCadOnboarding[selectedId] || {};
    const asmBase = ob.assemblyName || proj.name || 'Assembly';
    const cadFile = `${String(asmBase).replace(/\s+/g, '_')}.step`;
    const ts = Date.now();
    const genDocs = [
      {
        id: `d-${ts}-w`,
        name: `${asmBase} — Work Instruction`,
        prdCard: {
          stateLabel: 'In sync',
          lastUpdated: '11m ago',
          documentLastEdited: '1h ago',
          accentKey: 'in_sync',
          operationCount: 7,
          cadFileLabel: cadFile,
        },
      },
      {
        id: `d-${ts}-q`,
        name: `${asmBase} — Quality Check`,
        prdCard: {
          stateLabel: 'Auto-updated',
          lastUpdated: 'Just now',
          documentLastEdited: 'Today 10:22a',
          accentKey: 'auto_updated',
          operationCount: 12,
          cadFileLabel: cadFile,
          cadVersion: 'V22',
          cadDiffAdded: 34,
          cadDiffRemoved: 2,
          cadDiffModified: 45,
          cadChangeSummary: 'Assembly tree reordered; fastener stack height updated from latest BOM revision.',
        },
      },
      {
        id: `d-${ts}-m`,
        name: `${asmBase} — Maintenance Doc`,
        prdCard: {
          stateLabel: 'Auto-updated',
          lastUpdated: 'Yesterday 4:06p',
          documentLastEdited: '2d ago',
          accentKey: 'auto_updated',
          operationCount: 18,
          cadFileLabel: cadFile,
          cadVersion: 'V23',
          cadDiffAdded: 6,
          cadDiffRemoved: 1,
          cadDiffModified: 28,
          cadChangeSummary: 'Motor mount face offset +1 mm per ECO-441; mates to frame rails recomputed.',
        },
      },
      {
        id: `d-${ts}-f`,
        name: `${asmBase} — Field Ops`,
        prdCard: {
          stateLabel: 'Auto-updated',
          lastUpdated: '33m ago',
          documentLastEdited: 'Last Tue',
          accentKey: 'auto_updated',
          operationCount: 10,
          cadFileLabel: cadFile,
          cadVersion: 'V21',
          cadDiffAdded: 11,
          cadDiffRemoved: 0,
          cadDiffModified: 9,
          cadChangeSummary: 'Cable clip pattern mirrored for RH build; routing paths invalidated and re-synced.',
        },
      },
    ];
    setProjectDocs((prev) => ({ ...prev, [selectedId]: genDocs }));
    setProjectCadOnboarding((prev) => ({
      ...prev,
      [selectedId]: { ...prev[selectedId], phase: 'complete' },
    }));
    navigate(editorHref(genDocs[0].name, false, editorPrototypePath, { des36Banner: 'auto', des36State: 'Draft' }));
  };

  const selectedProject = projectsSafe.find(p => p.id === selectedId);
  const docs = selectedId ? visibleProjectDocList(projectDocs, selectedId) : [];
  const mergedDocs = selectedId ? mergedDocsList(projectMergedDocs, selectedId) : [];
  const prdOb = selectedId ? (projectCadOnboarding[selectedId] || null) : null;
  const showPrdCadFlow = Boolean(
    prdOnboarding && selectedId && docs.length === 0 && prdOb?.phase !== 'complete',
  );
  const prdOnboardingSafe = prdOb ?? { phase: 'cad_connect' };

  useEffect(() => {
    if (!prdOnboarding || !selectedId) return;
    const list = visibleProjectDocList(projectDocs, selectedId);
    if (list.length > 0) return;
    setProjectCadOnboarding((prev) => {
      if (prev[selectedId]) return prev;
      return { ...prev, [selectedId]: { phase: 'cad_connect' } };
    });
  }, [prdOnboarding, selectedId, projectDocs]);

  const projectPendingDelete = confirmDeleteProjectId
    ? projectsSafe.find((p) => p.id === confirmDeleteProjectId)
    : null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', fontSize: 14,
      color: C.text,
    }}>

      <Header minimal />

      {documentConnectionSandbox && documentConnectionShowSandboxBanner && !docLinkGuideDismissed ? (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px 14px',
            padding: '11px 20px',
            background: C.blueLight,
            borderBottom: `1px solid rgba(79, 110, 247, 0.18)`,
            fontSize: 13,
            color: C.text,
            lineHeight: 1.45,
          }}
        >
          <span style={{ flex: '1 1 280px', minWidth: 0 }}>
            <strong>How to use this sandbox:</strong>{' '}
            add documents in any project, open <strong>Document links</strong> in the sidebar (or use{' '}
            <strong>Link to another file…</strong> on a document), then pick <em>Start</em>, a relationship, and <em>End</em>.
          </span>
          <button
            type="button"
            onClick={() => { setSelectedId(null); setView('doc-connections'); }}
            style={{
              padding: '7px 14px',
              borderRadius: 7,
              border: 'none',
              background: C.blue,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Open Document links
          </button>
          <button
            type="button"
            onClick={loadSampleConnectionDemo}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 7,
              border: `1px solid rgba(79, 110, 247, 0.35)`,
              background: '#fff',
              color: C.blue,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Sparkles size={15} aria-hidden />
            Try sample project
          </button>
          <button
            type="button"
            aria-label="Dismiss tip"
            title="Dismiss"
            onClick={dismissDocLinkGuide}
            style={{
              marginLeft: 'auto',
              width: 32,
              height: 32,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: C.muted,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>
      ) : null}

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div style={{
          width: 220, background: C.sidebar, borderRight: `1px solid ${C.sidebarBdr}`,
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          {/* Search */}
          <div style={{ padding: '10px 12px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#F9FAFB', border: `1px solid ${C.cardBdr}`,
              borderRadius: 6, padding: '5px 10px',
            }}>
              <Search size={13} color={C.muted} />
              <span style={{ fontSize: 13, color: C.muted }}>Search</span>
            </div>
          </div>

          {/* Static nav links */}
          <div style={{ padding: '0 8px' }}>
            <div
              onClick={() => {
                setView('home');
                setSelectedId(null);
                setTocHubPackage(null);
              }}
              style={{ cursor: 'pointer' }}
            >
              <NavItem icon={<Home size={14} />} label="Home" active={view === 'home'} />
            </div>
            <div
              onClick={() => {
                setView('tool-library');
                setSelectedId(null);
                setTocHubPackage(null);
              }}
              style={{ cursor: 'pointer' }}
            >
              <NavItem icon={<Library size={14} />} label="Tool Library" active={view === 'tool-library'} />
            </div>
            <div
              onClick={() => {
                setView('reusable-procedures');
                setSelectedId(null);
                setTocHubPackage(null);
              }}
              style={{ cursor: 'pointer' }}
            >
              <NavItem
                icon={<ClipboardList size={14} />}
                label="Reusable Procedures"
                active={view === 'reusable-procedures'}
              />
            </div>
            <div
              onClick={() => {
                setView('parts-library');
                setSelectedId(null);
                setTocHubPackage(null);
              }}
              style={{ cursor: 'pointer' }}
            >
              <NavItem icon={<Boxes size={14} />} label="Parts Library" active={view === 'parts-library'} />
            </div>
            {documentConnectionSandbox && showDocumentLinksInSidebar ? (
              <div
                onClick={() => {
                  setView('doc-connections');
                  setSelectedId(null);
                  setTocHubPackage(null);
                }}
                style={{ cursor: 'pointer' }}
              >
                <NavItem icon={<GitBranch size={14} />} label="Document links" active={view === 'doc-connections'} />
              </div>
            ) : null}
          </div>

          <div style={{ height: 1, background: C.cardBdr, margin: '8px 0' }} />

          {/* Plugins — tags in rail + Add plugin opens modal */}
          <div style={{ padding: '2px 10px 4px', flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontWeight: 600,
                color: C.muted,
                letterSpacing: '0.02em',
                marginBottom: 8,
              }}
            >
              <Plug size={14} color={C.muted} strokeWidth={2} aria-hidden />
              Plugins
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 8 }}>
              {(megadocumentEmptyState
                ? (solidworksConnected ? ['SolidWorks'] : [])
                : ['Onshape', ...(solidworksConnected ? ['SolidWorks'] : [])]
              ).map((label) => (
                <button
                  key={label}
                  type="button"
                  title={label}
                  style={{
                    border: '1px solid rgba(79, 110, 247, 0.14)',
                    cursor: 'default',
                    background: '#EEF2FF',
                    color: C.blue,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '4px 8px',
                    borderRadius: 5,
                    lineHeight: 1.2,
                    fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              ))}
              {megadocumentEmptyState && !solidworksConnected ? (
                <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.35, width: '100%' }}>
                  No plugins connected yet.
                </span>
              ) : null}
            </div>
            <button
              type="button"
              title="Add a plugin"
              aria-label="Add plugin"
              onClick={() => setAddPluginModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: '100%',
                boxSizing: 'border-box',
                border: '1px dashed rgba(79, 110, 247, 0.4)',
                cursor: 'pointer',
                background: '#fff',
                color: C.blue,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.01em',
                padding: '8px 10px',
                borderRadius: 7,
                lineHeight: 1.2,
                fontFamily: 'inherit',
              }}
            >
              <Plus size={14} strokeWidth={2.25} aria-hidden />
              Add plugin
            </button>
          </div>

          <div style={{ height: 1, background: C.cardBdr, margin: '8px 0' }} />

          {/* Projects list */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
            <button
              type="button"
              onClick={() => setProjectsOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, width: '100%',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '5px 8px', borderRadius: 5,
                color: C.muted, fontSize: 11, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}
            >
              {projectsOpen
                ? <ChevronDown size={12} />
                : <ChevronRight size={12} />}
              Projects
            </button>

            <div style={{ padding: '6px 0 10px' }}>
              <button
                type="button"
                onClick={addProject}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  width: '100%',
                  background: C.blue,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 7,
                  padding: '8px 0',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <Plus size={14} aria-hidden />
                New Project
              </button>
            </div>

            {projectsOpen && projectsSafe.map(p => {
              const tocHubHere = mergedPackageNavigation === 'toc-hub';
              const projectCollapsed = collapsedProjectIds.has(p.id);
              return (
                <div
                  key={p.id}
                  {...(tocHubHere ? {
                    onDragOver: (e) => {
                      if (!dataTransferHasDocRefOrMergeKeys(e.dataTransfer)) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                    },
                    onDragEnter: (e) => {
                      if (!dataTransferHasDocRefOrMergeKeys(e.dataTransfer)) return;
                      e.preventDefault();
                      setMergeSidebarDropProjectId(p.id);
                    },
                    onDragLeave: (e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setMergeSidebarDropProjectId((id) => (id === p.id ? null : id));
                      }
                    },
                    onDrop: (e) => {
                      e.preventDefault();
                      setMergeSidebarDropProjectId(null);
                      const refs = collectRefsFromPackageDropDataTransfer(e.dataTransfer);
                      if (refs.length >= 1) {
                        mergeIntoPackageFromKeys(
                          refs.map((r) => mergeDocSelectionKey(r.projectId, r.docId)),
                          { ownerProjectId: p.id },
                        );
                      }
                    },
                  } : {})}
                  style={tocHubHere ? {
                    marginBottom: 2,
                    ...(mergeSidebarDropProjectId === p.id ? {
                      borderRadius: 8,
                      outline: `2px dashed ${C.blue}`,
                      outlineOffset: 2,
                    } : {}),
                  } : undefined}
                >
                  <div
                    onMouseEnter={() => setHoveredProjectId(p.id)}
                    onMouseLeave={() => setHoveredProjectId((id) => (id === p.id ? null : id))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 2,
                      borderRadius: 6,
                      background:
                        selectedId === p.id && view === 'project'
                          ? C.blueLight
                          : (hoveredProjectId === p.id ? '#F3F4F6' : 'transparent'),
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(p.id);
                        setView('project');
                        setTocHubPackage(null);
                      }}
                      onDoubleClick={() => startEdit(p)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0,
                        background: 'none',
                        border: 'none', cursor: 'pointer', padding: '5px 8px', borderRadius: 6,
                        color: selectedId === p.id && view === 'project' ? C.blue : C.text,
                        fontSize: 13, textAlign: 'left',
                        fontWeight: selectedId === p.id && view === 'project' ? 500 : 400,
                      }}
                    >
                      <span
                        role={hoveredProjectId === p.id ? 'button' : undefined}
                        tabIndex={hoveredProjectId === p.id ? 0 : undefined}
                        aria-label={hoveredProjectId === p.id ? (projectCollapsed ? `Expand project ${p.name}` : `Collapse project ${p.name}`) : undefined}
                        onClick={(e) => {
                          if (hoveredProjectId !== p.id) return;
                          e.stopPropagation();
                          setCollapsedProjectIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(p.id)) next.delete(p.id);
                            else next.add(p.id);
                            return next;
                          });
                        }}
                        onKeyDown={(e) => {
                          if (hoveredProjectId !== p.id) return;
                          if (e.key !== 'Enter' && e.key !== ' ') return;
                          e.preventDefault();
                          e.stopPropagation();
                          setCollapsedProjectIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(p.id)) next.delete(p.id);
                            else next.add(p.id);
                            return next;
                          });
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 14,
                          height: 14,
                          flexShrink: 0,
                          cursor: hoveredProjectId === p.id ? 'pointer' : 'default',
                          color: selectedId === p.id && view === 'project' ? C.blue : C.muted,
                        }}
                      >
                        {hoveredProjectId === p.id
                          ? (projectCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />)
                          : <FolderOpen size={14} />}
                      </span>
                      <span style={{
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {p.name}
                      </span>
                    </button>
                    {tocHubHere ? (
                      <>
                        <button
                          type="button"
                          title="Add document"
                          aria-label={`Add document to ${p.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            createBlankDocumentForProject(p.id);
                          }}
                          onMouseEnter={() => setHoveredSidebarActionKey(`add-doc:${p.id}`)}
                          onMouseLeave={() => setHoveredSidebarActionKey((k) => (k === `add-doc:${p.id}` ? null : k))}
                          style={{
                            flexShrink: 0,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: hoveredSidebarActionKey === `add-doc:${p.id}` ? C.blue : C.muted,
                            padding: '4px 6px',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            opacity: hoveredProjectId === p.id ? 1 : 0,
                            pointerEvents: hoveredProjectId === p.id ? 'auto' : 'none',
                            transition: 'opacity 0.15s ease, color 0.12s ease, background 0.12s ease',
                            ...(hoveredSidebarActionKey === `add-doc:${p.id}` ? { background: C.blueLight } : {}),
                          }}
                        >
                          <FilePlusCornerIcon size={14} />
                        </button>
                        <button
                          type="button"
                          title="Add document package"
                          aria-label={`Add document package to ${p.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            createEmptyPackageForProject(p.id);
                          }}
                          onMouseEnter={() => setHoveredSidebarActionKey(`add-pkg:${p.id}`)}
                          onMouseLeave={() => setHoveredSidebarActionKey((k) => (k === `add-pkg:${p.id}` ? null : k))}
                          style={{
                            flexShrink: 0,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: hoveredSidebarActionKey === `add-pkg:${p.id}` ? C.blue : C.muted,
                            padding: '4px 6px',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            opacity: hoveredProjectId === p.id ? 1 : 0,
                            pointerEvents: hoveredProjectId === p.id ? 'auto' : 'none',
                            transition: 'opacity 0.15s ease, color 0.12s ease, background 0.12s ease',
                            ...(hoveredSidebarActionKey === `add-pkg:${p.id}` ? { background: C.blueLight } : {}),
                          }}
                        >
                          <LayersPlusIcon size={14} />
                        </button>
                      </>
                    ) : null}
                    {allowDeleteProjectsAndDocuments && (
                      <button
                        type="button"
                        title="Delete project"
                        aria-label={`Delete project ${p.name}`}
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteProjectId(p.id); }}
                        onMouseEnter={() => setHoveredSidebarActionKey(`del-proj:${p.id}`)}
                        onMouseLeave={() => setHoveredSidebarActionKey((k) => (k === `del-proj:${p.id}` ? null : k))}
                        style={{
                          flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                          color: hoveredSidebarActionKey === `del-proj:${p.id}` ? '#B91C1C' : C.muted, padding: '4px 6px', borderRadius: 4,
                          display: 'flex', alignItems: 'center',
                          opacity: hoveredProjectId === p.id ? 1 : 0,
                          pointerEvents: hoveredProjectId === p.id ? 'auto' : 'none',
                          transition: 'opacity 0.15s ease, color 0.12s ease, background 0.12s ease',
                          ...(hoveredSidebarActionKey === `del-proj:${p.id}` ? { background: '#FEE2E2' } : {}),
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {tocHubHere && !projectCollapsed ? (
                    <div style={{ paddingLeft: 10, paddingTop: 2 }}>
                      {visibleProjectDocList(projectDocs, p.id).map((doc) => {
                        const docRowKey = `${p.id}:${doc.id}`;
                        const docHovered = hoveredSidebarDocKey === docRowKey;
                        return (
                          <div
                            key={`project-doc:${p.id}:${doc.id}`}
                            onMouseEnter={() => setHoveredSidebarDocKey(docRowKey)}
                            onMouseLeave={() => setHoveredSidebarDocKey((k) => (k === docRowKey ? null : k))}
                            style={{
                              display: 'flex',
                              alignItems: 'stretch',
                              gap: 2,
                              borderRadius: 6,
                              background: docHovered ? '#F3F4F6' : 'transparent',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => navigate(editorHref(doc.name, false, editorPrototypePath))}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 7,
                                flex: 1,
                                minWidth: 0,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: 6,
                                color: C.text,
                                fontSize: 12,
                                textAlign: 'left',
                                fontFamily: 'inherit',
                              }}
                            >
                              <FileText size={13} color={C.muted} aria-hidden />
                              <span style={{
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              >
                                {doc.name}
                              </span>
                            </button>
                            {allowDeleteProjectsAndDocuments ? (
                              <button
                                type="button"
                                title="Delete document"
                                aria-label={`Delete document ${doc.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteDoc({ projectId: p.id, doc: { id: doc.id, name: doc.name } });
                                }}
                                onMouseEnter={() => setHoveredSidebarActionKey(`del-doc:${docRowKey}`)}
                                onMouseLeave={() => setHoveredSidebarActionKey((k) => (k === `del-doc:${docRowKey}` ? null : k))}
                                style={{
                                  flexShrink: 0,
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: hoveredSidebarActionKey === `del-doc:${docRowKey}` ? '#B91C1C' : C.muted,
                                  padding: '4px 6px',
                                  borderRadius: 4,
                                  display: 'flex',
                                  alignItems: 'center',
                                  opacity: docHovered ? 1 : 0,
                                  pointerEvents: docHovered ? 'auto' : 'none',
                                  transition: 'opacity 0.15s ease, color 0.12s ease, background 0.12s ease',
                                  ...(hoveredSidebarActionKey === `del-doc:${docRowKey}` ? { background: '#FEE2E2' } : {}),
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  {tocHubHere && !projectCollapsed
                    ? mergedDocsList(projectMergedDocs, p.id).map((mega) => {
                      const projectId = p.id;
                      const sourceNames = resolveMegaSourceDocNames(projectDocs, projectId, mega);
                      const rowTitle = sourceNames.length
                        ? sourceNames.join(' · ')
                        : mega.editorDocName;
                      const rowKey = `${projectId}:${mega.id}`;
                      const expanded = tocHubPackage?.projectId === projectId
                        && tocHubPackage?.megaId === mega.id;
                      const rowDropHighlight = megaAppendDropRowKey === rowKey;
                      return (
                        <div key={rowKey} style={{ marginBottom: 2, paddingLeft: 10, marginTop: 1 }}>
                          <div
                            onMouseEnter={() => setHoveredMergedPackageKey(rowKey)}
                            onMouseLeave={() => setHoveredMergedPackageKey((id) => (
                              id === rowKey ? null : id
                            ))}
                            onDragOver={(e) => {
                              if (!dataTransferHasDocRefOrMergeKeys(e.dataTransfer)) return;
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = 'copy';
                            }}
                            onDragEnter={(e) => {
                              if (!dataTransferHasDocRefOrMergeKeys(e.dataTransfer)) return;
                              e.preventDefault();
                              e.stopPropagation();
                              setMegaAppendDropRowKey(rowKey);
                              setMergeSidebarDropProjectId(null);
                            }}
                            onDragLeave={(e) => {
                              if (!e.currentTarget.contains(e.relatedTarget)) {
                                setMegaAppendDropRowKey((k) => (k === rowKey ? null : k));
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMegaAppendDropRowKey(null);
                              setMergeSidebarDropProjectId(null);
                              const refs = collectRefsFromPackageDropDataTransfer(e.dataTransfer);
                              if (refs.length) appendDocumentsToMega(projectId, mega.id, refs);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'stretch',
                              gap: 2,
                              borderRadius: 6,
                              background: expanded ? C.blueLight : (hoveredMergedPackageKey === rowKey ? '#F3F4F6' : 'transparent'),
                              outline: rowDropHighlight ? `2px dashed ${C.blue}` : undefined,
                              outlineOffset: rowDropHighlight ? 2 : undefined,
                            }}
                          >
                            <button
                              type="button"
                              aria-expanded={expanded}
                              onClick={() => {
                                if (expanded) {
                                  setTocHubPackage(null);
                                  setView(selectedId ? 'project' : 'home');
                                } else {
                                  setTocHubPackage({ projectId, megaId: mega.id });
                                  setView('merged-package');
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 7,
                                flex: 1,
                                minWidth: 0,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '5px 8px',
                                borderRadius: 6,
                                color: expanded ? C.blue : C.text,
                                fontSize: 12,
                                textAlign: 'left',
                                fontWeight: expanded ? 600 : 400,
                                fontFamily: 'inherit',
                              }}
                            >
                              <Layers
                                size={14}
                                color={expanded ? C.blue : C.muted}
                                style={{ flexShrink: 0, marginTop: 1 }}
                                aria-hidden
                              />
                              <span style={{
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              >
                                {rowTitle}
                              </span>
                            </button>
                            {allowDeleteProjectsAndDocuments ? (
                              <button
                                type="button"
                                title="Remove merged package"
                                aria-label={`Remove merged package ${rowTitle}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeMergedDocument(projectId, mega.id);
                                }}
                                onMouseEnter={() => setHoveredSidebarActionKey(`del-pkg:${rowKey}`)}
                                onMouseLeave={() => setHoveredSidebarActionKey((k) => (k === `del-pkg:${rowKey}` ? null : k))}
                                style={{
                                  flexShrink: 0,
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: hoveredSidebarActionKey === `del-pkg:${rowKey}` ? '#B91C1C' : C.muted,
                                  padding: '4px 6px',
                                  borderRadius: 4,
                                  display: 'flex',
                                  alignItems: 'center',
                                  alignSelf: 'flex-start',
                                  opacity: hoveredMergedPackageKey === rowKey ? 1 : 0,
                                  pointerEvents: hoveredMergedPackageKey === rowKey ? 'auto' : 'none',
                                  transition: 'opacity 0.15s ease, color 0.12s ease, background 0.12s ease',
                                  ...(hoveredSidebarActionKey === `del-pkg:${rowKey}` ? { background: '#FEE2E2' } : {}),
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                    : null}
                </div>
              );
            })}
            {projectsOpen && megadocumentEmptyState && projectsSafe.length === 0 ? (
              <div style={{
                fontSize: 11,
                color: C.muted,
                padding: '4px 8px 8px',
                lineHeight: 1.45,
              }}
              >
                No projects yet. Use New Project above.
              </div>
            ) : null}
          </div>

          {/* Team link */}
          <div style={{ borderTop: `1px solid ${C.cardBdr}`, padding: '10px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.sub, fontSize: 13, cursor: 'pointer' }}>
              <Users size={14} />
              Team
            </div>
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'auto', background: C.bg }}>

          {/* ── Merged document package (Megadocument 2: TOC in main area) ── */}
          {view === 'merged-package' && mergedPackageNavigation === 'toc-hub' && tocHubPackage && (() => {
            const mlist = mergedDocsList(projectMergedDocs, tocHubPackage.projectId);
            const mega = mlist.find((m) => m.id === tocHubPackage.megaId);
            if (!mega) return null;
            const members = megaMemberDocuments(projectDocs, tocHubPackage.projectId, mega);
            const packageRows = members;
            const memberIds = new Set(members.map((d) => d.id));
            const availableProjectDocs = visibleProjectDocList(projectDocs, tocHubPackage.projectId)
              .filter((d) => !memberIds.has(d.id));
            const sourceNames = resolveMegaSourceDocNames(projectDocs, tocHubPackage.projectId, mega);
            const pageTitle = sourceNames.length
              ? sourceNames.join(' · ')
              : (mega.editorDocName ?? 'Document package');
            const mainDropKey = mergedPackageMainDropKey(mega.id);
            const mainDropHighlight = megaAppendDropRowKey === mainDropKey;
            return (
              <div style={{
                padding: '40px clamp(24px, 4vw, 56px)',
                width: '100%',
                maxWidth: 'min(1400px, 100%)',
                boxSizing: 'border-box',
              }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: C.blueLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                  >
                    <Layers size={22} color={C.blue} aria-hidden />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ marginBottom: 6 }}>
                      <MergedPackageTag />
                    </div>
                    <h1 style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: C.text,
                      margin: 0,
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                    }}
                    >
                      {pageTitle}
                    </h1>
                  </div>
                </div>
                <div
                  onDragOver={(e) => {
                    if (!dataTransferHasDocRefOrMergeKeys(e.dataTransfer)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onDragEnter={(e) => {
                    if (!dataTransferHasDocRefOrMergeKeys(e.dataTransfer)) return;
                    e.preventDefault();
                    setMegaAppendDropRowKey(mainDropKey);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      setMegaAppendDropRowKey((k) => (k === mainDropKey ? null : k));
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setMegaAppendDropRowKey(null);
                    const refs = collectRefsFromPackageDropDataTransfer(e.dataTransfer);
                    if (refs.length) {
                      appendDocumentsToMega(tocHubPackage.projectId, tocHubPackage.megaId, refs);
                    }
                  }}
                  style={{
                    background: '#fff',
                    border: `1px solid ${C.cardBdr}`,
                    borderRadius: 10,
                    overflow: 'hidden',
                    outline: mainDropHighlight ? `2px dashed ${C.blue}` : undefined,
                    outlineOffset: mainDropHighlight ? 2 : undefined,
                  }}
                >
                  {members.length === 0 ? (
                    <div style={{ padding: '20px 18px', fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
                      No member documents.
                      {megadocumentEmptyState ? (
                        <>
                          {' '}
                          Drag documents here from Home or Recent files, or add files from the editor after you open this package.
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {packageRows.map((d, idx) => (
                        <li
                          key={d.id}
                          style={{
                            borderTop: idx > 0 ? `1px solid ${C.cardBdr}` : 'none',
                          }}
                        >
                          <div
                            className="ph-merged-pkg-doc-row"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              width: '100%',
                              textAlign: 'left',
                              padding: '10px 12px',
                              background: d.uploaded ? '#F8FAFC' : '#fff',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const selectedVersion = d.uploaded
                                  ? 'Unpublished'
                                  : (packageDocVersionById[d.id] || 'V1');
                                const backUrl = new URL(window.location.href);
                                backUrl.searchParams.set('projectId', tocHubPackage.projectId);
                                backUrl.searchParams.set('view', 'project');
                                const returnTo = `${backUrl.pathname}?${backUrl.searchParams.toString()}`;
                                const extra = d.uploaded
                                  ? { nav: 'doc', uploadedDoc: '1', readOnly: '1', docVersion: 'Uploaded', returnTo }
                                  : (
                                    selectedVersion !== 'Unpublished'
                                      ? { nav: 'doc', readOnly: '1', docVersion: selectedVersion, returnTo }
                                      : { nav: 'doc', returnTo }
                                  );
                                navigate(editorHref(d.name, false, editorPrototypePath, extra));
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                flex: 1,
                                minWidth: 0,
                                textAlign: 'left',
                                padding: '4px 6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                fontSize: 14,
                                fontWeight: 500,
                                color: C.text,
                                background: 'none',
                              }}
                            >
                              <FileText size={18} color={d.uploaded ? '#64748B' : C.blue} style={{ flexShrink: 0 }} aria-hidden />
                              <span style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                                minWidth: 0,
                              }}
                              >
                                {d.name}
                              </span>
                              {d.uploaded ? (
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: '#475569',
                                  background: '#E2E8F0',
                                  borderRadius: 999,
                                  padding: '2px 8px',
                                  letterSpacing: '0.02em',
                                }}
                                >
                                  UPLOADED
                                </span>
                              ) : null}
                            </button>
                            {!d.uploaded ? (
                              <div style={{ position: 'relative', flexShrink: 0 }}>
                                <select
                                  aria-label={`Version for ${d.name}`}
                                  value={packageDocVersionById[d.id] || 'V1'}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setPackageDocVersionById((prev) => ({ ...prev, [d.id]: v }));
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    border: `1px solid ${C.cardBdr}`,
                                    borderRadius: 10,
                                    padding: '8px 36px 8px 12px',
                                    minHeight: 38,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: C.text,
                                    background: '#fff',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    MozAppearance: 'none',
                                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                                  }}
                                >
                                  <option value="Unpublished">Unpublished</option>
                                  <option value="V1">V1</option>
                                  <option value="V2">V2</option>
                                  <option value="V3">V3</option>
                                  <option value="V4">V4</option>
                                </select>
                                <ChevronDown
                                  size={16}
                                  color={C.muted}
                                  style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    pointerEvents: 'none',
                                  }}
                                  aria-hidden
                                />
                              </div>
                            ) : null}
                            <ChevronRight size={18} color={C.muted} style={{ flexShrink: 0 }} aria-hidden />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div style={{ marginTop: 20 }}>
                  <EmptyImportPanel
                    title="Add your own document"
                    description=""
                    browseLabel="Upload documents"
                    secondaryLabel="Add from project"
                    onSecondaryClick={() => {
                      setAddFromProjectOpen((open) => !open);
                      setAddFromProjectSelection(new Set());
                    }}
                    inputAccept=".zip,.pdf,.doc,.docx"
                    onFilesSelected={importFilesIntoCurrentPackage}
                    maxWidth={980}
                  />
                </div>
                {addFromProjectOpen ? (
                  <div
                    onClick={() => {
                      setAddFromProjectOpen(false);
                      setAddFromProjectSelection(new Set());
                    }}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 70,
                      background: 'rgba(15, 23, 42, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 20,
                    }}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: 'min(680px, 100%)',
                        maxHeight: 'min(540px, 100vh - 40px)',
                        background: '#fff',
                        border: `1px solid ${C.cardBdr}`,
                        borderRadius: 12,
                        padding: 16,
                        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                        Add documents from this project
                      </div>
                      {availableProjectDocs.length < 1 ? (
                        <div style={{ fontSize: 13, color: C.muted }}>
                          All project documents are already in this package.
                        </div>
                      ) : (
                        <div style={{
                          display: 'grid',
                          gap: 8,
                          overflow: 'auto',
                          paddingRight: 4,
                        }}
                        >
                          {availableProjectDocs.map((doc) => (
                            <label
                              key={doc.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: `1px solid ${C.cardBdr}`,
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={addFromProjectSelection.has(doc.id)}
                                onChange={(e) => {
                                  setAddFromProjectSelection((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(doc.id);
                                    else next.delete(doc.id);
                                    return next;
                                  });
                                }}
                              />
                              <FileText size={16} color={C.blue} aria-hidden />
                              <span style={{
                                fontSize: 13,
                                color: C.text,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              >
                                {doc.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setAddFromProjectOpen(false);
                            setAddFromProjectSelection(new Set());
                          }}
                          style={{
                            border: `1px solid ${C.cardBdr}`,
                            background: '#fff',
                            color: C.text,
                            borderRadius: 8,
                            padding: '8px 12px',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={availableProjectDocs.length < 1 || addFromProjectSelection.size < 1}
                          onClick={() => {
                            const selected = availableProjectDocs.filter((doc) => addFromProjectSelection.has(doc.id));
                            const refs = selected.map((doc) => ({ projectId: tocHubPackage.projectId, docId: doc.id }));
                            if (refs.length) {
                              appendDocumentsToMega(tocHubPackage.projectId, tocHubPackage.megaId, refs);
                            }
                            setAddFromProjectSelection(new Set());
                            setAddFromProjectOpen(false);
                          }}
                          style={{
                            border: 'none',
                            background: availableProjectDocs.length < 1 || addFromProjectSelection.size < 1 ? '#C7D2FE' : C.blue,
                            color: '#fff',
                            borderRadius: 8,
                            padding: '8px 12px',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: availableProjectDocs.length < 1 || addFromProjectSelection.size < 1 ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          Add selected
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })()}

          {/* ── Home view ── */}
          {view === 'home' && (() => {
            // Collect all docs across all projects, newest first
            const allDocs = projectsSafe.flatMap(p =>
              visibleProjectDocList(projectDocs, p.id).map(d => ({ ...d, projectName: p.name, projectId: p.id }))
            ).sort((a, b) => {
              const tsA = parseInt(a.id.replace('d-', ''), 10) || 0;
              const tsB = parseInt(b.id.replace('d-', ''), 10) || 0;
              return tsB - tsA;
            });
            const allMergedAcross = allMergedDocsAcrossProjects(projectMergedDocs, projectsSafe, projectDocs);

            if (allDocs.length === 0 && allMergedAcross.length === 0) {
              if (megadocumentEmptyState) {
                return (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    padding: 40,
                  }}
                  >
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%', background: C.blueLight,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
                    }}
                    >
                      <FolderOpen size={28} color={C.blue} aria-hidden />
                    </div>
                    <h2 style={{
                      fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 22px', textAlign: 'center',
                    }}
                    >
                      Welcome to q20!
                    </h2>
                    <div style={{ width: '100%', maxWidth: 520 }}>
                      <EmptyImportPanel
                        title="No documents"
                        description="Create a new document, add tools, and plugins."
                        showFilePicker={false}
                        leadIcon={<FileText size={22} color={C.blue} aria-hidden />}
                        hint=""
                        maxWidth={520}
                        ctaButtons={[
                          {
                            label: 'Create project',
                            variant: 'primary',
                            Icon: Plus,
                            onClick: addProject,
                          },
                          {
                            label: 'Add tool',
                            variant: 'outline',
                            Icon: Wrench,
                            onClick: () => {
                              setView('tool-library');
                              setHomeToolModalRequest((n) => n + 1);
                            },
                          },
                          {
                            label: 'Add plugin',
                            variant: 'outline',
                            Icon: Plug,
                            onClick: () => setAddPluginModalOpen(true),
                          },
                        ]}
                      />
                    </div>
                  </div>
                );
              }
              return (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%', padding: 40,
                }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%', background: C.blueLight,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22,
                  }}>
                    <FolderOpen size={28} color={C.blue} />
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>
                    Welcome to q20!
                  </h2>
                  <p style={{ fontSize: 14, color: C.sub, textAlign: 'center', maxWidth: 420, lineHeight: 1.6, margin: 0 }}>
                    {documentConnectionSandbox ? (
                      <>
                        This prototype is about <strong style={{ color: C.text }}>links between documents</strong>.
                        Start with a sample project that already has three files and two links, or create your own project on the left.
                      </>
                    ) : (
                      <>Looks like you have no projects yet. To get started, create one using the panel on the left.</>
                    )}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 24 }}>
                    {documentConnectionSandbox ? (
                      <button
                        type="button"
                        onClick={loadSampleConnectionDemo}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          background: C.blue, color: '#fff', border: 'none', borderRadius: 8,
                          padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        <Sparkles size={16} aria-hidden />
                        Try sample project + links
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={addProject}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        background: documentConnectionSandbox ? '#fff' : C.blue,
                        color: documentConnectionSandbox ? C.blue : '#fff',
                        border: documentConnectionSandbox ? `1px solid ${C.blue}` : 'none',
                        borderRadius: 8,
                        padding: '10px 22px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                      }}
                    >
                      <Plus size={16} />
                      New Project
                    </button>
                  </div>
                </div>
              );
            }

            const rowKey = (doc) => `${doc.projectId}:${doc.id}`;
            return (
              <div style={{ padding: '40px 44px' }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 18px' }}>
                  Recent files
                </h2>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: recentFilesViewMode === 'list' ? 0 : 20,
                  flexWrap: 'wrap',
                }}
                >
                  <div style={{ flex: 1, minWidth: 0 }} aria-hidden />
                  <div
                    role={mergedPackageNavigation === 'toc-hub' && mergeSelectedKeys.size >= 1 ? 'region' : undefined}
                    aria-label={mergedPackageNavigation === 'toc-hub' && mergeSelectedKeys.size >= 1 ? 'Merge documents' : undefined}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                      flexShrink: 0,
                    }}
                  >
                    {mergedPackageNavigation === 'toc-hub' && mergeSelectedKeys.size >= 1 ? (
                      <>
                        <span style={{ fontSize: 13, color: C.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {mergeSelectedKeys.size}
                          {' '}
                          selected
                        </span>
                        <button
                          type="button"
                          onClick={clearMergeDocSelection}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 12px',
                            borderRadius: 7,
                            border: `1px solid ${C.cardBdr}`,
                            background: '#fff',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            color: C.text,
                            fontFamily: 'inherit',
                          }}
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          disabled={mergeSelectedKeys.size < 1}
                          onClick={performMergeDocuments}
                          style={mergeDocumentsSecondaryBtnStyle(mergeSelectedKeys.size < 1)}
                        >
                          <GitMerge size={16} aria-hidden style={{ flexShrink: 0 }} />
                          Merge documents
                        </button>
                      </>
                    ) : null}
                  <div
                    role="tablist"
                    aria-label="Recent files layout"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                      padding: 3,
                      background: '#E5E7EB',
                      borderRadius: 9,
                      border: `1px solid ${C.cardBdr}`,
                      flexShrink: 0,
                    }}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-label="Tiles"
                      aria-selected={recentFilesViewMode === 'tiles'}
                      onClick={() => setRecentFilesViewMode('tiles')}
                      style={docLayoutSegmentBtnStyle(recentFilesViewMode === 'tiles')}
                    >
                      <LayoutGrid size={15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-label="List"
                      aria-selected={recentFilesViewMode === 'list'}
                      onClick={() => setRecentFilesViewMode('list')}
                      style={docLayoutSegmentBtnStyle(recentFilesViewMode === 'list')}
                    >
                      <List size={15} aria-hidden />
                    </button>
                  </div>
                  </div>
                </div>

                {recentFilesViewMode === 'tiles' ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 16 }}>
                    {allDocs.length === 0 ? (
                      <div style={{
                        width: '100%',
                        padding: '12px 0 4px',
                        fontSize: 13,
                        color: C.muted,
                      }}
                      >
                        {megadocumentEmptyState
                          ? 'No files in Recent files yet. Create a document from a project, or go Home to add tools and plugins.'
                          : 'No standalone documents in any project yet.'}
                      </div>
                    ) : null}
                    {allDocs.map((doc) => {
                      const href = editorHref(doc.name, false, editorPrototypePath);
                      const onDel = allowDeleteProjectsAndDocuments
                        ? () => setConfirmDeleteDoc({ projectId: doc.projectId, doc: { id: doc.id, name: doc.name } })
                        : undefined;
                      const prd = resolvePrdCard(doc, prdOnboarding);
                      const inPkg = isDocInMergedPackage(projectMergedDocs, doc.projectId, doc.id);
                      const mergeKey = mergeDocSelectionKey(doc.projectId, doc.id);
                      if (prd) {
                        return (
                          <Des36PrdDocCard
                            key={rowKey(doc)}
                            name={doc.name}
                            stateLabel={prd.stateLabel}
                            lastUpdated={prd.lastUpdated}
                            documentLastEdited={prd.documentLastEdited}
                            accentKey={prd.accentKey}
                            operationCount={prd.operationCount}
                            cadFileLabel={prd.cadFileLabel}
                            cadVersion={prd.cadVersion}
                            cadChangeSummary={prd.cadChangeSummary}
                            cadDiffAdded={prd.cadDiffAdded}
                            cadDiffRemoved={prd.cadDiffRemoved}
                            cadDiffModified={prd.cadDiffModified}
                            docId={doc.id}
                            projectId={doc.projectId}
                            onRenameDocument={renameDocument}
                            onCadFileLabelClick={openPartsMapForCad}
                            onClick={() => navigate(href)}
                            onDelete={onDel}
                            onOpenDocumentLinks={showDocLinkOnCards
                              ? () => goToDocumentLinksFromDoc(doc.projectId, doc.id)
                              : undefined}
                            showFooter={showDocumentCardFooter}
                            mergeSelectMode={mergedPackageNavigation === 'toc-hub'}
                            mergeSelectionViaCheckboxOnly
                            mergeSelected={mergeSelectedKeys.has(mergeKey)}
                            onMergeToggle={() => toggleMergeDocSelection(doc.projectId, doc.id)}
                            mergeDraggable={
                              mergedPackageNavigation === 'toc-hub'
                              && mergeSelectedKeys.has(mergeKey)
                              && mergeSelectedKeys.size >= 1
                            }
                            onMergeDragStart={fillMergeDragDataTransfer}
                            onDocRefDragStart={
                              mergedPackageNavigation === 'toc-hub'
                                ? (e) => fillTocHubDocRefDragTransfer(e, doc.projectId, doc.id)
                                : undefined
                            }
                            inDocumentPackage={inPkg}
                          />
                        );
                      }
                      return (
                        <DocTile
                          key={rowKey(doc)}
                          name={doc.name}
                          subtitle={doc.projectName}
                          onClick={() => navigate(href)}
                          onDelete={onDel}
                          onOpenDocumentLinks={showDocLinkOnCards
                            ? () => goToDocumentLinksFromDoc(doc.projectId, doc.id)
                            : undefined}
                          mergeSelectMode={mergedPackageNavigation === 'toc-hub'}
                          mergeSelectionViaCheckboxOnly
                          mergeSelected={mergeSelectedKeys.has(mergeKey)}
                          onMergeToggle={() => toggleMergeDocSelection(doc.projectId, doc.id)}
                          mergeDraggable={
                            mergedPackageNavigation === 'toc-hub'
                            && mergeSelectedKeys.has(mergeKey)
                            && mergeSelectedKeys.size >= 1
                          }
                          onMergeDragStart={fillMergeDragDataTransfer}
                          onDocRefDragStart={
                            mergedPackageNavigation === 'toc-hub'
                              ? (e) => fillTocHubDocRefDragTransfer(e, doc.projectId, doc.id)
                              : undefined
                          }
                          inDocumentPackage={inPkg}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div style={docListTableBleedWrap}>
                    {allDocs.length === 0 ? (
                      <div style={{
                        padding: '12px 16px 10px',
                        fontSize: 13,
                        color: C.muted,
                      }}
                      >
                        {megadocumentEmptyState
                          ? 'No files in Recent files yet. Create a document from a project, or go Home to add tools and plugins.'
                          : 'No standalone documents in any project yet.'}
                      </div>
                    ) : null}
                    <div style={{
                      background: '#fff',
                      borderTop: `1px solid ${C.cardBdr}`,
                      borderBottom: `1px solid ${C.cardBdr}`,
                    }}
                    >
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          tableLayout: 'fixed',
                        }}
                      >
                        <thead>
                          <tr>
                            {mergedPackageNavigation === 'toc-hub' ? (
                              <th
                                scope="col"
                                style={{ ...docListThStyle, width: 44, textAlign: 'center' }}
                                aria-label="Select for merge"
                              />
                            ) : null}
                            <th scope="col" style={docListThStyle}>Document</th>
                            <th scope="col" style={docListThStyle}>Project</th>
                            <th scope="col" style={docListThStyle}>CAD file</th>
                            <th scope="col" style={docListThStyle}>Status</th>
                            <th scope="col" style={{ ...docListThStyle, width: 120 }}>Operations</th>
                            <th
                              scope="col"
                              aria-label="Actions"
                              style={{
                                ...docListThStyle,
                                width: showDocLinkOnCards ? 124 : 88,
                                textAlign: 'right',
                              }}
                            />
                          </tr>
                        </thead>
                        <tbody>
                          {allDocs.map((doc) => {
                            const href = editorHref(doc.name, false, editorPrototypePath);
                            const onDel = allowDeleteProjectsAndDocuments
                              ? () => setConfirmDeleteDoc({ projectId: doc.projectId, doc: { id: doc.id, name: doc.name } })
                              : undefined;
                            const prd = resolvePrdCard(doc, prdOnboarding);
                            const rk = rowKey(doc);
                            const isHover = recentListRowHover === rk;
                            const homeMergeKey = mergeDocSelectionKey(doc.projectId, doc.id);
                            const homeMergeRowSelected = mergeSelectedKeys.has(homeMergeKey);
                            const homeMergeCheckboxColumn = mergedPackageNavigation === 'toc-hub';
                            return (
                              <tr
                                key={rk}
                                tabIndex={0}
                                role="button"
                                draggable={homeMergeCheckboxColumn}
                                onDragStart={
                                  homeMergeCheckboxColumn
                                    ? (e) => {
                                      fillTocHubDocRefDragTransfer(e, doc.projectId, doc.id);
                                      if (homeMergeRowSelected && mergeSelectedKeys.size >= 1) {
                                        fillMergeDragDataTransfer(e);
                                      }
                                    }
                                    : undefined
                                }
                                aria-label={`Open ${doc.name}`}
                                onClick={() => navigate(href)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    navigate(href);
                                  }
                                }}
                                onMouseEnter={() => setRecentListRowHover(rk)}
                                onMouseLeave={() => setRecentListRowHover((id) => (id === rk ? null : id))}
                                style={{
                                  cursor: 'pointer',
                                  background: homeMergeRowSelected ? C.blueLight : (isHover ? '#FAFBFC' : '#fff'),
                                  transition: 'background 0.12s ease',
                                }}
                              >
                                {homeMergeCheckboxColumn ? (
                                  <td
                                    style={{ ...docListTdMeta, width: 44, textAlign: 'center', verticalAlign: 'middle' }}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={homeMergeRowSelected}
                                      readOnly
                                      tabIndex={-1}
                                      aria-label={`Select ${doc.name} for merge`}
                                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#4F6EF7' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleMergeDocSelection(doc.projectId, doc.id);
                                      }}
                                    />
                                  </td>
                                ) : null}
                                <td style={{ ...docListTdText, whiteSpace: 'normal' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', minWidth: 0 }}>
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      minWidth: 0,
                                    }}
                                    >
                                      <span style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                        minWidth: 0,
                                      }}
                                      >
                                        {doc.name}
                                      </span>
                                      {isDocInMergedPackage(projectMergedDocs, doc.projectId, doc.id) ? (
                                        <span
                                          className="merged-package-tag"
                                          role="img"
                                          aria-label="In a document package"
                                          title="In a document package"
                                          style={{
                                            flexShrink: 0,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: 4,
                                          }}
                                        >
                                          <Link2 size={12} strokeWidth={2.25} aria-hidden />
                                        </span>
                                      ) : null}
                                    </div>
                                    <PrdDocTableEditedUnderName prd={prd} />
                                  </div>
                                </td>
                                <td style={docListTdMuted}>{doc.projectName}</td>
                                <td
                                  style={prd ? docListTdCadFile : docListTdMuted}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  {prd?.cadFileLabel ? (
                                    <button
                                      type="button"
                                      title="Open Parts map"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openPartsMapForCad(prd.cadFileLabel);
                                      }}
                                      style={{
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        fontSize: 'inherit',
                                        fontWeight: 'inherit',
                                        color: '#4F6EF7',
                                        textDecoration: 'underline',
                                        textUnderlineOffset: 2,
                                        padding: 0,
                                        maxWidth: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        textAlign: 'left',
                                      }}
                                    >
                                      {prd.cadFileLabel}
                                    </button>
                                  ) : '—'}
                                </td>
                                <td style={docListTdStatus}>
                                  <PrdDocTableStatusStack prd={prd} />
                                </td>
                                <td style={{ ...docListTdMeta, verticalAlign: 'middle' }}>
                                  {prd ? (
                                    <span
                                      style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.3 }}
                                      title="Number of operations (steps) in this document"
                                    >
                                      {prd.operationCount === 1 ? '1 operation' : `${prd.operationCount} operations`}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td style={{ ...docListTdRight, paddingLeft: 8 }}>
                                  <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: 4,
                                    width: '100%',
                                  }}
                                  >
                                    {showDocLinkOnCards ? (
                                      <button
                                        type="button"
                                        title="Open Document links with this file as Start"
                                        aria-label={`Document links from ${doc.name}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          goToDocumentLinksFromDoc(doc.projectId, doc.id);
                                        }}
                                        style={{
                                          flexShrink: 0,
                                          width: 32,
                                          height: 32,
                                          borderRadius: 6,
                                          border: `1px solid rgba(79, 110, 247, 0.25)`,
                                          background: isHover ? C.blueLight : '#fff',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          cursor: 'pointer',
                                          color: C.blue,
                                          opacity: isHover ? 1 : 0.85,
                                          transition: 'opacity 0.12s ease, background 0.12s ease',
                                        }}
                                      >
                                        <GitBranch size={14} aria-hidden />
                                      </button>
                                    ) : null}
                                    {onDel ? (
                                      <button
                                        type="button"
                                        title="Delete document"
                                        aria-label={`Delete ${doc.name}`}
                                        onClick={(e) => { e.stopPropagation(); onDel(); }}
                                        style={{
                                          flexShrink: 0,
                                          width: 32,
                                          height: 32,
                                          borderRadius: 6,
                                          border: `1px solid ${C.cardBdr}`,
                                          background: '#fff',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          cursor: 'pointer',
                                          color: C.muted,
                                          opacity: isHover ? 1 : 0,
                                          pointerEvents: isHover ? 'auto' : 'none',
                                          transition: 'opacity 0.12s ease',
                                        }}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    ) : null}
                                    <ChevronRight size={18} color={C.muted} style={{ flexShrink: 0 }} aria-hidden />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {mergedPackageNavigation !== 'toc-hub' && allMergedAcross.length > 0 ? (
                  <div style={{ marginTop: 28 }}>
                    <h3 style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: C.text,
                      margin: '0 0 12px',
                      letterSpacing: '0.02em',
                    }}
                    >
                      {mergedDocumentsSectionTitle}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 16, marginTop: 4 }}>
                      {allMergedAcross.map(({ mega, projectId, projectName }) => {
                        const sourceNames = resolveMegaSourceDocNames(projectDocs, projectId, mega);
                        const mergedCardTitle = sourceNames.length
                          ? sourceNames.join(' · ')
                          : mega.editorDocName;
                        return (
                          <div
                            key={`${projectId}:${mega.id}`}
                            style={{
                              position: 'relative',
                              width: 220,
                              flexShrink: 0,
                              alignSelf: 'stretch',
                              display: 'flex',
                              flexDirection: 'column',
                              border: `1px solid ${C.cardBdr}`,
                              borderRadius: 10,
                              background: '#fff',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                              padding: '14px 14px 12px',
                              cursor: 'pointer',
                            }}
                            role="button"
                            tabIndex={0}
                            onClick={() => openMergedPackage(mega, projectId)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openMergedPackage(mega, projectId);
                              }
                            }}
                          >
                            {allowDeleteProjectsAndDocuments ? (
                              <button
                                type="button"
                                title="Remove merged package"
                                aria-label={`Remove merged document ${mergedCardTitle}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeMergedDocument(projectId, mega.id);
                                }}
                                style={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  width: 28,
                                  height: 28,
                                  borderRadius: 6,
                                  border: `1px solid ${C.cardBdr}`,
                                  background: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: C.muted,
                                  zIndex: 1,
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            ) : null}
                            <div style={{ paddingRight: allowDeleteProjectsAndDocuments ? 32 : 0 }}>
                              <div style={{ marginBottom: 8 }}>
                                <MergedPackageTag />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                <div style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 8,
                                  background: C.blueLight,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                                >
                                  <Layers size={18} color={C.blue} aria-hidden />
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: C.text,
                                    lineHeight: 1.3,
                                    wordBreak: 'break-word',
                                  }}
                                  >
                                    {mergedCardTitle}
                                  </div>
                                  <div style={{
                                    fontSize: 11,
                                    color: C.muted,
                                    marginTop: 6,
                                    lineHeight: 1.35,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  >
                                    {projectName}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {mergedPackageNavigation === 'toc-hub' && megadocumentEmptyState && allMergedAcross.length === 0 ? (
                  <div style={{ marginTop: 32 }}>
                    <h3 style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: C.text,
                      margin: '0 0 8px',
                      letterSpacing: '0.02em',
                    }}
                    >
                      {mergedDocumentsSectionTitle}
                    </h3>
                    <p style={{ fontSize: 13, color: C.muted, margin: '0 0 18px', lineHeight: 1.5, maxWidth: 520 }}>
                      Packages group documents into one deliverable. Select files in the list above and use Merge documents, or simulate an imported package below.
                    </p>
                    <div style={{ maxWidth: 480 }}>
                      <EmptyImportPanel
                        title="No document packages"
                        description="Simulate importing a merged package (two member files + one package). Or create your own by selecting documents and merging."
                        browseLabel="Simulate package import"
                        inputAccept=".zip,.pdf"
                        onFilesSelected={simulateMergedPackageImport}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })()}

          {/* ── Project view ── */}
          {view === 'project' && selectedProject && (
            <div style={{ padding: '40px 44px' }}>
              {/* Editable project heading */}
              <div style={{
                marginBottom: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
              >
                {editing?.id === selectedProject.id ? (
                  <input
                    ref={editInputRef}
                    value={editing.value}
                    onChange={e => setEditing(prev => ({ ...prev, value: e.target.value }))}
                    onBlur={commitEdit}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') setEditing(null);
                    }}
                    style={{
                      fontSize: 32, fontWeight: 700, color: C.text,
                      border: 'none', borderBottom: `2px solid ${C.blue}`,
                      background: 'transparent', outline: 'none',
                      padding: '2px 0', fontFamily: 'inherit', width: 460,
                    }}
                  />
                ) : (
                  <h1
                    onDoubleClick={() => startEdit(selectedProject)}
                    title="Double-click to rename"
                    style={{
                      fontSize: 32, fontWeight: 700, color: C.text,
                      margin: 0, cursor: 'text', display: 'inline-block',
                    }}
                  >
                    {selectedProject.name}
                  </h1>
                )}
                {!showPrdCadFlow ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {mergeSelectedKeys.size >= 1 ? (
                      <>
                        <span style={{ fontSize: 13, color: C.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {mergeSelectedKeys.size}
                          {' '}
                          selected
                        </span>
                        <button
                          type="button"
                          onClick={clearMergeDocSelection}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 12px',
                            borderRadius: 7,
                            border: `1px solid ${C.cardBdr}`,
                            background: '#fff',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            color: C.text,
                            fontFamily: 'inherit',
                          }}
                        >
                          Clear
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={openCreateDocumentModal}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        borderRadius: 7,
                        border: 'none',
                        background: C.blue,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#fff',
                        fontFamily: 'inherit',
                        boxShadow: '0 1px 2px rgba(79, 110, 247, 0.25)',
                      }}
                    >
                      <Plus size={16} aria-hidden />
                      New document
                    </button>
                    <div
                      role="tablist"
                      aria-label="Document layout"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                        padding: 3,
                        background: '#E5E7EB',
                        borderRadius: 9,
                        border: `1px solid ${C.cardBdr}`,
                      }}
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-label="Tiles"
                        aria-selected={(projectDocViewMode[selectedId] ?? 'tiles') === 'tiles'}
                        onClick={() => setProjectDocViewMode((prev) => ({ ...prev, [selectedId]: 'tiles' }))}
                        style={docLayoutSegmentBtnStyle((projectDocViewMode[selectedId] ?? 'tiles') === 'tiles')}
                      >
                        <LayoutGrid size={15} aria-hidden />
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-label="List"
                        aria-selected={(projectDocViewMode[selectedId] ?? 'tiles') === 'list'}
                        onClick={() => setProjectDocViewMode((prev) => ({ ...prev, [selectedId]: 'list' }))}
                        style={docLayoutSegmentBtnStyle((projectDocViewMode[selectedId] ?? 'tiles') === 'list')}
                      >
                        <List size={15} aria-hidden />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* PRD Workflow 1 — CAD onboarding (no documents yet) */}
              {showPrdCadFlow && (
                <Des36PrdCadOnboarding
                  key={`${selectedId}-${prdOnboardingSafe.phase}`}
                  projectName={selectedProject.name}
                  onboarding={prdOnboardingSafe}
                  onUpdate={handlePrdOnboardingUpdate}
                  onGoToProject={handlePrdGoToProject}
                  onAnalysisDone={handlePrdAnalysisDone}
                  onGenerateComplete={handlePrdGenerateComplete}
                  fileInputRef={cadFileInputRef}
                />
              )}

              {/* Documents: tiles vs list (per project) */}
              {!showPrdCadFlow && (() => {
                const docLayout = projectDocViewMode[selectedId] ?? 'tiles';
                const setDocLayout = (mode) => {
                  setProjectDocViewMode((prev) => ({ ...prev, [selectedId]: mode }));
                };
                return (
                  <>
                    {projectConnectionGraph && selectedId === MOCK_WELD_FRAME_PROJECT_ID ? (
                      <div style={{ marginBottom: 20 }}>
                        <div
                          role="tablist"
                          aria-label="Project workspace"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2,
                            padding: 3,
                            background: '#E5E7EB',
                            borderRadius: 9,
                            border: `1px solid ${C.cardBdr}`,
                          }}
                        >
                          <button
                            type="button"
                            role="tab"
                            aria-selected={projectMainTab === 'documents'}
                            onClick={() => setProjectMainTab('documents')}
                            style={docLayoutSegmentBtnStyle(projectMainTab === 'documents')}
                          >
                            Documents
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={projectMainTab === 'graph'}
                            onClick={() => setProjectMainTab('graph')}
                            style={docLayoutSegmentBtnStyle(projectMainTab === 'graph')}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <GitBranch size={15} aria-hidden />
                              Connection graph
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {projectConnectionGraph && selectedId === MOCK_WELD_FRAME_PROJECT_ID && projectMainTab === 'graph' ? (
                      <ProjectConnectionGraphCanvas
                        graph={mockWeldFrameProject}
                        projectId={selectedId}
                        onOpenDocument={(name) => navigate(editorHref(name, false, editorPrototypePath))}
                        onCadFileClick={(label) => openPartsMapForCad(label)}
                      />
                    ) : (
                    <>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      marginBottom: docLayout === 'list' ? 0 : 20,
                      flexWrap: 'wrap',
                    }}
                    >
                      {(projectConnectionGraph && selectedId === MOCK_WELD_FRAME_PROJECT_ID)
                      || (documentConnectionSandbox && (showDocumentLinksInSidebar || showDocumentCardFooter)) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                          {projectConnectionGraph && selectedId === MOCK_WELD_FRAME_PROJECT_ID ? (
                            <span style={{ fontSize: 12, color: C.muted, fontWeight: 400, lineHeight: 1.4, maxWidth: 560 }}>
                              The interactive entity map (WI, CAD, tools, ops, people) is on the{' '}
                              <strong style={{ color: C.text }}>Connection graph</strong> tab above.
                            </span>
                          ) : null}
                          {documentConnectionSandbox && (showDocumentLinksInSidebar || showDocumentCardFooter) ? (
                            <span style={{ fontSize: 12, color: C.muted, fontWeight: 400, lineHeight: 1.4, maxWidth: 560 }}>
                              {showDocumentLinksInSidebar && showDocumentCardFooter ? (
                                <>
                                  Trace relationships between files: open <strong style={{ color: C.text }}>Document links</strong> in the sidebar,
                                  use <strong style={{ color: C.text }}>Link…</strong> on a card, or in <strong style={{ color: C.text }}>list</strong> view click the branch icon at the end of a row.
                                </>
                              ) : showDocumentLinksInSidebar ? (
                                <>
                                  Trace relationships between files: open <strong style={{ color: C.text }}>Document links</strong> in the sidebar.
                                </>
                              ) : (
                                <>
                                  Trace relationships between files: use <strong style={{ color: C.text }}>Link…</strong> on a card, or in <strong style={{ color: C.text }}>list</strong> view click the branch icon at the end of a row.
                                </>
                              )}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      <div style={{ flex: 1, minWidth: 8 }} />
                    </div>

                    {megadocumentEmptyState && !showPrdCadFlow && docs.length === 0 ? (
                      <div style={{
                        marginBottom: 20,
                        fontSize: 13,
                        color: C.muted,
                        lineHeight: 1.5,
                        maxWidth: 520,
                      }}
                      >
                        No documents in this project yet. Use <strong style={{ color: C.text, fontWeight: 600 }}>New document</strong> to create one.
                      </div>
                    ) : null}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      margin: '0 0 12px',
                      flexWrap: 'wrap',
                    }}
                    >
                      <h3 style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: C.text,
                        margin: 0,
                        letterSpacing: '0.02em',
                      }}
                      >
                        Documents
                      </h3>
                    </div>

                    {docLayout === 'tiles' ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 16 }}>
                        {docs.map((doc) => {
                          const href = editorHref(doc.name, false, editorPrototypePath);
                          const onDel = allowDeleteProjectsAndDocuments
                            ? () => setConfirmDeleteDoc({ projectId: selectedId, doc })
                            : undefined;
                          const prd = resolvePrdCard(doc, prdOnboarding);
                          const inPkg = isDocInMergedPackage(projectMergedDocs, selectedId, doc.id);
                          if (prd) {
                            return (
                              <Des36PrdDocCard
                                key={doc.id}
                                name={doc.name}
                                stateLabel={prd.stateLabel}
                                lastUpdated={prd.lastUpdated}
                                documentLastEdited={prd.documentLastEdited}
                                accentKey={prd.accentKey}
                                operationCount={prd.operationCount}
                                cadFileLabel={prd.cadFileLabel}
                                cadVersion={prd.cadVersion}
                                cadChangeSummary={prd.cadChangeSummary}
                                cadDiffAdded={prd.cadDiffAdded}
                                cadDiffRemoved={prd.cadDiffRemoved}
                                cadDiffModified={prd.cadDiffModified}
                                docId={doc.id}
                                projectId={selectedId}
                                onRenameDocument={renameDocument}
                                onCadFileLabelClick={openPartsMapForCad}
                                onClick={() => navigate(href)}
                                onDelete={onDel}
                                onOpenDocumentLinks={showDocLinkOnCards
                                  ? () => goToDocumentLinksFromDoc(selectedId, doc.id)
                                  : undefined}
                                showFooter={showDocumentCardFooter}
                                mergeSelectMode
                                mergeSelectionViaCheckboxOnly
                                mergeSelected={mergeSelectedKeys.has(mergeDocSelectionKey(selectedId, doc.id))}
                                onMergeToggle={() => toggleMergeDocSelection(selectedId, doc.id)}
                                mergeDraggable={
                                  mergeSelectedKeys.has(mergeDocSelectionKey(selectedId, doc.id))
                                  && mergeSelectedKeys.size >= (mergedPackageNavigation === 'toc-hub' ? 1 : 2)
                                }
                                onMergeDragStart={fillMergeDragDataTransfer}
                                onDocRefDragStart={
                                  mergedPackageNavigation === 'toc-hub'
                                    ? (e) => fillTocHubDocRefDragTransfer(e, selectedId, doc.id)
                                    : undefined
                                }
                                inDocumentPackage={inPkg}
                              />
                            );
                          }
                          return (
                            <DocTile
                              key={doc.id}
                              name={doc.name}
                              onClick={() => navigate(href)}
                              onDelete={onDel}
                              onOpenDocumentLinks={showDocLinkOnCards
                                ? () => goToDocumentLinksFromDoc(selectedId, doc.id)
                                : undefined}
                              mergeSelectMode
                              mergeSelectionViaCheckboxOnly
                              mergeSelected={mergeSelectedKeys.has(mergeDocSelectionKey(selectedId, doc.id))}
                              onMergeToggle={() => toggleMergeDocSelection(selectedId, doc.id)}
                              mergeDraggable={
                                mergeSelectedKeys.has(mergeDocSelectionKey(selectedId, doc.id))
                                && mergeSelectedKeys.size >= (mergedPackageNavigation === 'toc-hub' ? 1 : 2)
                              }
                              onMergeDragStart={fillMergeDragDataTransfer}
                              onDocRefDragStart={
                                mergedPackageNavigation === 'toc-hub'
                                  ? (e) => fillTocHubDocRefDragTransfer(e, selectedId, doc.id)
                                  : undefined
                              }
                              inDocumentPackage={inPkg}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div style={docListTableBleedWrap}>
                        <div style={{
                          background: '#fff',
                          borderTop: `1px solid ${C.cardBdr}`,
                          borderBottom: `1px solid ${C.cardBdr}`,
                        }}
                        >
                          <table
                            style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              tableLayout: 'fixed',
                            }}
                          >
                            <thead>
                              <tr>
                                <th
                                  scope="col"
                                  style={{ ...docListThStyle, width: 44, textAlign: 'center' }}
                                  aria-label="Select for merge"
                                />
                                <th scope="col" style={docListThStyle}>Document</th>
                                <th scope="col" style={docListThStyle}>CAD file</th>
                                <th scope="col" style={docListThStyle}>Status</th>
                                <th scope="col" style={{ ...docListThStyle, width: 120 }}>Operations</th>
                                <th
                                  scope="col"
                                  aria-label="Actions"
                                  style={{
                                    ...docListThStyle,
                                    width: showDocLinkOnCards ? 124 : 88,
                                    textAlign: 'right',
                                  }}
                                />
                              </tr>
                            </thead>
                            <tbody>
                              {docs.map((doc) => {
                                const href = editorHref(doc.name, false, editorPrototypePath);
                                const onDel = allowDeleteProjectsAndDocuments
                                  ? () => setConfirmDeleteDoc({ projectId: selectedId, doc })
                                  : undefined;
                                const prd = resolvePrdCard(doc, prdOnboarding);
                                const isHover = projectListRowHover === doc.id;
                                const mergeRowSelected = mergeSelectedKeys.has(
                                  mergeDocSelectionKey(selectedId, doc.id),
                                );
                                return (
                                  <tr
                                    key={doc.id}
                                    tabIndex={0}
                                    role="button"
                                    draggable={
                                      mergedPackageNavigation === 'toc-hub'
                                      || (mergeRowSelected && mergeSelectedKeys.size >= 2)
                                    }
                                    onDragStart={
                                      mergedPackageNavigation === 'toc-hub'
                                      || (mergeRowSelected && mergeSelectedKeys.size >= 2)
                                        ? (e) => {
                                          if (mergedPackageNavigation === 'toc-hub') {
                                            fillTocHubDocRefDragTransfer(e, selectedId, doc.id);
                                          }
                                          const minK = mergedPackageNavigation === 'toc-hub' ? 1 : 2;
                                          if (mergeRowSelected && mergeSelectedKeys.size >= minK) {
                                            fillMergeDragDataTransfer(e);
                                          }
                                        }
                                        : undefined
                                    }
                                    aria-label={`Open ${doc.name}`}
                                    onClick={() => navigate(href)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        navigate(href);
                                      }
                                    }}
                                    onMouseEnter={() => setProjectListRowHover(doc.id)}
                                    onMouseLeave={() => setProjectListRowHover((id) => (id === doc.id ? null : id))}
                                    style={{
                                      cursor: 'pointer',
                                      background: mergeRowSelected ? C.blueLight : (isHover ? '#FAFBFC' : '#fff'),
                                      transition: 'background 0.12s ease',
                                    }}
                                  >
                                    <td
                                      style={{ ...docListTdMeta, width: 44, textAlign: 'center', verticalAlign: 'middle' }}
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={mergeRowSelected}
                                        readOnly
                                        tabIndex={-1}
                                        aria-label={`Select ${doc.name} for merge`}
                                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#4F6EF7' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleMergeDocSelection(selectedId, doc.id);
                                        }}
                                      />
                                    </td>
                                    <td style={{ ...docListTdText, whiteSpace: 'normal' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', minWidth: 0 }}>
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 8,
                                          minWidth: 0,
                                        }}
                                        >
                                          <span style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            flex: 1,
                                            minWidth: 0,
                                          }}
                                          >
                                            {doc.name}
                                          </span>
                                          {isDocInMergedPackage(projectMergedDocs, selectedId, doc.id) ? (
                                            <span
                                              className="merged-package-tag"
                                              role="img"
                                              aria-label="In a document package"
                                              title="In a document package"
                                              style={{
                                                flexShrink: 0,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: 4,
                                              }}
                                            >
                                              <Link2 size={12} strokeWidth={2.25} aria-hidden />
                                            </span>
                                          ) : null}
                                        </div>
                                        <PrdDocTableEditedUnderName prd={prd} />
                                      </div>
                                    </td>
                                    <td
                                      style={prd ? docListTdCadFile : docListTdMuted}
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => e.stopPropagation()}
                                    >
                                      {prd?.cadFileLabel ? (
                                        <button
                                          type="button"
                                          title="Open Parts map"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openPartsMapForCad(prd.cadFileLabel);
                                          }}
                                          style={{
                                            border: 'none',
                                            background: 'none',
                                            cursor: 'pointer',
                                            fontFamily: 'inherit',
                                            fontSize: 'inherit',
                                            fontWeight: 'inherit',
                                            color: '#4F6EF7',
                                            textDecoration: 'underline',
                                            textUnderlineOffset: 2,
                                            padding: 0,
                                            maxWidth: '100%',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            textAlign: 'left',
                                          }}
                                        >
                                          {prd.cadFileLabel}
                                        </button>
                                      ) : '—'}
                                    </td>
                                    <td style={docListTdStatus}>
                                      <PrdDocTableStatusStack prd={prd} />
                                    </td>
                                    <td style={{ ...docListTdMeta, verticalAlign: 'middle' }}>
                                      {prd ? (
                                        <span
                                          style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.3 }}
                                          title="Number of operations (steps) in this document"
                                        >
                                          {prd.operationCount === 1 ? '1 operation' : `${prd.operationCount} operations`}
                                        </span>
                                      ) : '—'}
                                    </td>
                                    <td
                                      style={{
                                        ...docListTdRight,
                                        paddingLeft: 8,
                                      }}
                                    >
                                      <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        gap: 4,
                                        width: '100%',
                                      }}
                                      >
                                        {showDocLinkOnCards ? (
                                          <button
                                            type="button"
                                            title="Open Document links with this file as Start"
                                            aria-label={`Document links from ${doc.name}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              goToDocumentLinksFromDoc(selectedId, doc.id);
                                            }}
                                            style={{
                                              flexShrink: 0,
                                              width: 32,
                                              height: 32,
                                              borderRadius: 6,
                                              border: `1px solid rgba(79, 110, 247, 0.25)`,
                                              background: isHover ? C.blueLight : '#fff',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              cursor: 'pointer',
                                              color: C.blue,
                                              opacity: isHover ? 1 : 0.85,
                                              transition: 'opacity 0.12s ease, background 0.12s ease',
                                            }}
                                          >
                                            <GitBranch size={14} aria-hidden />
                                          </button>
                                        ) : null}
                                        {onDel ? (
                                          <button
                                            type="button"
                                            title="Delete document"
                                            aria-label={`Delete ${doc.name}`}
                                            onClick={(e) => { e.stopPropagation(); onDel(); }}
                                            style={{
                                              flexShrink: 0,
                                              width: 32,
                                              height: 32,
                                              borderRadius: 6,
                                              border: `1px solid ${C.cardBdr}`,
                                              background: '#fff',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              cursor: 'pointer',
                                              color: C.muted,
                                              opacity: isHover ? 1 : 0,
                                              pointerEvents: isHover ? 'auto' : 'none',
                                              transition: 'opacity 0.12s ease',
                                            }}
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        ) : null}
                                        <ChevronRight size={18} color={C.muted} style={{ flexShrink: 0 }} aria-hidden />
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {docs.length === 0 ? (
                            <div style={{
                              padding: '28px 16px',
                              textAlign: 'center',
                              fontSize: 14,
                              color: C.muted,
                              borderTop: `1px solid ${C.cardBdr}`,
                            }}
                            >
                              No documents yet. Use New document above.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 28 }}>
                      <div style={{
                        margin: '0 0 12px',
                      }}
                      >
                        <h3 style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.text,
                          margin: 0,
                          letterSpacing: '0.02em',
                        }}
                        >
                          {mergedDocumentsSectionTitle}
                        </h3>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 16, marginTop: 4 }}>
                        <div
                          onDragOver={(e) => {
                            if (!dataTransferHasDocRefOrMergeKeys(e.dataTransfer)) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'copy';
                          }}
                          onDragEnter={(e) => {
                            if (!dataTransferHasDocRefOrMergeKeys(e.dataTransfer)) return;
                            e.preventDefault();
                            setMegaAppendDropRowKey(`project-packages-create:${selectedId}`);
                          }}
                          onDragLeave={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget)) {
                              setMegaAppendDropRowKey((k) => (
                                k === `project-packages-create:${selectedId}` ? null : k
                              ));
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setMegaAppendDropRowKey((k) => (
                              k === `project-packages-create:${selectedId}` ? null : k
                            ));
                            const refs = collectRefsFromPackageDropDataTransfer(e.dataTransfer);
                            if (refs.length >= 1) {
                              mergeIntoPackageFromKeys(
                                refs.map((r) => mergeDocSelectionKey(r.projectId, r.docId)),
                                { ownerProjectId: selectedId },
                              );
                            }
                          }}
                          style={{
                            width: 220,
                            minHeight: 138,
                            flexShrink: 0,
                            alignSelf: 'stretch',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: 8,
                            border: `2px dashed ${megaAppendDropRowKey === `project-packages-create:${selectedId}` ? C.blue : C.cardBdr}`,
                            borderRadius: 10,
                            background: megaAppendDropRowKey === `project-packages-create:${selectedId}` ? '#F5F7FF' : '#FAFBFC',
                            padding: '14px',
                          }}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: C.blue, fontWeight: 600, fontSize: 13 }}>
                            <LayersPlusIcon size={16} />
                            New document package
                          </div>
                          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>
                            Drop documents and/or files here to create a new package.
                          </div>
                        </div>
                        {mergedDocs.map((mega) => {
                            const sourceNames = resolveMegaSourceDocNames(projectDocs, selectedId, mega);
                            const mergedCardTitle = sourceNames.length
                              ? sourceNames.join(' · ')
                              : mega.editorDocName;
                            const cardDropKey = `project-card:${selectedId}:${mega.id}`;
                            const cardDropHighlight = megaAppendDropRowKey === cardDropKey;
                            return (
                              <div
                                key={mega.id}
                                onDragOver={(e) => {
                                  if (!dataTransferHasDocRefOrMergeKeys(e.dataTransfer)) return;
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'copy';
                                }}
                                onDragEnter={(e) => {
                                  if (!dataTransferHasDocRefOrMergeKeys(e.dataTransfer)) return;
                                  e.preventDefault();
                                  setMegaAppendDropRowKey(cardDropKey);
                                }}
                                onDragLeave={(e) => {
                                  if (!e.currentTarget.contains(e.relatedTarget)) {
                                    setMegaAppendDropRowKey((k) => (k === cardDropKey ? null : k));
                                  }
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setMegaAppendDropRowKey((k) => (k === cardDropKey ? null : k));
                                  const refs = collectRefsFromPackageDropDataTransfer(e.dataTransfer);
                                  if (refs.length) appendDocumentsToMega(selectedId, mega.id, refs);
                                }}
                                style={{
                                  position: 'relative',
                                  width: 220,
                                  flexShrink: 0,
                                  alignSelf: 'stretch',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  border: `1px solid ${C.cardBdr}`,
                                  borderRadius: 10,
                                  background: '#fff',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                                  padding: '14px 14px 12px',
                                  cursor: 'pointer',
                                  outline: cardDropHighlight ? `2px dashed ${C.blue}` : undefined,
                                  outlineOffset: cardDropHighlight ? 2 : undefined,
                                }}
                                role="button"
                                tabIndex={0}
                                onClick={() => openMergedPackage(mega, selectedId)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openMergedPackage(mega, selectedId);
                                  }
                                }}
                              >
                                {allowDeleteProjectsAndDocuments ? (
                                  <button
                                    type="button"
                                    title="Remove merged package"
                                    aria-label={`Remove merged document ${mergedCardTitle}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeMergedDocument(selectedId, mega.id);
                                    }}
                                    style={{
                                      position: 'absolute',
                                      top: 8,
                                      right: 8,
                                      width: 28,
                                      height: 28,
                                      borderRadius: 6,
                                      border: `1px solid ${C.cardBdr}`,
                                      background: '#fff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      color: C.muted,
                                      zIndex: 1,
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                ) : null}
                                <div style={{ paddingRight: allowDeleteProjectsAndDocuments ? 32 : 0 }}>
                                  <div style={{ marginBottom: 8 }}>
                                    <MergedPackageTag />
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                    <div style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: 8,
                                      background: C.blueLight,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}
                                    >
                                      <Layers size={18} color={C.blue} aria-hidden />
                                    </div>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: C.text,
                                        lineHeight: 1.3,
                                        wordBreak: 'break-word',
                                      }}
                                      >
                                        {mergedCardTitle}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                        })}
                      </div>
                    </div>

                    </>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* ── Parts library (table: parts / CAD → documents) ── */}
          {!projectConnectionGraph && view === 'parts-library' && (
            <PartsLibraryView
              storageKey={storageKey}
              navigate={navigate}
              editorPrototypePath={editorPrototypePath}
              placeholderOnly={megadocumentEmptyState}
              onCreateProject={addProject}
            />
          )}

          {/* ── Tool Library view ── */}
          {view === 'tool-library' && (
            <ToolLibraryView
              storageKey={storageKey}
              showUsedInDesignReview={toolLibraryUsedInDesignReview}
              preferEmptyToolLibrary={megadocumentEmptyState}
              requestOpenAddToolModal={homeToolModalRequest}
            />
          )}

          {view === 'reusable-procedures' && (
            <div style={{ padding: '40px 44px', maxWidth: 720 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: '0 0 12px' }}>
                Reusable Procedures
              </h2>
              <p style={{ fontSize: 15, color: C.muted, margin: 0, lineHeight: 1.5 }}>
                TBD
              </p>
            </div>
          )}

          {documentConnectionSandbox && view === 'doc-connections' && (
            <DocumentConnectionsPanel
              projects={projectsSafe}
              projectDocs={projectDocs}
              documentLinks={documentLinks}
              setDocumentLinks={setDocumentLinks}
              openDocument={(docName) => navigate(editorHref(docName, false, editorPrototypePath))}
              palette={C}
              linkSourceDraft={linkSourceDraft}
              onConsumedLinkSource={consumeLinkDraft}
              onGoHome={() => { setSelectedId(null); setView('home'); }}
              onCreateProject={addProject}
              onLoadSampleProject={loadSampleConnectionDemo}
            />
          )}
        </div>
      </div>

      {/* ── Delete project confirm ─────────────────────────────────────────── */}
      {/* ── Delete project confirm ─────────────────────────────────────────── */}
      {projectPendingDelete && (
        <div
          onClick={() => setConfirmDeleteProjectId(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 12,
              padding: '28px 28px 22px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
              maxWidth: 400, width: '90%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Trash2 size={18} color="#EF4444" />
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Delete project?</span>
            </div>
            <p style={{ fontSize: 14, color: C.sub, margin: '0 0 22px', lineHeight: 1.5 }}>
              <strong style={{ color: C.text }}>{projectPendingDelete.name}</strong> and all of its documents will be removed from this browser. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteProjectId(null)}
                style={{
                  padding: '8px 18px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                  border: `1px solid ${C.cardBdr}`, background: '#fff',
                  color: C.text, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => performDeleteProject(confirmDeleteProjectId)}
                style={{
                  padding: '8px 18px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                  border: 'none', background: '#EF4444',
                  color: '#fff', cursor: 'pointer',
                }}
              >
                Delete project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete document confirm ────────────────────────────────────────── */}
      {confirmDeleteDoc && (
        <div
          onClick={() => setConfirmDeleteDoc(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 12,
              padding: '28px 28px 22px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
              maxWidth: 400, width: '90%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Trash2 size={18} color="#EF4444" />
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Delete document?</span>
            </div>
            <p style={{ fontSize: 14, color: C.sub, margin: '0 0 22px', lineHeight: 1.5 }}>
              <strong style={{ color: C.text }}>{confirmDeleteDoc.doc.name}</strong> will be removed from the project. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                style={{
                  padding: '8px 18px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                  border: `1px solid ${C.cardBdr}`, background: '#fff',
                  color: C.text, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => performDeleteDocument(confirmDeleteDoc.projectId, confirmDeleteDoc.doc)}
                style={{
                  padding: '8px 18px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                  border: 'none', background: '#EF4444',
                  color: '#fff', cursor: 'pointer',
                }}
              >
                Delete document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create document modal ───────────────────────────────────────────── */}
      {showModal && (
        <CreateDocModal
          documentName={newDocName}
          cadName={newDocCadName}
          templateId={newDocTemplateId}
          templates={DOCUMENT_CREATE_TEMPLATES}
          onDocumentNameChange={setNewDocName}
          onCadNameChange={setNewDocCadName}
          onTemplateChange={setNewDocTemplateId}
          onCreate={createDoc}
          onClose={() => {
            setShowModal(false);
            setNewDocName('');
            setNewDocCadName('');
            setNewDocTemplateId('blank');
          }}
        />
      )}

      {/* ── Add plugin (CAD integrations) ─────────────────────────────────── */}
      {addPluginModalOpen && (
        <div
          role="presentation"
          onClick={closeAddPluginModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            role="dialog"
            aria-labelledby="add-plugin-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 12,
              padding: '24px 26px 22px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
              maxWidth: 440, width: '90%',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 14,
            }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: C.blueLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
                >
                  <Plug size={20} color={C.blue} strokeWidth={2} aria-hidden />
                </div>
                <div>
                  <div id="add-plugin-modal-title" style={{ fontSize: 17, fontWeight: 700, color: C.text }}>
                    Add plugin
                  </div>
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                    Connect CAD from authoring tools
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeAddPluginModal}
                style={{
                  flexShrink: 0,
                  width: 34, height: 34, borderRadius: 8,
                  border: `1px solid ${C.cardBdr}`, background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: C.muted,
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Available Plugins */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: C.muted,
                letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8,
              }}
              >
                Available Plugins
              </div>
              {!solidworksConnected ? (
                <div style={{
                  border: `1px solid ${C.cardBdr}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                  background: '#FAFAFB',
                }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                    SolidWorks
                  </div>
                  <p style={{ fontSize: 13, color: C.sub, margin: '0 0 12px', lineHeight: 1.5 }}>
                    Launches the SolidWorks desktop app when a URL handler is installed (q20 add-in). Approve any browser or Windows prompt, then finish setup in SolidWorks.
                  </p>
                  {solidworksConnecting ? (
                    <div style={{ fontSize: 13, color: C.sub, fontWeight: 500 }}>
                      Opening SolidWorks…
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectSolidworks}
                      style={{
                        padding: '9px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                        border: 'none', background: C.blue,
                        color: '#fff', cursor: 'pointer',
                      }}
                    >
                      Open SolidWorks
                    </button>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: C.sub, margin: 0, lineHeight: 1.5 }}>
                  No other plugins to add in this prototype.
                </p>
              )}
            </div>

            {/* Connected Plugins */}
            <div style={{ marginBottom: 22 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: C.muted,
                letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8,
              }}
              >
                Connected Plugins
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {!megadocumentEmptyState ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      border: '1px solid rgba(79, 110, 247, 0.14)',
                      background: '#EEF2FF',
                      color: C.blue,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '5px 10px',
                      borderRadius: 5,
                      lineHeight: 1.2,
                    }}
                  >
                    <Check size={12} strokeWidth={2.5} aria-hidden style={{ opacity: 0.85 }} />
                    Onshape
                  </span>
                ) : null}
                {solidworksConnected ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      border: '1px solid rgba(16, 185, 129, 0.28)',
                      background: '#ECFDF5',
                      color: '#047857',
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '5px 10px',
                      borderRadius: 5,
                      lineHeight: 1.2,
                    }}
                  >
                    <Check size={12} strokeWidth={2.5} aria-hidden style={{ opacity: 0.85 }} />
                    SolidWorks
                  </span>
                ) : null}
                {megadocumentEmptyState && !solidworksConnected ? (
                  <span style={{ fontSize: 13, color: C.sub, lineHeight: 1.45 }}>
                    No CAD plugins connected yet.
                  </span>
                ) : null}
              </div>
              <p style={{ fontSize: 12, color: C.muted, margin: '8px 0 0', lineHeight: 1.45 }}>
                {megadocumentEmptyState && !solidworksConnected
                  ? 'Add a plugin from the list above when you are ready — this screen matches an account with no integrations yet.'
                  : 'These plugins are active for q20 in this browser session.'}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={closeAddPluginModal}
                style={{
                  padding: '9px 20px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                  border: 'none', background: C.blue,
                  color: '#fff', cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      <PrototypeSwitcher />
    </div>
  );
}
