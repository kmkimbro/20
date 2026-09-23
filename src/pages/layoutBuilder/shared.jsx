import { tokenLabel } from './model.js';

export function swatchType(token) {
  if (!token) return 'empty';
  if (token.type === 'builtin') return token.id === 'page' ? 'page' : token.id === 'author' ? 'author' : 'date';
  if (token.type === 'placeholder' && (token.isImage || token.id === 'logo')) return 'logo';
  if (token.type === 'placeholder') return 'ph';
  if (token.type === 'text') return 'text';
  return 'empty';
}

export function LayoutThumb({ layout, compact = false }) {
  const rows = layout?.rows || [];
  return (
    <div className="lb-thumb" style={compact ? { gap: 4 } : undefined}>
      {rows.map((row, ri) => (
        <div
          key={ri}
          className="lb-thumb-row"
          style={{ gridTemplateColumns: `repeat(${Math.max(row.length, 1)}, 1fr)` }}
        >
          {row.map((cell, ci) => (
            <div key={ci} className={`lb-pill${swatchType(cell) === 'logo' ? ' is-logo' : ''}`}>
              {tokenLabel(cell)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function LayoutSwatches({ layout }) {
  const rows = layout?.rows || [];
  return (
    <div className="lb-swatches">
      {rows.map((row, ri) => (
        <div
          key={ri}
          className="lb-swatch-row"
          style={{ gridTemplateColumns: `repeat(${Math.max(row.length, 1)}, 1fr)` }}
        >
          {row.map((cell, ci) => (
            <div key={ci} className={`lb-swatch type-${swatchType(cell)}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function placePop(anchorEl, { width = 240, height = 280 } = {}) {
  if (!anchorEl) return { top: 80, left: 80 };
  const r = anchorEl.getBoundingClientRect();
  const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
  let top = r.bottom + 6;
  if (top + height > window.innerHeight) top = Math.max(8, r.top - height - 6);
  return { top, left };
}

export function typeTag(type) {
  if (type === 'footer') return { cls: 'is-footer', label: 'Footer' };
  if (type === 'header') return { cls: '', label: 'Header' };
  return { cls: 'is-none', label: 'Unassigned' };
}
