/**
 * Image workflow – Concept B: two separated buttons (e.g. Remove + Replace/Options).
 * Same drag/resize/content as production; controls are two distinct buttons.
 */
import { useRef, useCallback } from 'react';
import { X, ImagePlus } from 'lucide-react';

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

const btnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  background: 'rgba(0,0,0,0.5)',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

export default function PlacedItem_ConceptB({ item, canvasRect, onRemove, onUpdate }) {
  const elRef = useRef(null);

  const handleRemove = useCallback((e) => {
    e.stopPropagation();
    onRemove(item.id);
  }, [item.id, onRemove]);

  const handleDragStart = useCallback((e) => {
    if (e.target.closest('.resize-handle') || e.target.closest('.placed-image-controls')) return;
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
  }, [item.id, item.left, item.top, item.width, item.height, canvasRect, onUpdate]);

  const handleResizeStart = useCallback((e, handlePos) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = item.width;
    const startHeight = item.height;
    const aspectRatio = startWidth / startHeight;
    const startLeft = item.left;
    const startTop = item.top;
    const onMouseMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let newWidth, newHeight;
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
      newWidth = Math.max(MIN_SIZE, newWidth);
      newHeight = Math.max(MIN_SIZE, newHeight);
      if (canvasRect) {
        newWidth = Math.min(canvasRect.width, newWidth);
        newHeight = Math.min(canvasRect.height, newHeight);
      }
      const widthDiff = startWidth - newWidth;
      const heightDiff = startHeight - newHeight;
      let newLeft = startLeft;
      let newTop = startTop;
      if (handlePos === 'nw') {
        newLeft = startLeft + widthDiff;
        newTop = startTop + heightDiff;
      } else if (handlePos === 'ne') {
        newTop = startTop + heightDiff;
      } else if (handlePos === 'sw') {
        newLeft = startLeft + widthDiff;
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
    const cursorMap = { nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize' };
    document.body.style.cursor = cursorMap[handlePos];
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [item.id, item.width, item.height, item.left, item.top, canvasRect, onUpdate]);

  const isPlaceholder = item.type === 'placeholder';
  const className = isPlaceholder ? 'placed-image-placeholder' : 'placed-image';

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
      {/* Concept B: two separated buttons */}
      <div className="placed-image-controls" style={{ position: 'absolute', top: 8, right: 8, zIndex: 20, display: 'flex', gap: 6 }}>
        <button type="button" data-flow-anchor="remove" onClick={handleRemove} aria-label="Remove" style={btnStyle}>
          <X size={16} />
        </button>
        <button type="button" data-flow-anchor="replace" aria-label="Replace image" style={btnStyle} title="Replace (concept)">
          <ImagePlus size={16} />
        </button>
      </div>
      {['nw', 'ne', 'sw', 'se'].map((pos) => (
        <div
          key={pos}
          className={`resize-handle resize-handle-${pos}`}
          data-handle={pos}
          onMouseDown={(e) => handleResizeStart(e, pos)}
          role="presentation"
        />
      ))}
      <div className="placed-image-content">
        {item.type === 'uploaded' && item.src && <img src={item.src} alt="Uploaded" />}
        {item.type === 'image' && item.svgContent && <div dangerouslySetInnerHTML={{ __html: item.svgContent }} />}
        {item.type === 'placeholder' && (
          <div className="placeholder-inner">
            <svg viewBox="0 0 260 220" className="placeholder-illustration">{PLACEHOLDER_SVG}</svg>
            <span className="placeholder-label">Screenshot</span>
          </div>
        )}
      </div>
    </div>
  );
}
