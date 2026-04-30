/**
 * Image workflow – Concept A: CTAs on image select.
 * When an image is selected, action icons appear around the perimeter (expand, upload, 3D view, rotate, link, download, crop, etc.).
 */
import { useRef, useCallback, useState, useEffect } from 'react';
import {
  Radio,
  Replace,
  Box,
  Crop,
} from 'lucide-react';

function RetakeIcon({ size = 24 }) {
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

const MIN_SIZE = 80;
const PLACEHOLDER_SVG = (
  <g transform="translate(10, 30)">
    <path d="M60,50 L120,80 L120,150 L60,120 Z" fill="none" stroke="#4F6EF7" strokeWidth={1.5} strokeDasharray="6,3" />
    <path d="M60,50 L120,20 L180,50 L120,80 Z" fill="none" stroke="#4F6EF7" strokeWidth={1.5} strokeDasharray="6,3" />
    <path d="M120,80 L180,50 L180,120 L120,150 Z" fill="none" stroke="#4F6EF7" strokeWidth={1.5} strokeDasharray="6,3" />
    <path d="M60,120 L120,150 L180,120" fill="none" stroke="#4F6EF7" strokeWidth={1.5} strokeDasharray="6,3" />
    <path d="M60,50 L60,120" fill="none" stroke="#4F6EF7" strokeWidth={1.5} strokeDasharray="6,3" />
    <line x1={170} y1={20} x2={170} y2={45} stroke="#4F6EF7" strokeWidth={1.5} />
    <line x1={157} y1={32} x2={183} y2={32} stroke="#4F6EF7" strokeWidth={1.5} />
    <path d="M60,120 L120,90 L180,120" fill="none" stroke="#4F6EF7" strokeWidth={0.8} strokeDasharray="4,3" />
    <path d="M120,90 L120,150" fill="none" stroke="#4F6EF7" strokeWidth={0.8} strokeDasharray="4,3" />
    <rect x={56} y={46} width={8} height={8} fill="#4F6EF7" rx={1} />
    <rect x={116} y={76} width={8} height={8} fill="#4F6EF7" rx={1} />
    <rect x={176} y={46} width={8} height={8} fill="#4F6EF7" rx={1} />
    <rect x={116} y={16} width={8} height={8} fill="#4F6EF7" rx={1} />
    <rect x={56} y={116} width={8} height={8} fill="#4F6EF7" rx={1} />
    <rect x={116} y={146} width={8} height={8} fill="#4F6EF7" rx={1} />
    <rect x={176} y={116} width={8} height={8} fill="#4F6EF7" rx={1} />
  </g>
);

export default function PlacedItem_ConceptA({ item, canvasRect, onRemove, onUpdate, onOpenModal, onNavigateToCad, onStartRetake, previewSelected = false }) {
  const elRef = useRef(null);
  const contentRef = useRef(null);
  const [selected, setSelected] = useState(false);
  const [cropMode, setCropMode] = useState(false);

  const cropScale = item.cropScale ?? 1;
  const cropOffset = item.cropOffset ?? { x: 0, y: 0 };

  useEffect(() => {
    if (!selected) return;
    const handleClickOutside = (e) => {
      if (elRef.current && !elRef.current.contains(e.target)) {
        setSelected(false);
        setCropMode(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onRemove(item.id);
      } else if (e.key === 'Escape' && cropMode) {
        e.preventDefault();
        setCropMode(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selected, item.id, onRemove, cropMode]);

  const handleDragStart = useCallback((e) => {
    if (e.target.closest('.resize-handle') || e.target.closest('.placed-image-controls') || e.target.closest('.placed-image-crop-inner') && cropMode) return;
    setSelected(true);
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = item.left;
    const startTop = item.top;
    const onMouseMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let newLeft = startLeft + dx;
      let newTop = startTop + dy;
      const maxLeft = canvasRect ? canvasRect.width - item.width : 0;
      const maxTop = canvasRect ? canvasRect.height - item.height : 0;
      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop = Math.max(0, Math.min(newTop, maxTop));
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
  }, [item.id, item.left, item.top, item.width, item.height, canvasRect, onUpdate, cropMode]);

  const handleResizeStart = useCallback((e, handlePos) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = item.width;
    const startHeight = item.height;
    const aspectRatio = startWidth / startHeight;
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
        if (handlePos === 'n') { newHeight = Math.max(MIN_SIZE, startHeight - dy); newTop = startTop + (startHeight - newHeight); }
        else if (handlePos === 's') { newHeight = Math.max(MIN_SIZE, startHeight + dy); }
        else if (handlePos === 'e') { newWidth = Math.max(MIN_SIZE, startWidth + dx); }
        else if (handlePos === 'w') { newWidth = Math.max(MIN_SIZE, startWidth - dx); newLeft = startLeft + (startWidth - newWidth); }
      } else {
        if (ev.shiftKey) {
          const wFromX = handlePos === 'se' || handlePos === 'ne' ? startWidth + dx : startWidth - dx;
          const hFromY = handlePos === 'se' || handlePos === 'sw' ? startHeight + dy : startHeight - dy;
          const wFromAspect = hFromY * aspectRatio;
          const hFromAspect = wFromX / aspectRatio;
          newWidth = wFromX;
          newHeight = hFromAspect;
          if (Math.abs(dy) > Math.abs(dx)) {
            newHeight = hFromY;
            newWidth = wFromAspect;
          }
        } else {
          newWidth = (handlePos === 'se' || handlePos === 'ne') ? startWidth + dx : startWidth - dx;
          newHeight = (handlePos === 'se' || handlePos === 'sw') ? startHeight + dy : startHeight - dy;
        }
        const widthDiff = startWidth - newWidth;
        const heightDiff = startHeight - newHeight;
        if (handlePos === 'nw') { newLeft = startLeft + widthDiff; newTop = startTop + heightDiff; }
        else if (handlePos === 'ne') { newTop = startTop + heightDiff; }
        else if (handlePos === 'sw') { newLeft = startLeft + widthDiff; }
      }
      newWidth = Math.max(MIN_SIZE, newWidth);
      newHeight = Math.max(MIN_SIZE, newHeight);
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
  }, [item.id, item.width, item.height, item.left, item.top, canvasRect, onUpdate]);

  const handleCropPanStart = useCallback((e) => {
    if (!cropMode || item.type === 'placeholder') return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startOffsetX = cropOffset.x;
    const startOffsetY = cropOffset.y;
    const onMouseMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      onUpdate(item.id, { cropOffset: { x: startOffsetX + dx, y: startOffsetY + dy } });
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.classList.remove('crop-pan-active');
      document.body.style.cursor = '';
    };
    document.body.classList.add('crop-pan-active');
    document.body.style.cursor = 'grab';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [cropMode, item.type, item.id, cropOffset, onUpdate]);

  const handleCropScaleStart = useCallback((e) => {
    if (!cropMode || item.type === 'placeholder') return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startScale = cropScale;
    const onMouseMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const delta = (dx + dy) * 0.008;
      const next = Math.max(0.5, Math.min(3, startScale + delta));
      onUpdate(item.id, { cropScale: next });
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.classList.remove('crop-scale-active');
      document.body.style.cursor = '';
    };
    document.body.classList.add('crop-scale-active');
    document.body.style.cursor = 'nwse-resize';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [cropMode, item.type, item.id, cropScale, onUpdate]);

  const handleEnterCropMode = useCallback((e) => {
    e.stopPropagation();
    if (item.type !== 'placeholder') setCropMode(true);
  }, [item.type]);


  const isPlaceholder = item.type === 'placeholder';
  const className = [
    isPlaceholder ? 'placed-image-placeholder' : 'placed-image',
    (selected || previewSelected) ? 'placed-image-selected' : '',
    cropMode ? 'placed-image-crop-state' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={elRef}
      className={className}
      style={{
        position: 'absolute',
        left: item.left,
        top: item.top,
        width: item.width,
        height: item.height,
        zIndex: 10,
      }}
      onMouseDown={handleDragStart}
    >
      {/* Concept A: perimeter CTAs - hidden in crop state */}
      {!cropMode && (
      <div className="placed-image-controls" style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4, pointerEvents: 'auto' }}>
          <button type="button" aria-label="Broadcast" title="Broadcast" className="placed-cta-btn" onClick={(e) => { e.stopPropagation(); }}>
            <Radio size={18} />
          </button>
        </div>
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, pointerEvents: 'auto' }}>
          <button type="button" data-flow-anchor="replace" aria-label="Replace" title="Replace" className="placed-cta-btn" onClick={(e) => { e.stopPropagation(); onOpenModal?.('existing', item.id); }}>
            <Replace size={18} />
          </button>
          <button type="button" data-flow-anchor="retake" aria-label="Retake" title="Retake" className="placed-cta-btn" onClick={(e) => { e.stopPropagation(); onStartRetake?.(item.id); }}>
            <RetakeIcon size={18} />
          </button>
        </div>
        <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 4, pointerEvents: 'auto' }}>
          <button type="button" data-flow-anchor="3d-view" aria-label="3D view" title="3D view" className="placed-cta-btn" onClick={(e) => { e.stopPropagation(); onNavigateToCad?.(); }}>
            <Box size={18} />
          </button>
        </div>
        <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 4, pointerEvents: 'auto' }}>
          <button type="button" aria-label="Crop" title="Crop" className="placed-cta-btn" onClick={handleEnterCropMode} disabled={isPlaceholder}>
            <Crop size={18} />
          </button>
        </div>
      </div>
      )}
      {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map((pos) => (
        <div
          key={pos}
          className={`resize-handle resize-handle-${pos}${cropMode ? ' resize-handle-crop' : ''}`}
          data-handle={pos}
          onMouseDown={(e) => handleResizeStart(e, pos)}
          role="presentation"
          style={{ display: (pos === 'n' || pos === 's' || pos === 'e' || pos === 'w') && !cropMode ? 'none' : undefined }}
        />
      ))}
      {cropMode && !isPlaceholder && (
        <div
          className="crop-scale-handle"
          onMouseDown={handleCropScaleStart}
          role="presentation"
          title="Drag to scale image"
        />
      )}
      <div className="placed-image-content" style={{ overflow: 'hidden' }}>
        <div
          ref={contentRef}
          className="placed-image-crop-inner"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropScale})`,
            transformOrigin: 'center center',
            cursor: cropMode ? 'grab' : undefined,
          }}
          onMouseDown={cropMode ? handleCropPanStart : undefined}
        >
          {item.type === 'uploaded' && item.src && <img src={item.src} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />}
          {item.type === 'image' && item.svgContent && (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: item.svgContent }} />
          )}
          {item.type === 'placeholder' && (
            <div className="placeholder-inner">
              <svg viewBox="0 0 260 220" className="placeholder-illustration">{PLACEHOLDER_SVG}</svg>
              <span className="placeholder-label">Screenshot</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
