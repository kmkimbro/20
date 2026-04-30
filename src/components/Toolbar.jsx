import { useState, useEffect, useRef } from 'react';
import { usePrototype, hasScreenshotCapture } from '../contexts/PrototypeContext.jsx';
import FrameCadIcon from './icons/FrameCadIcon.jsx';
import UploadComputerIcon from './icons/UploadComputerIcon.jsx';
import VideoToolbarIcon from './icons/VideoToolbarIcon.jsx';
import PlaceholderImageIcon from './icons/PlaceholderImageIcon.jsx';
import {
  Type, Image, ChevronDown,
  Cog, Table, Wrench, Grid3X3, Circle, Square, Triangle, Minus,
  ArrowUpRight, MoveRight, Redo, LayoutGrid, AlertTriangle,
  AlertCircle, Info, CheckCircle, TextCursorInput, MessageSquare,
  Ruler, Tag, LayoutTemplate, Send,
} from 'lucide-react';

export default function Toolbar({
  onOpenModal,
  onPlacePlaceholder,
  onPlaceTextBox,
  onScreenshotCapture,
  readOnly = false,
}) {
  const { conceptId } = usePrototype();
  const [openMenuId, setOpenMenuId] = useState(null);
  const [activeToolbarBtn, setActiveToolbarBtn] = useState(null);
  const [lastUsed, setLastUsed] = useState({});
  const toolbarRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) setOpenMenuId(null);
    };
    const handleKeyDown = (e) => { if (e.key === 'Escape') setOpenMenuId(null); };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleMenu = (menuId) => setOpenMenuId((prev) => (prev === menuId ? null : menuId));

  // Execute a menu item action, close menu, and remember it as last used for this split button
  const pick = (menuId, actionId, fn) => {
    setOpenMenuId(null);
    setLastUsed((prev) => ({ ...prev, [menuId]: actionId }));
    fn();
  };

  // Returns the current primary action config for a split button
  const primary = (menuId, actions) => {
    const id = lastUsed[menuId] ?? actions[0].id;
    return actions.find((a) => a.id === id) ?? actions[0];
  };

  /* ── Action definitions per menu ── */

  const cameraActions = [
    { id: 'place-image',    label: 'Place image',    Icon: Image,   fn: () => { onOpenModal('existing'); } },
    { id: 'screenshot-cad', label: 'Screenshot CAD', Icon: FrameCadIcon, fn: () => onScreenshotCapture?.() },
  ];

  const mediaActions = [
    { id: 'upload',      label: 'Upload from computer', Icon: UploadComputerIcon, fn: () => onOpenModal('upload') },
    { id: 'placeholder', label: 'Placeholder image',    Icon: PlaceholderImageIcon, fn: () => onPlacePlaceholder?.() },
    { id: 'video',       label: 'Video',                Icon: VideoToolbarIcon, fn: () => onOpenModal('upload') },
  ];

  const tableActions = [
    { id: 'parts-table',  label: 'Parts table',  Icon: Cog, fn: () => {} },
    { id: 'tools-table',  label: 'Tools table',  Icon: Wrench,  fn: () => {} },
    { id: 'custom-table', label: 'Custom table', Icon: Grid3X3, fn: () => {} },
  ];

  const shapeActions = [
    { id: 'circle',    label: 'Circle',    Icon: Circle,   fn: () => {} },
    { id: 'rectangle', label: 'Rectangle', Icon: Square,   fn: () => {} },
    { id: 'triangle',  label: 'Triangle',  Icon: Triangle, fn: () => {} },
    { id: 'line',      label: 'Line',      Icon: Minus,    fn: () => {} },
  ];

  const arrowActions = [
    { id: 'arrow',        label: 'Arrow',        Icon: ArrowUpRight, fn: () => {} },
    { id: 'line',         label: 'Line',         Icon: MoveRight,    fn: () => {} },
    { id: 'curved-arrow', label: 'Curved arrow', Icon: Redo,         fn: () => {} },
  ];

  const iconActions = [
    { id: 'warning',   label: 'Warning',   Icon: AlertTriangle, fn: () => {} },
    { id: 'caution',   label: 'Caution',   Icon: AlertCircle,   fn: () => {} },
    { id: 'info',      label: 'Info',      Icon: Info,          fn: () => {} },
    { id: 'checkmark', label: 'Checkmark', Icon: CheckCircle,   fn: () => {} },
  ];

  const annotationActions = [
    { id: 'callout',   label: 'Callout',   Icon: MessageSquare,    fn: () => {} },
    { id: 'dimension', label: 'Dimension', Icon: Ruler,            fn: () => {} },
    { id: 'label',     label: 'Label',     Icon: Tag,              fn: () => {} },
  ];

  /* ── Render helper for a split button ── */
  const SplitBtn = ({ menuId, actions, caretTitle, anchor }) => {
    const cur = primary(menuId, actions);
    const CurIcon = cur.Icon;
    return (
      <div
        className={`split-btn${openMenuId === menuId ? ' open' : ''}`}
        data-menu={menuId}
        {...(anchor ? { 'data-flow-anchor': anchor } : {})}
      >
        <button
          type="button"
          className="split-btn-action"
          title={cur.label}
          onClick={() => { setOpenMenuId(null); cur.fn(); }}
        >
          <CurIcon className="toolbar-icon" size={18} />
        </button>
        <button
          type="button"
          className="split-btn-caret"
          title={caretTitle}
          onClick={(e) => { e.stopPropagation(); toggleMenu(menuId); }}
        >
          <ChevronDown className="caret-icon" size={16} />
        </button>
        <div className={`split-menu${openMenuId === menuId ? ' open' : ''}`} id={menuId}>
          {actions.map((a) => {
            const AIcon = a.Icon;
            const chosen = lastUsed[menuId];
            const isActive =
              chosen !== undefined && chosen === a.id && a.id !== actions[0].id;
            return (
              <button
                key={a.id}
                type="button"
                className={`split-menu-item${isActive ? ' split-menu-item--active' : ''}`}
                onClick={() => pick(menuId, a.id, a.fn)}
              >
                <AIcon className="menu-icon" size={16} /> {a.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (readOnly) {
    return (
      <div className="toolbar toolbar--readonly" ref={toolbarRef}>
        <span className="toolbar-readonly-msg">Read-only — editing is disabled in this document state.</span>
      </div>
    );
  }

  return (
    <div className="toolbar" ref={toolbarRef}>
      {/* 1 — Image / Screenshot */}
      {hasScreenshotCapture(conceptId) && onScreenshotCapture && (
        <SplitBtn menuId="camera-menu" actions={cameraActions} caretTitle="Screenshot options" anchor="cad-nav" />
      )}

      {/* 2 — Media / Upload */}
      <SplitBtn menuId="media-menu" actions={mediaActions} caretTitle="Media options" anchor="place-image" />

      {/* 3 — Text */}
      <button
        type="button"
        className={`toolbar-btn${activeToolbarBtn === 'text' ? ' toolbar-active' : ''}`}
        title="Text box"
        onClick={() => { setActiveToolbarBtn((p) => (p === 'text' ? null : 'text')); onPlaceTextBox?.(); }}
      >
        <Type className="toolbar-icon" size={18} />
      </button>

      {/* 4 — Table */}
      <SplitBtn menuId="table-menu" actions={tableActions} caretTitle="Table types" />

      {/* 5 — Shape */}
      <SplitBtn menuId="shape-menu" actions={shapeActions} caretTitle="Shapes" />

      {/* 6 — Arrow */}
      <SplitBtn menuId="arrow-menu" actions={arrowActions} caretTitle="Arrow tools" />

      {/* 7 — Icons */}
      <SplitBtn menuId="icons-menu" actions={iconActions} caretTitle="Icons" />

      {/* 8 — Annotations */}
      <SplitBtn menuId="annotation-menu" actions={annotationActions} caretTitle="Annotation options" />

      {/* 9 — Templates */}
      <button
        type="button"
        className={`toolbar-btn${activeToolbarBtn === 'templates' ? ' toolbar-active' : ''}`}
        title="Templates"
        onClick={() => setActiveToolbarBtn((p) => (p === 'templates' ? null : 'templates'))}
      >
        <LayoutTemplate className="toolbar-icon" size={18} />
      </button>

      {/* 10 — Technician */}
      <button
        type="button"
        className={`toolbar-btn${activeToolbarBtn === 'technician' ? ' toolbar-active' : ''}`}
        title="Technician view"
        onClick={() => setActiveToolbarBtn((p) => (p === 'technician' ? null : 'technician'))}
      >
        <img src="/technician-icon.png" alt="" className="toolbar-icon toolbar-icon--emoji" width={20} height={20} />
      </button>

      {/* 11 — Comments */}
      <button
        type="button"
        className={`toolbar-btn${activeToolbarBtn === 'comments' ? ' toolbar-active' : ''}`}
        title="Comments"
        onClick={() => setActiveToolbarBtn((p) => (p === 'comments' ? null : 'comments'))}
      >
        <MessageSquare className="toolbar-icon" size={18} />
      </button>

      {/* 12 — Publish */}
      <button
        type="button"
        className={`toolbar-btn${activeToolbarBtn === 'publish' ? ' toolbar-active' : ''}`}
        title="Publish"
        onClick={() => setActiveToolbarBtn((p) => (p === 'publish' ? null : 'publish'))}
      >
        <Send className="toolbar-icon" size={18} />
      </button>
    </div>
  );
}
