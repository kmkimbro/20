import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, Crop, Download, Link2, Radio, Replace, X } from 'lucide-react';

function RetakeIcon({ size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
      <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
      <circle cx="12" cy="12" r="3" />
      <path d="m18 22-3-3 3-3" />
      <path d="m6 2 3 3-3 3" />
    </svg>
  );
}

export default function CutoutImage({
  item,
  scale,
  selected,
  onSelect,
  onChange,
  onRemove,
  onReplace,
  onRetake,
  onOpenCad,
  onLink,
}) {
  const [cropMode, setCropMode] = useState(false);
  const [menu, setMenu] = useState(null);
  const cropScale = item.cropScale ?? 1;
  const cropOffset = item.cropOffset ?? { x: 0, y: 0 };
  const linked = Boolean(item.linked);

  useEffect(() => {
    if (!menu) return undefined;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);

  useEffect(() => {
    if (!cropMode) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setCropMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cropMode]);

  const onPointerDown = (event) => {
    if (event.button != null && event.button !== 0) return;
    if (event.target.closest('button, .mp-resize, .placed-image-context-menu')) {
      event.stopPropagation();
      onSelect(item.id);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    onSelect(item.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = cropMode
      ? { x: cropOffset.x, y: cropOffset.y }
      : { x: item.x, y: item.y };
    const pointerId = event.pointerId;
    const node = event.currentTarget;
    try { node.setPointerCapture(pointerId); } catch { /* already captured */ }

    const move = (ev) => {
      if (ev.pointerId !== pointerId) return;
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      if (cropMode) onChange(item.id, { cropOffset: { x: origin.x + dx, y: origin.y + dy } });
      else onChange(item.id, { x: origin.x + dx, y: origin.y + dy });
    };
    const up = (ev) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      try { node.releasePointerCapture(pointerId); } catch { /* already released */ }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const onResizeDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(item.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { w: item.w, h: item.h };
    const move = (ev) => {
      onChange(item.id, {
        w: Math.max(24, origin.w + (ev.clientX - startX) / scale),
        h: Math.max(24, origin.h + (ev.clientY - startY) / scale),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const download = () => {
    const link = document.createElement('a');
    link.href = item.src;
    link.download = 'cutout.png';
    link.click();
  };

  return (
    <div
      className={`mp-item placed-image is-image${selected ? ' is-selected placed-image-selected' : ''}${cropMode ? ' is-crop' : ''}`}
      style={{ left: item.x, top: item.y, width: item.w, height: item.h }}
      onPointerDown={onPointerDown}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelect(item.id);
        setMenu({ x: event.clientX, y: event.clientY });
      }}
    >
      <div
        className="mp-cutout-toolbar-slot"
        style={{ transform: `translateY(${-8 / scale}px)` }}
      >
      <div
        className="placed-image-toolbar"
        style={{
          position: 'relative',
          left: 'auto',
          right: 'auto',
          width: 'max-content',
          transform: `translateY(-100%) scale(${1 / scale})`,
          transformOrigin: 'bottom center',
        }}
      >
        <div className="placed-image-toolbar-group">
          <button type="button" className="placed-cta-btn placed-cta-btn--danger" aria-label="Remove" title="Remove" onClick={() => onRemove(item.id)}>
            <X size={18} />
          </button>
          <button type="button" className="placed-cta-btn" aria-label="Replace" title="Replace" onClick={() => onReplace(item.id)}>
            <Replace size={18} />
          </button>
          <button type="button" className="placed-cta-btn" aria-label="Retake" title={linked ? 'Retake from CAD' : 'Retake — upload CAD first'} onClick={() => onRetake(item.id)}>
            <RetakeIcon />
          </button>
          <button type="button" className="placed-cta-btn" aria-label="3D view" title="3D view" onClick={onOpenCad}>
            <Box size={18} />
          </button>
          <button type="button" className="placed-cta-btn" aria-label="Crop" title="Crop" onClick={() => setCropMode((on) => !on)}>
            <Crop size={18} />
          </button>
        </div>
      </div>
      </div>
      <div className="placed-image-controls mp-cutout-broadcast">
        <button type="button" className="placed-cta-btn" aria-label="Broadcast" title="Broadcast" style={{ transform: `scale(${1 / scale})`, transformOrigin: 'top left' }}>
          <Radio size={18} />
        </button>
      </div>
      <span className={`mp-link-badge${linked ? ' is-linked' : ''}`} style={{ transform: `scale(${1 / scale})`, transformOrigin: 'top right' }}>
        {linked ? 'Linked' : 'Unlinked'}
      </span>
      <div className="mp-cutout-frame" style={{ transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropScale})` }}>
        <img src={item.src} alt="" draggable={false} />
      </div>
      {selected ? (
        <button type="button" className="mp-resize" aria-label="Resize image" onPointerDown={onResizeDown} />
      ) : null}
      {menu ? createPortal(
        <div className="placed-image-context-menu" style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 9999 }} onClick={(event) => event.stopPropagation()}>
          <button type="button" className="placed-image-context-menu-item" onClick={() => { setMenu(null); onLink(item.id); }}>
            <Link2 size={16} /> {linked ? 'Linked to CAD' : 'Link'}
          </button>
          <button type="button" className="placed-image-context-menu-item" onClick={() => { setMenu(null); download(); }}>
            <Download size={16} /> Download
          </button>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
