import { GRID_COLS, gridRowCount, tokenLabel } from './model.js';

export function swatchType(token) {
  if (!token) return 'empty';
  if (token.type === 'builtin') return token.id === 'page' ? 'page' : token.id === 'author' ? 'author' : 'date';
  if (token.type === 'placeholder' && (token.isImage || token.id === 'logo')) return 'logo';
  if (token.type === 'placeholder') return 'ph';
  if (token.type === 'text') return 'text';
  return 'empty';
}

function gridStyle(items, rowPx) {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${gridRowCount(items)}, ${rowPx}px)`,
    gap: 3,
  };
}

function gridPlacement(item) {
  return {
    gridColumn: `${item.x + 1} / span ${item.w}`,
    gridRow: `${item.y + 1} / span ${item.h}`,
    minWidth: 0,
  };
}

export function LayoutThumb({ layout, compact = false }) {
  const items = Array.isArray(layout?.items) && layout.items.length ? layout.items : null;
  if (items) {
    return (
      <div className="lb-thumb" style={gridStyle(items, compact ? 14 : 18)}>
        {items.map((item) => (
          <div
            key={item.id}
            className={`lb-pill${swatchType(item.token) === 'logo' ? ' is-logo' : ''}`}
            style={gridPlacement(item)}
          >
            {tokenLabel(item.token)}
          </div>
        ))}
      </div>
    );
  }
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
  const items = Array.isArray(layout?.items) && layout.items.length ? layout.items : null;
  if (items) {
    return (
      <div className="lb-swatches" style={gridStyle(items, 18)}>
        {items.map((item) => (
          <div
            key={item.id}
            className={`lb-swatch type-${swatchType(item.token)}`}
            style={gridPlacement(item)}
          />
        ))}
      </div>
    );
  }
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
