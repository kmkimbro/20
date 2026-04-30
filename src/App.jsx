import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { usePrototype, hasScreenshotCapture } from './contexts/PrototypeContext.jsx';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import CadView from './components/CadView.jsx';
import Toolbar from './components/Toolbar.jsx';
import Canvas from './components/Canvas.jsx';
import ScreenshotModal from './components/ScreenshotModal.jsx';
import ToolsLibraryModal from './components/ToolsLibraryModal.jsx';
import PrototypeSwitcher from './components/PrototypeSwitcher.jsx';
import WireframeFlowView from './components/WireframeFlowView.jsx';
import ToolsBomView from './components/toolsBom/ToolsBomView.jsx';
import { useViewMode } from './contexts/ViewModeContext.jsx';
import {
  getPageContext,
  findNode,
  addSubPageToOwner,
  removeSubPage,
  reorderSubPages,
  reorderSuboperations,
  reorderOperations,
  addOperation,
  addPartToOperation,
  buildPageList,
  isSubPageId,
  getTopLevelOperationId,
  removeToolFromOperations,
  addToolIdToOperation,
  removeToolIdFromOperation,
  replaceToolIdInOperation,
  removePartFromOperation,
  renamePartInOperation,
  replacePartInOperation,
  reorderPartsInOperation,
  reorderToolIdsInOperation,
} from './lib/docTree.js';
import { INITIAL_OPERATIONS } from './config/sampleData.js';
import { PARTS_CATALOG_INITIAL, TOOLS_BOM_INITIAL } from './data/toolsBom.js';
import { buildStackedMegaOperations, parseMegaOfParam } from './lib/megaDocMerge.js';

function readInitialMegaOperations() {
  if (typeof window === 'undefined') return INITIAL_OPERATIONS;
  try {
    const ids = parseMegaOfParam(new URLSearchParams(window.location.search).get('megaOf'));
    if (ids) return buildStackedMegaOperations(ids).operations;
  } catch { /* ignore */ }
  return INITIAL_OPERATIONS;
}

function readInitialMegaActivePage() {
  if (typeof window === 'undefined') return 'op1';
  try {
    const ids = parseMegaOfParam(new URLSearchParams(window.location.search).get('megaOf'));
    if (ids) return 'm0-op1';
  } catch { /* ignore */ }
  return 'op1';
}

let nextId = 1;

function newEntityId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 240;

// Tool library (parts + tools tables) is always on across every prototype

export default function App() {
  const { conceptId } = usePrototype();
  const { viewMode } = useViewMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const [navActive, setNavActive] = useState(searchParams.get('nav') === 'cad' ? 'cad' : 'doc');
  const [docTitle, setDocTitle] = useState(searchParams.get('docName') ?? undefined);
  const emptyCad = searchParams.get('empty') === '1';
  const des36BannerKind = searchParams.get('des36Banner'); // 'auto' | 'review' | null
  const des36StateParam = searchParams.get('des36State');
  const packageDocVersionParam = searchParams.get('docVersion');
  const packageReadOnlyParam = searchParams.get('readOnly') === '1';
  const uploadedDocMode = searchParams.get('uploadedDoc') === '1';
  const editorBackToParam = searchParams.get('returnTo');
  const packageReadOnly = packageReadOnlyParam || (
    Boolean(packageDocVersionParam) && packageDocVersionParam !== 'Unpublished'
  ) || uploadedDocMode;
  const des36FlowActive = Boolean(des36BannerKind || des36StateParam);
  const [des36BannerDismissed, setDes36BannerDismissed] = useState(false);
  const [des36ChangesOpen, setDes36ChangesOpen] = useState(false);
  const [docLifecycle, setDocLifecycle] = useState(() => des36StateParam || 'Draft');
  const [approveNotifyShown, setApproveNotifyShown] = useState(false);
  const docNameParam = searchParams.get('docName');
  const navParam = searchParams.get('nav');
  const megaOfQuery = searchParams.get('megaOf') ?? '';
  const megaSourceIds = useMemo(() => parseMegaOfParam(megaOfQuery), [megaOfQuery]);
  const megaSections = useMemo(() => {
    if (!megaSourceIds) return null;
    return buildStackedMegaOperations(megaSourceIds).megaSections;
  }, [megaSourceIds]);

  /** Sidebar + CAD header: source names for merged editor, not the stored URL `docName` (e.g. legacy "Merged (…)"). */
  const editorChromeTitle = useMemo(() => {
    if (megaSections?.length) {
      const t = megaSections.map((s) => s.title).filter(Boolean).join(' · ');
      return t || 'Merged document';
    }
    return docTitle ?? 'Test Document 1';
  }, [megaSections, docTitle]);

  useEffect(() => {
    setDocTitle(docNameParam ?? undefined);
  }, [docNameParam]);

  useEffect(() => {
    const ids = parseMegaOfParam(megaOfQuery);
    if (ids) {
      setOperations(buildStackedMegaOperations(ids).operations);
      setActivePageId((p) => (typeof p === 'string' && /^m\d+-/.test(p) ? p : 'm0-op1'));
    } else {
      setOperations((prev) => {
        const isMegaTree = (prev || []).some((op) => /^m\d+-/.test(op?.id ?? ''));
        if (isMegaTree) return INITIAL_OPERATIONS;
        return prev;
      });
      setActivePageId((p) => (typeof p === 'string' && /^m\d+-/.test(p) ? 'op1' : p));
    }
  }, [megaOfQuery]);

  useEffect(() => {
    if (uploadedDocMode) {
      setNavActive('doc');
      return;
    }
    setNavActive(navParam === 'cad' ? 'cad' : 'doc');
  }, [navParam, uploadedDocMode]);

  useEffect(() => {
    if (des36StateParam) setDocLifecycle(des36StateParam);
  }, [des36StateParam]);

  useEffect(() => {
    setDes36BannerDismissed(false);
  }, [docNameParam, des36BannerKind]);

  const handleDocLifecycleChange = useCallback((next) => {
    setDocLifecycle(next);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('des36State', next);
      return p;
    }, { replace: true });
    if (next === 'Approved') {
      setApproveNotifyShown(true);
      window.setTimeout(() => setApproveNotifyShown(false), 6000);
    }
  }, [setSearchParams]);

  const showDes36DocBanner = Boolean(
    des36FlowActive && des36BannerKind && !des36BannerDismissed && navActive === 'doc',
  );
  const editorReadOnly = Boolean(
    packageReadOnly
    || (
      des36FlowActive && (docLifecycle === 'Approved' || docLifecycle === 'Technician mode')
    )
  );
  const showPackageReadOnlyBanner = packageReadOnly && navActive === 'doc';
  const hasBomTables = true;

  const handleDocTitleChange = useCallback((newName) => {
    setDocTitle(newName);
    // Reflect the new name in the URL so the browser back/forward state is consistent
    setSearchParams(prev => { prev.set('docName', newName); return prev; }, { replace: true });
    // Update the name in localStorage so the project page tile reflects the rename
    try {
      const raw = localStorage.getItem('des36_state');
      if (!raw) return;
      const state = JSON.parse(raw);
      const oldName = searchParams.get('docName');
      Object.keys(state.projectDocs || {}).forEach(pid => {
        state.projectDocs[pid] = state.projectDocs[pid].map(d =>
          d.name === oldName ? { ...d, name: newName } : d
        );
      });
      localStorage.setItem('des36_state', JSON.stringify(state));
    } catch { /* non-critical */ }
  }, [searchParams, setSearchParams]);
  const [screenshotCaptureMode, setScreenshotCaptureMode] = useState(false);
  const [retakeReplaceItemId, setRetakeReplaceItemId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('existing');
  const [modalReplaceItemId, setModalReplaceItemId] = useState(null);
  const [lastCanvasMouse, setLastCanvasMouse] = useState({ x: 100, y: 100 });
  const [placedItems, setPlacedItems] = useState([]);
  const [operations, setOperations] = useState(readInitialMegaOperations);
  const [activePageId, setActivePageId] = useState(readInitialMegaActivePage);
  const [scrollToPageToken, setScrollToPageToken] = useState(0);
  const [toolsBom, setToolsBom] = useState(() => {
    try {
      const raw = localStorage.getItem('des36_state');
      const saved = raw ? JSON.parse(raw) : null;
      if (saved?.toolLibrary?.length) return saved.toolLibrary;
    } catch { /* ignore */ }
    return [...TOOLS_BOM_INITIAL];
  });
  const [partsCatalog, setPartsCatalog] = useState(() => [...PARTS_CATALOG_INITIAL]);
  const [toolsLibraryOpen, setToolsLibraryOpen] = useState(false);

  // On mount: record this document in openedDocs so the Tool Library can show "used in"
  useEffect(() => {
    const doc = searchParams.get('docName');
    if (!doc) return;
    try {
      const raw = localStorage.getItem('des36_state');
      const state = raw ? JSON.parse(raw) : {};
      const prev = new Set(state.openedDocs || []);
      prev.add(doc);
      state.openedDocs = [...prev];
      localStorage.setItem('des36_state', JSON.stringify(state));
    } catch { /* non-critical */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on mount

  // Persist toolsBom whenever it changes
  useEffect(() => {
    if (!hasBomTables) return;
    try {
      const raw = localStorage.getItem('des36_state');
      const state = raw ? JSON.parse(raw) : {};
      // Only persist named tools (blank rows are ephemeral placeholders)
      state.toolLibrary = toolsBom.filter(t => (t.name || '').trim());
      localStorage.setItem('des36_state', JSON.stringify(state));
    } catch { /* non-critical */ }
  }, [toolsBom, hasBomTables]);

  const addPartToCurrentOperation = useCallback((ownerId, name, qty = 1) => {
    if (!ownerId) return false;
    const trimmed = (name ?? '').toString().trim();
    const part = { id: newEntityId('part'), name: trimmed };
    if (trimmed) {
      setPartsCatalog((prev) => {
        const key = trimmed.toLowerCase();
        const alreadyExists = prev.some((p) => (p?.name ?? '').toString().trim().toLowerCase() === key);
        if (alreadyExists) return prev;
        return [...prev, { id: newEntityId('partcat'), name: trimmed }];
      });
    }
    setOperations((prev) => addPartToOperation(prev, ownerId, part));
    return true;
  }, []);

  /** Add tool to global catalog and link it to this operation's table. Empty name adds a blank row. */
  const addToolToOperation = useCallback((ownerId, name) => {
    if (!ownerId) return false;
    const trimmed = (name ?? '').toString().trim();
    if (trimmed) {
      setToolsBom((prevTools) => {
        const key = trimmed.toLowerCase();
        const existing = prevTools.find((t) => (t?.name ?? '').toString().trim().toLowerCase() === key);
        if (existing) {
          setOperations((ops) => addToolIdToOperation(ops, ownerId, existing.id));
          return prevTools;
        }
        const tool = { id: newEntityId('tool'), name: trimmed };
        setOperations((ops) => addToolIdToOperation(ops, ownerId, tool.id));
        return [...prevTools, tool];
      });
    } else {
      const blankId = newEntityId('tool');
      setToolsBom((prev) => [...prev, { id: blankId, name: '' }]);
      setOperations((ops) => addToolIdToOperation(ops, ownerId, blankId));
    }
    return true;
  }, []);

  /** Remove one part row from this step only; parts catalog unchanged. */
  const removePartFromOperationById = useCallback((ownerId, partId) => {
    if (!ownerId || !partId) return;
    setOperations((prev) => removePartFromOperation(prev, ownerId, partId));
  }, []);

  const renamePartInOperationStep = useCallback((ownerId, partId, newName, oldName) => {
    const trimmed = (newName ?? '').toString().trim();
    if (!trimmed) return;
    const owner = findNode(operations, ownerId)?.node;
    const others = (owner?.parts || []).filter((p) => p.id !== partId);
    if (others.some((p) => (p?.name ?? '').toString().trim().toLowerCase() === trimmed.toLowerCase())) return;
    setOperations((prev) => renamePartInOperation(prev, ownerId, partId, trimmed));
    setPartsCatalog((prev) => prev.map((p) => (p.id === partId ? { ...p, name: trimmed } : p)));
    if (oldName && trimmed !== oldName) {
      const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`\\[Part:\\s*${escaped}\\]`, 'g');
      const replacement = `[Part: ${trimmed}]`;
      setPlacedItems((prev) =>
        prev.map((item) => {
          if (item.type === 'text' && typeof item.content === 'string' && item.content.includes(`[Part: ${oldName}]`)) {
            return { ...item, content: item.content.replace(pattern, replacement) };
          }
          return item;
        })
      );
    }
  }, [operations]);

  /** Remove tool from this step’s table only; global tools list / Tools Library unchanged. */
  const replacePartInOperationStep = useCallback((ownerId, oldPartId, newPart) => {
    if (!ownerId || !oldPartId || !newPart?.name) return;
    const trimmed = (newPart.name ?? '').toString().trim();
    if (!trimmed) return;
    const part = { id: newPart.id || `part-${Date.now()}`, name: trimmed };
    setPartsCatalog((prev) => {
      const key = trimmed.toLowerCase();
      const exists = prev.some((p) => (p?.name ?? '').toString().trim().toLowerCase() === key);
      if (exists) return prev;
      return [...prev, part];
    });
    setOperations((prev) => replacePartInOperation(prev, ownerId, oldPartId, part));
  }, []);

  const removeToolFromOperationTable = useCallback((ownerId, toolId) => {
    if (!ownerId || !toolId) return;
    setOperations((prev) => removeToolIdFromOperation(prev, ownerId, toolId));
  }, []);

  const replaceToolInOperationStep = useCallback((ownerId, oldToolId, newTool) => {
    if (!ownerId || !oldToolId || !newTool?.name) return;
    const trimmed = (newTool.name ?? '').toString().trim();
    if (!trimmed) return;
    setToolsBom((prevTools) => {
      const key = trimmed.toLowerCase();
      const existing = prevTools.find((t) => (t?.name ?? '').toString().trim().toLowerCase() === key);
      const tool = existing ?? { id: `tool-${Date.now()}`, name: trimmed };
      setOperations((ops) => replaceToolIdInOperation(ops, ownerId, oldToolId, tool.id));
      if (existing) return prevTools;
      return [...prevTools, tool];
    });
  }, []);

  const reorderPartsInOperationStep = useCallback((ownerId, fromIdx, toIdx) => {
    if (!ownerId) return;
    setOperations((prev) => reorderPartsInOperation(prev, ownerId, fromIdx, toIdx));
  }, []);

  const reorderToolsInOperationStep = useCallback((ownerId, fromIdx, toIdx) => {
    if (!ownerId) return;
    setOperations((prev) => reorderToolIdsInOperation(prev, ownerId, fromIdx, toIdx));
  }, []);

  const openToolsLibrary = useCallback(() => setToolsLibraryOpen(true), []);
  const closeToolsLibrary = useCallback(() => setToolsLibraryOpen(false), []);

  const addToolToBomDirect = useCallback((name) => {
    const trimmed = (name ?? '').toString().trim();
    if (!trimmed) return false;
    setToolsBom(prev => {
      if (prev.find(t => (t.name || '').toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, { id: newEntityId('tool'), name: trimmed }];
    });
    return true;
  }, []);
  const removeToolFromBom = useCallback((toolId) => {
    setToolsBom((prev) => prev.filter((t) => t.id !== toolId));
    setOperations((prev) => removeToolFromOperations(prev, toolId));
  }, []);

  const renameToolInBom = useCallback((toolId, newName, oldName, operationId) => {
    const trimmed = (newName ?? '').toString().trim();
    if (!trimmed || trimmed === oldName) return;
    const newId = newEntityId('tool');
    setToolsBom((prev) => {
      const existing = prev.find((t) => t.id !== toolId && (t.name ?? '').toString().trim().toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        // New name already exists in library — swap old ID for existing ID in this step
        if (operationId) setOperations((ops) => replaceToolIdInOperation(ops, operationId, toolId, existing.id));
        return prev; // old tool stays untouched
      }
      // Create new tool, keep old tool in library, swap ID in this step
      if (operationId) setOperations((ops) => replaceToolIdInOperation(ops, operationId, toolId, newId));
      return [...prev, { id: newId, name: trimmed }];
    });
    // Update [Tool: oldName] tags in all placed text boxes to [Tool: newName]
    if (oldName) {
      const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`\\[Tool:\\s*${escaped}\\]`, 'g');
      const replacement = `[Tool: ${trimmed}]`;
      setPlacedItems((prev) =>
        prev.map((item) => {
          if (item.type === 'text' && typeof item.content === 'string' && item.content.includes(`[Tool: ${oldName}]`)) {
            return { ...item, content: item.content.replace(pattern, replacement) };
          }
          return item;
        })
      );
    }
  }, []);

  const addSubPage = useCallback(() => {
    const { ownerId } = getPageContext(activePageId);
    if (!ownerId) return;
    const { operations: nextOps, newSubPageId } = addSubPageToOwner(operations, ownerId);
    setOperations(nextOps);
    if (newSubPageId) setActivePageId(newSubPageId);
  }, [activePageId, operations]);

  const movePageUp = useCallback(() => {
    const { ownerId, isSubPage } = getPageContext(activePageId);
    if (!ownerId) return;
    if (isSubPage) {
      setOperations((prev) => reorderSubPages(prev, ownerId, activePageId, 'up'));
    } else {
      const found = findNode(operations, activePageId);
      if (!found) return;
      if (found.parent === null) {
        setOperations((prev) => reorderOperations(prev, activePageId, 'up'));
      } else {
        setOperations((prev) => reorderSuboperations(prev, found.parent.id, activePageId, 'up'));
      }
    }
  }, [activePageId, operations]);

  const movePageDown = useCallback(() => {
    const { ownerId, isSubPage } = getPageContext(activePageId);
    if (!ownerId) return;
    if (isSubPage) {
      setOperations((prev) => reorderSubPages(prev, ownerId, activePageId, 'down'));
    } else {
      const found = findNode(operations, activePageId);
      if (!found) return;
      if (found.parent === null) {
        setOperations((prev) => reorderOperations(prev, activePageId, 'down'));
      } else {
        setOperations((prev) => reorderSuboperations(prev, found.parent.id, activePageId, 'down'));
      }
    }
  }, [activePageId, operations]);

  const deletePage = useCallback(() => {
    if (!isSubPageId(activePageId)) return;
    const { ownerId } = getPageContext(activePageId);
    if (!ownerId) return;
    const { operations: nextOps, newActivePageId } = removeSubPage(operations, ownerId, activePageId);
    setOperations(nextOps);
    if (newActivePageId) setActivePageId(newActivePageId);
  }, [activePageId, operations]);

  const openModal = useCallback((tab = 'existing', replaceItemId = null) => {
    setModalTab(tab);
    setModalReplaceItemId(replaceItemId);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalReplaceItemId(null);
  }, []);

  const addPlacedItem = useCallback(({ type, src, svgContent, pageId, content }) => {
    const canvasEl = document.querySelector('.canvas');
    const isText = type === 'text';
    const w = isText ? 280 : DEFAULT_WIDTH;
    const h = isText ? 120 : DEFAULT_HEIGHT;
    const maxLeft = canvasEl ? Math.max(0, canvasEl.clientWidth - w) : 800 - w;
    const maxTop = canvasEl ? Math.max(0, canvasEl.clientHeight - h) : 600 - h;
    let left;
    let top;
    if (pageId != null) {
      if (canvasEl) {
        left = Math.round((canvasEl.clientWidth - w) / 2);
        top = Math.round((canvasEl.clientHeight - h) / 2);
        left = Math.max(0, Math.min(left, maxLeft));
        top = Math.max(0, Math.min(top, maxTop));
      } else {
        left = Math.max(0, Math.min(200, maxLeft));
        top = Math.max(0, Math.min(180, maxTop));
      }
    } else {
      left = Math.max(0, Math.min(lastCanvasMouse.x - w / 2, maxLeft));
      top = Math.max(0, Math.min(lastCanvasMouse.y - h / 2, maxTop));
    }
    setPlacedItems((prev) => [
      ...prev,
      { id: nextId++, type, left, top, width: w, height: h, src, svgContent, pageId: pageId ?? undefined, content: type === 'text' ? (content ?? '') : undefined },
    ]);
  }, [lastCanvasMouse.x, lastCanvasMouse.y]);

  const removePlacedItem = useCallback((id) => {
    setPlacedItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updatePlacedItem = useCallback((id, updates) => {
    setPlacedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const handlePickScreenshot = useCallback((svgHtml) => {
    if (modalReplaceItemId != null) {
      updatePlacedItem(modalReplaceItemId, { type: 'image', svgContent: svgHtml, src: undefined });
    } else {
      addPlacedItem({ type: 'image', svgContent: svgHtml });
    }
    closeModal();
  }, [addPlacedItem, updatePlacedItem, closeModal, modalReplaceItemId]);

  const handlePickPlaceholder = useCallback(() => {
    if (modalReplaceItemId != null) {
      updatePlacedItem(modalReplaceItemId, { type: 'placeholder', svgContent: undefined, src: undefined });
    } else {
      addPlacedItem({ type: 'placeholder' });
    }
    closeModal();
  }, [addPlacedItem, updatePlacedItem, closeModal, modalReplaceItemId]);

  const handleUpload = useCallback((dataUrl) => {
    if (modalReplaceItemId != null) {
      updatePlacedItem(modalReplaceItemId, { type: 'uploaded', src: dataUrl, svgContent: undefined });
    } else {
      addPlacedItem({ type: 'uploaded', src: dataUrl });
    }
    closeModal();
  }, [addPlacedItem, updatePlacedItem, closeModal, modalReplaceItemId]);

  const startScreenshotCapture = useCallback(() => {
    if (!hasScreenshotCapture(conceptId)) return;
    setRetakeReplaceItemId(null);
    setScreenshotCaptureMode(true);
    setNavActive('cad');
  }, [conceptId]);

  const startRetakeFromImage = useCallback((itemId) => {
    if (!hasScreenshotCapture(conceptId)) return;
    setRetakeReplaceItemId(itemId);
    setScreenshotCaptureMode(true);
    setNavActive('cad');
  }, [conceptId]);

  const handleCaptureComplete = useCallback((dataUrl) => {
    if (retakeReplaceItemId != null) {
      updatePlacedItem(retakeReplaceItemId, { type: 'uploaded', src: dataUrl });
      setRetakeReplaceItemId(null);
    } else {
      addPlacedItem({ type: 'uploaded', src: dataUrl, pageId: activePageId });
    }
    setScreenshotCaptureMode(false);
    setNavActive('doc');
    setScrollToPageToken((t) => t + 1);
  }, [addPlacedItem, activePageId, retakeReplaceItemId, updatePlacedItem]);

  const handleCancelCapture = useCallback(() => {
    setRetakeReplaceItemId(null);
    setScreenshotCaptureMode(false);
    setNavActive('doc');
  }, []);

  /** Exit capture mode (blue border) but stay in CAD view. ESC button/key use this. */
  const handleExitCaptureMode = useCallback(() => {
    setRetakeReplaceItemId(null);
    setScreenshotCaptureMode(false);
  }, []);

  const handleAddStep = useCallback(() => {
    setOperations((prev) => addOperation(prev));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        closeToolsLibrary();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeModal, closeToolsLibrary]);

  return (
    <div className="app-page-shell">
      <Header
        navActive={navActive}
        onNavChange={setNavActive}
        documentLifecycle={des36FlowActive ? docLifecycle : null}
        onDocumentLifecycleChange={des36FlowActive ? handleDocLifecycleChange : undefined}
        publishStatusLabel={packageDocVersionParam || 'Unpublished'}
        backTo={editorBackToParam}
        hideCadNav={uploadedDocMode}
      />
      {showDes36DocBanner && (
        <div
          className={`des36-doc-banner des36-doc-banner--${des36BannerKind === 'review' ? 'review' : 'auto'}`}
          role="status"
        >
          <div className="des36-doc-banner__main">
            {des36BannerKind === 'review' ? (
              <>
                <strong>Review needed</strong>
                <span className="des36-doc-banner__detail">
                  {' '}
                  — A dimension on bracket-02 no longer matches CAD; confirm before you publish.
                </span>
              </>
            ) : (
              <>
                <strong>Auto-updated 2h ago</strong>
                <span className="des36-doc-banner__detail">
                  {' '}
                  — CAD changed; visuals and part references were refreshed.
                </span>
              </>
            )}
          </div>
          <div className="des36-doc-banner__actions">
            <button
              type="button"
              className="des36-doc-banner__link"
              onClick={() => setDes36ChangesOpen(true)}
            >
              {des36BannerKind === 'review' ? 'Review now' : 'View changes'}
            </button>
            <button
              type="button"
              className="des36-doc-banner__dismiss"
              aria-label="Dismiss banner"
              onClick={() => setDes36BannerDismissed(true)}
            >
              ×
            </button>
          </div>
        </div>
      )}
      {showPackageReadOnlyBanner && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: '#FEF3C7',
            borderTop: '1px solid #FDE68A',
            borderBottom: '1px solid #FDE68A',
            color: '#92400E',
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          <Lock size={15} aria-hidden />
          <span>
            {uploadedDocMode
              ? 'User uploaded document — read-only PDF view.'
              : (
                <>
                  Read-only view
                  {packageDocVersionParam ? ` (${packageDocVersionParam})` : ''}
                  {' '}
                  — this version is published and cannot be edited.
                </>
              )}
          </span>
        </div>
      )}
      {des36ChangesOpen && (
        <div
          className="des36-changes-backdrop"
          role="presentation"
          onClick={() => setDes36ChangesOpen(false)}
        >
          <aside
            className="des36-changes-panel"
            role="dialog"
            aria-label="What changed"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="des36-changes-panel__head">
              <h2 className="des36-changes-panel__title">What changed</h2>
              <button
                type="button"
                className="des36-changes-panel__close"
                aria-label="Close"
                onClick={() => setDes36ChangesOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="des36-changes-panel__lede">
              Prototype summary — in production this would load from a CAD diff API.
            </p>
            <ul className="des36-changes-panel__list">
              <li>Replaced 3 screenshot callouts with updated CAD captures (steps 2, 4, 7).</li>
              <li>Updated part references: bracket-02 rev B → rev C.</li>
              <li>Tools table: refreshed quantities from the latest assembly BOM.</li>
            </ul>
          </aside>
        </div>
      )}
      {approveNotifyShown && (
        <div className="des36-toast" role="status">
          Technicians assigned to this document were notified (in-app and email when configured).
        </div>
      )}
      <div className="app-page-shell__main">
      {viewMode === 'flow' ? (
        <WireframeFlowView />
      ) : navActive === 'tools-bom' && hasBomTables ? (
        <ToolsBomView />
      ) : navActive === 'cad' ? (
        <CadView
          operations={emptyCad ? [] : operations}
          onAddStep={emptyCad || megaSourceIds ? undefined : handleAddStep}
          empty={emptyCad}
          screenshotCaptureMode={screenshotCaptureMode && hasScreenshotCapture(conceptId)}
          isRetakeMode={retakeReplaceItemId != null}
          initialSelectedOperationId={screenshotCaptureMode && hasScreenshotCapture(conceptId) ? getTopLevelOperationId(operations, activePageId) : null}
          onCaptureComplete={handleCaptureComplete}
          onCancelCapture={handleCancelCapture}
          onExitCaptureMode={handleExitCaptureMode}
          docTitle={editorChromeTitle}
          onDocTitleChange={megaSourceIds ? undefined : handleDocTitleChange}
        />
      ) : uploadedDocMode ? (
      <div className="app-body">
        <aside
          style={{
            width: 244,
            borderRight: '1px solid #E5E7EB',
            background: '#fff',
            padding: '10px 8px',
            overflow: 'auto',
          }}
        >
          {[1, 2, 3, 4, 5].map((p) => (
            <button
              key={p}
              type="button"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: p === 1 ? '#EEF2FF' : '#fff',
                cursor: 'pointer',
                marginBottom: 8,
                fontFamily: 'inherit',
              }}
            >
              <div style={{ width: 36, height: 46, borderRadius: 4, border: '1px solid #CBD5E1', background: '#fff' }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>Page {p}</div>
            </button>
          ))}
        </aside>
        <main className="main-content">
          <div
            style={{
              margin: 20,
              height: 'calc(100% - 40px)',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6B7280',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            PDF viewer (read-only)
          </div>
        </main>
      </div>
      ) : (
        <div className="app-body">
          <Sidebar
            operations={operations}
            activePageId={activePageId}
            onSelectPage={setActivePageId}
            showSubPages={conceptId === 'image-two-buttons' || hasBomTables}
            placedItems={placedItems}
            documentTitle={editorChromeTitle}
            megaSections={megaSections}
          />
          <main className="main-content">
            {!packageReadOnly ? (
              <Toolbar
                onOpenModal={openModal}
                onPlacePlaceholder={() => addPlacedItem({ type: 'placeholder' })}
                onPlaceTextBox={() => addPlacedItem({ type: 'text' })}
                onScreenshotCapture={startScreenshotCapture}
                readOnly={editorReadOnly}
              />
            ) : null}
            <Canvas
              placedItems={placedItems}
              onCanvasMouseMove={setLastCanvasMouse}
              onRemovePlacedItem={removePlacedItem}
              onUpdatePlacedItem={updatePlacedItem}
              onOpenModal={openModal}
              onNavigateToCad={() => setNavActive('cad')}
              onStartRetake={startRetakeFromImage}
              operations={operations}
              activePageId={activePageId}
              scrollToPageToken={scrollToPageToken}
              onVisiblePageChange={setActivePageId}
              onAddSubPage={addSubPage}
              onMovePageUp={movePageUp}
              onMovePageDown={movePageDown}
              onDeletePage={deletePage}
              toolsBom={hasBomTables ? toolsBom : undefined}
              partsCatalog={hasBomTables ? partsCatalog : undefined}
              onAddPartToOperation={hasBomTables ? addPartToCurrentOperation : undefined}
              onAddToolToBom={hasBomTables ? addToolToOperation : undefined}
              onRemovePartFromOperation={hasBomTables ? removePartFromOperationById : undefined}
              onRemoveToolFromOperation={hasBomTables ? removeToolFromOperationTable : undefined}
              onOpenToolsLibrary={hasBomTables ? openToolsLibrary : undefined}
              onRenameTool={hasBomTables ? renameToolInBom : undefined}
              onRenamePart={hasBomTables ? renamePartInOperationStep : undefined}
              onReplacePartInOperation={hasBomTables ? replacePartInOperationStep : undefined}
              onReplaceToolInOperation={hasBomTables ? replaceToolInOperationStep : undefined}
              onReorderPart={hasBomTables ? reorderPartsInOperationStep : undefined}
              onReorderTool={hasBomTables ? reorderToolsInOperationStep : undefined}
            />
          </main>
        </div>
      )}
      </div>
      <ScreenshotModal
        open={modalOpen}
        activeTab={modalTab}
        onClose={closeModal}
        onTabChange={setModalTab}
        onPickScreenshot={handlePickScreenshot}
        onPickPlaceholder={handlePickPlaceholder}
        onUpload={handleUpload}
        replaceItemId={modalReplaceItemId}
            onCaptureFromCad={hasScreenshotCapture(conceptId) ? (itemId) => { closeModal(); startRetakeFromImage(itemId); } : undefined}
      />
      {hasBomTables && (
        <ToolsLibraryModal
          open={toolsLibraryOpen}
          onClose={closeToolsLibrary}
          tools={toolsBom}
          onRemoveTool={removeToolFromBom}
          onRenameTool={renameToolInBom}
          onAddTool={addToolToBomDirect}
          operations={operations}
        />
      )}
      <PrototypeSwitcher />
    </div>
  );
}
