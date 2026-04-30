import { useState, useRef, useCallback, useEffect } from 'react';
import { usePrototype } from '../contexts/PrototypeContext.jsx';
import PrototypeProvider from '../contexts/PrototypeProvider.jsx';
import { getFlowForConcept, DOCUMENT_FLOW } from '../config/flowScreens.js';

// ─── Card dimensions ──────────────────────────────────────────────────────────
const CW = 260;   // card width
const CH = 170;   // card height
const GAP_X = 90;
const GAP_Y = 110;
const MARGIN = 60;

// ─── Palette ──────────────────────────────────────────────────────────────────
const P = {
  nav:          '#5884E7',
  blue:         '#4F6EF7',
  blueLight:    '#EEF1FE',
  sidebar:      '#f7f8fa',
  sidebarBdr:   '#e8ecf0',
  bg:           '#f0f2f7',
  cardBg:       '#fff',
  cardBdr:      '#dde2ea',
  gray100:      '#f5f6f8',
  gray200:      '#e4e7ec',
  gray300:      '#c8cdd6',
  gray500:      '#9ea5b0',
  gray700:      '#52596a',
  text:         '#22273a',
  arrow:        '#4F6EF7',
  arrowAlt:     '#7c3aed',
  dot:          '#ef4444',
  dotBorder:    '#fff',
  labelBg:      '#fff',
  labelText:    '#374151',
  labelBdr:     '#e5e7eb',
  highlight:    '#4F6EF7',
  highlightBg:  '#EEF1FE',
};

// ─── Tile position helpers ─────────────────────────────────────────────────────
function tilePos(col, row) {
  return { x: MARGIN + col * (CW + GAP_X), y: MARGIN + row * (CH + GAP_Y) };
}

function anchorPoint(screen, anchorName) {
  const { x, y } = tilePos(screen.col, screen.row);
  const a = screen.anchors?.[anchorName];
  return { x: x + (a?.x ?? 0.5) * CW, y: y + (a?.y ?? 0.5) * CH };
}

// ─── Manhattan path builder ────────────────────────────────────────────────────
const CORNER_R = 10;

function buildPath(sx, sy, ex, ey, midOffset = 0) {
  const dx = ex - sx;
  const dy = ey - sy;
  const horiz = Math.abs(dx) >= Math.abs(dy);
  const R = CORNER_R;

  let p; // waypoints [x, y, x, y, x, y] = 3 segments, 4 points
  if (horiz) {
    const mx = (sx + ex) / 2 + midOffset;
    p = [sx, sy, mx, sy, mx, ey, ex, ey];
  } else {
    const my = (sy + ey) / 2 + midOffset;
    p = [sx, sy, sx, my, ex, my, ex, ey];
  }

  // Build SVG path with rounded corners at turns
  function seg(ax, ay, bx, by, cx, cy) {
    const d1x = bx - ax, d1y = by - ay;
    const d2x = cx - bx, d2y = cy - by;
    const l1 = Math.sqrt(d1x * d1x + d1y * d1y);
    const l2 = Math.sqrt(d2x * d2x + d2y * d2y);
    if (l1 < 0.5 || l2 < 0.5) return `L ${bx} ${by}`;
    const r = Math.min(R, l1 / 2, l2 / 2);
    const bfx = bx - (d1x / l1) * r, bfy = by - (d1y / l1) * r;
    const afx = bx + (d2x / l2) * r, afy = by + (d2y / l2) * r;
    return `L ${bfx} ${bfy} Q ${bx} ${by} ${afx} ${afy}`;
  }

  const c1 = seg(p[0], p[1], p[2], p[3], p[4], p[5]);
  const c2 = seg(p[2], p[3], p[4], p[5], p[6], p[7]);
  return `M ${p[0]} ${p[1]} ${c1} ${c2} L ${p[6]} ${p[7]}`;
}

// Compute offset for each connection to separate parallel paths
function computeOffsets(connections, screens) {
  const screenById = Object.fromEntries(screens.map(s => [s.id, s]));
  // Group by {fromTile, toTile} (undirected)
  const groups = {};
  connections.forEach((conn, i) => {
    const a = conn.from, b = conn.to;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(i);
  });
  const offsets = new Array(connections.length).fill(0);
  Object.values(groups).forEach(group => {
    if (group.length <= 1) return;
    group.forEach((ci, gi) => {
      offsets[ci] = (gi - (group.length - 1) / 2) * 18;
    });
  });
  return offsets;
}

// ─── Arrow label midpoint ─────────────────────────────────────────────────────
function labelPoint(sx, sy, ex, ey, midOffset) {
  const dx = ex - sx;
  const dy = ey - sy;
  const horiz = Math.abs(dx) >= Math.abs(dy);
  if (horiz) {
    const mx = (sx + ex) / 2 + midOffset;
    return { x: mx, y: (sy + ey) / 2 };
  } else {
    const my = (sy + ey) / 2 + midOffset;
    return { x: (sx + ex) / 2, y: my };
  }
}

// ─── Static card components ───────────────────────────────────────────────────

function NavBar() {
  return <div style={{ height: 14, background: P.nav, borderRadius: '5px 5px 0 0' }} />;
}

function ToolBtn({ label, highlight, style }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 18, height: 16, borderRadius: 3, fontSize: 7, userSelect: 'none',
      background: highlight ? P.blue : P.gray100,
      color: highlight ? '#fff' : P.gray500,
      border: `1px solid ${highlight ? P.blue : P.gray200}`,
      boxShadow: highlight ? '0 0 0 2px rgba(79,110,247,0.25)' : 'none',
      ...style,
    }}>
      {label}
    </div>
  );
}

function AnchorDots({ screen }) {
  if (!screen.anchors) return null;
  return (
    <>
      {Object.entries(screen.anchors).map(([name, pos]) => (
        <div key={name} style={{
          position: 'absolute',
          left: pos.x * CW - 5,
          top: pos.y * CH - 5,
          width: 10, height: 10,
          borderRadius: '50%',
          background: P.dot,
          border: `2px solid ${P.dotBorder}`,
          boxShadow: '0 0 0 2px rgba(239,68,68,0.3)',
          zIndex: 20,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );
}

function CardShell({ screen, children }) {
  return (
    <div style={{
      position: 'absolute',
      left: tilePos(screen.col, screen.row).x,
      top: tilePos(screen.col, screen.row).y,
      width: CW, height: CH,
      background: P.cardBg,
      border: `1.5px solid ${P.cardBdr}`,
      borderRadius: 6,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
    }}>
      {children}
      <AnchorDots screen={screen} />
    </div>
  );
}

function CardLabel({ screen }) {
  const { x, y } = tilePos(screen.col, screen.row);
  return (
    <div style={{
      position: 'absolute',
      left: x,
      top: y + CH + 8,
      width: CW,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: 600,
      color: P.gray700,
      pointerEvents: 'none',
      userSelect: 'none',
    }}>
      {screen.label}
    </div>
  );
}

// ─── Individual screen cards ───────────────────────────────────────────────────

function DocumentCard({ screen }) {
  return (
    <CardShell screen={screen}>
      <NavBar />
      {/* Toolbar */}
      <div style={{ height: 22, background: P.cardBg, borderBottom: `1px solid ${P.gray200}`, display: 'flex', alignItems: 'center', gap: 3, padding: '0 6px' }}>
        <ToolBtn label="T" />
        <ToolBtn label="⬛" />
        <ToolBtn label="📷" highlight title="Camera / CAD nav" />
        <ToolBtn label="🖼" highlight title="Place image" />
        <div style={{ flex: 1 }} />
        <ToolBtn label="★" />
        <ToolBtn label="👷" />
        <ToolBtn label="✉" />
      </div>
      {/* Body */}
      <div style={{ display: 'flex', height: CH - 36, overflow: 'hidden' }}>
        <div style={{ width: 55, background: P.sidebar, borderRight: `1px solid ${P.sidebarBdr}`, padding: '4px 4px', flexShrink: 0 }}>
          {['1. Op 1', '2. Op 2', '3. Op 3', '4. Op 4', '5. Op 5'].map((t, i) => (
            <div key={i} style={{ fontSize: 6.5, color: P.gray700, padding: '2px 3px', borderRadius: 2, marginBottom: 1 }}>{t}</div>
          ))}
        </div>
        <div style={{ flex: 1, background: P.gray100, padding: 5, overflow: 'hidden' }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, color: P.text, marginBottom: 3 }}>Operation 1 - Page 1</div>
          <div style={{ background: P.cardBg, borderRadius: 2, padding: '2px 3px', border: `1px solid ${P.gray200}`, marginBottom: 4 }}>
            <div style={{ display: 'flex', gap: 2, marginBottom: 1.5 }}>
              {['ID', 'Part Name', 'QTY'].map(h => (
                <div key={h} style={{ flex: 1, fontSize: 5.5, color: P.gray500, background: P.gray100, padding: '1px 2px', textAlign: 'center' }}>{h}</div>
              ))}
            </div>
            {[['A', 'Screw M4'], ['B', 'Loctite 222']].map(([id, name]) => (
              <div key={id} style={{ display: 'flex', gap: 2, marginBottom: 1 }}>
                <div style={{ width: 10, fontSize: 5.5, color: P.gray700 }}>{id}</div>
                <div style={{ flex: 1, fontSize: 5.5, color: P.gray700 }}>{name}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 46, background: P.gray200, borderRadius: 3, border: `1.5px dashed ${P.gray300}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 6, color: P.gray500 }}>Image / canvas area</div>
          </div>
        </div>
      </div>
    </CardShell>
  );
}

function ImageSelectedCard({ screen }) {
  return (
    <CardShell screen={screen}>
      <NavBar />
      <div style={{ height: 22, background: P.cardBg, borderBottom: `1px solid ${P.gray200}`, display: 'flex', alignItems: 'center', gap: 3, padding: '0 6px' }}>
        <ToolBtn label="T" />
        <ToolBtn label="⬛" />
        <ToolBtn label="📷" />
        <ToolBtn label="🖼" />
        <div style={{ flex: 1 }} />
        <ToolBtn label="★" />
      </div>
      {/* Canvas body with selected image */}
      <div style={{ position: 'relative', height: CH - 36, background: P.gray100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Image placeholder */}
        <div style={{ width: 160, height: 100, background: P.gray200, border: `2px solid ${P.blue}`, borderRadius: 4, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 6, color: P.gray500 }}>Selected image</div>
          {/* Resize handles */}
          {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([dx,dy],i) => (
            <div key={i} style={{
              position:'absolute', width:6, height:6, background:P.blue, borderRadius:1,
              left: dx < 0 ? -3 : undefined, right: dx > 0 ? -3 : undefined,
              top: dy < 0 ? -3 : undefined, bottom: dy > 0 ? -3 : undefined,
            }}/>
          ))}
        </div>
        {/* Action buttons - right side (replace + retake) */}
        <div style={{ position: 'absolute', right: 4, top: '28%', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ width: 20, height: 18, background: P.blue, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px rgba(79,110,247,0.3)' }}>
            <span style={{ fontSize: 8, color: '#fff' }}>↺</span>
          </div>
          <div style={{ width: 20, height: 18, background: P.blue, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px rgba(79,110,247,0.3)' }}>
            <span style={{ fontSize: 8, color: '#fff' }}>📷</span>
          </div>
        </div>
        {/* 3D view button - left side */}
        <div style={{ position: 'absolute', left: 4, bottom: '20%' }}>
          <div style={{ width: 20, height: 18, background: P.blue, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px rgba(79,110,247,0.3)' }}>
            <span style={{ fontSize: 8, color: '#fff' }}>⬡</span>
          </div>
        </div>
      </div>
    </CardShell>
  );
}

function ScreenshotModalCard({ screen }) {
  return (
    <CardShell screen={screen}>
      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', borderRadius: 5 }} />
      {/* Modal dialog */}
      <div style={{ position: 'absolute', left: 14, right: 14, top: 16, bottom: 12, background: P.cardBg, borderRadius: 5, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        {/* Tabs */}
        <div style={{ height: 24, borderBottom: `1px solid ${P.gray200}`, display: 'flex', alignItems: 'stretch' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 600, color: P.blue, borderBottom: `2px solid ${P.blue}` }}>Use existing</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, color: P.gray500 }}>Upload new</div>
          <div style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: P.gray500, padding: '0 4px' }}>✕</div>
        </div>
        {/* Section label */}
        <div style={{ padding: '4px 6px 2px', fontSize: 6, fontWeight: 700, color: P.text }}>CAD Screenshots</div>
        {/* Screenshot grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, padding: '2px 6px' }}>
          {[0,1,2,3,4,5].map(i => (
            <div key={i} style={{ aspectRatio: '4/3', background: i < 3 ? '#e8d5b0' : P.gray200, borderRadius: 2, border: `1px solid ${P.gray200}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {i < 3 && <div style={{ width: '70%', height: '60%', background: '#d4a76a', borderRadius: 1, opacity: 0.7 }} />}
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

function CadViewCard({ screen }) {
  return (
    <CardShell screen={screen}>
      <NavBar />
      <div style={{ display: 'flex', height: CH - 14 }}>
        {/* Left panel */}
        <div style={{ width: 55, background: P.sidebar, borderRight: `1px solid ${P.sidebarBdr}`, padding: 4, flexShrink: 0 }}>
          <div style={{ fontSize: 6, fontWeight: 700, color: P.text, marginBottom: 3 }}>Assembly Tree</div>
          {['Part A', 'Part B', 'Part C', 'Part D', 'Part E', 'Part F'].map((t, i) => (
            <div key={i} style={{ fontSize: 5.5, color: P.gray700, padding: '1px 2px', display: 'flex', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: P.gray300 }} />{t}
            </div>
          ))}
        </div>
        {/* Right: viewer + toolbar */}
        <div style={{ flex: 1, position: 'relative', background: P.gray100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* 3D model placeholder */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
            <div style={{ width: 40, height: 40, border: `2px solid ${P.gray300}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⬡</div>
            <div style={{ fontSize: 6, color: P.gray500, marginTop: 2 }}>CAD model</div>
          </div>
          {/* Bottom toolbar */}
          <div style={{ position: 'absolute', bottom: 4, left: 8, right: 8 }}>
            <div style={{ height: 20, background: P.cardBg, borderRadius: 10, border: `1px solid ${P.gray200}`, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 6px' }}>
              {['⟳','↔','↕','⬡'].map((icon, i) => (
                <div key={i} style={{ fontSize: 8, color: P.gray500 }}>{icon}</div>
              ))}
              {/* Screenshot button highlighted */}
              <div style={{ width: 22, height: 15, background: P.blue, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px rgba(79,110,247,0.3)' }}>
                <span style={{ fontSize: 7, color: '#fff' }}>📷</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardShell>
  );
}

function DocumentTreeCard({ screen }) {
  return (
    <CardShell screen={screen}>
      <NavBar />
      {/* Header */}
      <div style={{ height: 20, borderBottom: `1px solid ${P.gray200}`, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
        <div style={{ fontSize: 7, fontWeight: 700, color: P.text }}>Test Document 1</div>
      </div>
      {/* Tabs */}
      <div style={{ height: 22, display: 'flex', borderBottom: `1px solid ${P.gray200}` }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6.5, fontWeight: 600, color: P.blue, borderBottom: `2px solid ${P.blue}`, background: P.blueLight }}>Outline view</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6.5, color: P.gray500 }}>Page view</div>
      </div>
      {/* Tree */}
      <div style={{ padding: '4px 6px', overflow: 'hidden' }}>
        {['📄 Cover', '📋 BOM', '1. Operation 1', '  ├ 1.1 Sub-op', '  └ Subpages ▸', '2. Operation 2'].map((t, i) => (
          <div key={i} style={{
            fontSize: 6.5, color: i === 4 ? P.blue : P.gray700,
            padding: '2px 3px', borderRadius: 2,
            background: i === 4 ? P.blueLight : 'transparent',
            fontWeight: i === 4 ? 600 : 400,
            marginBottom: 1,
          }}>{t}</div>
        ))}
      </div>
    </CardShell>
  );
}

function DocumentPagesCard({ screen }) {
  return (
    <CardShell screen={screen}>
      <NavBar />
      <div style={{ height: 20, borderBottom: `1px solid ${P.gray200}`, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
        <div style={{ fontSize: 7, fontWeight: 700, color: P.text }}>Test Document 1</div>
      </div>
      {/* Tabs */}
      <div style={{ height: 22, display: 'flex', borderBottom: `1px solid ${P.gray200}` }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6.5, color: P.gray500 }}>Outline view</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6.5, fontWeight: 600, color: P.blue, borderBottom: `2px solid ${P.blue}`, background: P.blueLight }}>Page view</div>
      </div>
      {/* Page thumbnails */}
      <div style={{ padding: '5px 6px', overflow: 'hidden' }}>
        <div style={{ fontSize: 6, color: P.gray500, marginBottom: 4 }}>Pages</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {['Cover', 'Op 1 – Page 1', 'Op 1 – Page 2', 'Op 2 – Page 1'].map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 36, height: 24, background: i === 0 ? P.nav : P.gray200, borderRadius: 2, border: `1px solid ${P.gray200}`, flexShrink: 0 }} />
              <div style={{ fontSize: 6.5, color: P.gray700 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

function PageActionsCard({ screen }) {
  return (
    <CardShell screen={screen}>
      <NavBar />
      <div style={{ height: 22, background: P.cardBg, borderBottom: `1px solid ${P.gray200}`, display: 'flex', alignItems: 'center', gap: 3, padding: '0 6px' }}>
        <ToolBtn label="T" />
        <ToolBtn label="🖼" />
        <ToolBtn label="⬛" />
        <div style={{ flex: 1 }} />
      </div>
      <div style={{ display: 'flex', height: CH - 36 }}>
        <div style={{ width: 55, background: P.sidebar, borderRight: `1px solid ${P.sidebarBdr}`, padding: '4px 4px', flexShrink: 0 }}>
          {['1. Op 1', '1.1 Sub', '2. Op 2'].map((t, i) => (
            <div key={i} style={{ fontSize: 6.5, color: P.gray700, padding: '2px 3px', marginBottom: 1 }}>{t}</div>
          ))}
        </div>
        <div style={{ flex: 1, position: 'relative', background: P.gray100, padding: 5 }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, color: P.text, marginBottom: 4 }}>Operation 1 Sub-page</div>
          <div style={{ height: 40, background: P.gray200, borderRadius: 2, border: `1.5px dashed ${P.gray300}` }} />
          {/* Floating page action buttons */}
          <div style={{ position: 'absolute', right: 3, top: '25%', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[
              { icon: '+', highlight: true, label: 'Add page' },
              { icon: '👁', highlight: false },
              { icon: '↑', highlight: false },
              { icon: '↓', highlight: false },
            ].map((btn, i) => (
              <div key={i} style={{
                width: 16, height: 15, borderRadius: 3,
                background: btn.highlight ? P.blue : P.cardBg,
                border: `1px solid ${btn.highlight ? P.blue : P.gray200}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 7, color: btn.highlight ? '#fff' : P.gray500,
                boxShadow: btn.highlight ? '0 0 0 2px rgba(79,110,247,0.25)' : '0 1px 2px rgba(0,0,0,0.06)',
              }}>{btn.icon}</div>
            ))}
          </div>
        </div>
      </div>
    </CardShell>
  );
}

function ImageTwoButtonsCard({ screen }) {
  return (
    <CardShell screen={screen}>
      <NavBar />
      <div style={{ height: 22, background: P.cardBg, borderBottom: `1px solid ${P.gray200}`, display: 'flex', alignItems: 'center', gap: 3, padding: '0 6px' }}>
        <ToolBtn label="T" />
        <ToolBtn label="⬛" />
        <ToolBtn label="🖼" />
        <div style={{ flex: 1 }} />
      </div>
      <div style={{ position: 'relative', height: CH - 36, background: P.gray100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Image placeholder */}
        <div style={{ width: 160, height: 100, background: P.gray200, border: `2px solid ${P.blue}`, borderRadius: 4, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 6, color: P.gray500 }}>Selected image</div>
        </div>
        {/* Remove + Replace buttons (Concept B style) */}
        <div style={{ position: 'absolute', right: 4, top: '22%', display: 'flex', gap: 4 }}>
          <div style={{ width: 20, height: 18, background: '#dc2626', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px rgba(220,38,38,0.3)' }}>
            <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✕</span>
          </div>
          <div style={{ width: 20, height: 18, background: P.blue, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px rgba(79,110,247,0.3)' }}>
            <span style={{ fontSize: 8, color: '#fff' }}>↺</span>
          </div>
        </div>
      </div>
    </CardShell>
  );
}

// Map screen.id to card component
const CARD_COMPONENTS = {
  'document':          DocumentCard,
  'image-selected':    ImageSelectedCard,
  'screenshot-modal':  ScreenshotModalCard,
  'cad-view':          CadViewCard,
  'document-tree':     DocumentTreeCard,
  'document-pages':    DocumentPagesCard,
  'page-actions':      PageActionsCard,
  'image-two-buttons': ImageTwoButtonsCard,
};

// ─── Flow connections SVG overlay ─────────────────────────────────────────────

const ARROW_COLOR = P.arrow;

function FlowArrows({ screens, connections, canvasW, canvasH }) {
  const screenById = Object.fromEntries(screens.map(s => [s.id, s]));
  const offsets = computeOffsets(connections, screens);

  return (
    <svg style={{ position: 'absolute', inset: 0, width: canvasW, height: canvasH, pointerEvents: 'none', overflow: 'visible' }}>
      <defs>
        <marker id="fc-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0.5 L6.5,3.5 L0,6.5 Z" fill={ARROW_COLOR} />
        </marker>
      </defs>
      {connections.map((conn, i) => {
        const fromS = screenById[conn.from];
        const toS = screenById[conn.to];
        if (!fromS || !toS) return null;

        const start = anchorPoint(fromS, conn.fromAnchor);
        const end = anchorPoint(toS, conn.toAnchor);
        const offset = offsets[i];
        const d = buildPath(start.x, start.y, end.x, end.y, offset);
        const lp = labelPoint(start.x, start.y, end.x, end.y, offset);

        return (
          <g key={i}>
            {/* Path shadow for readability */}
            <path d={d} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
            {/* Main arrow */}
            <path d={d} fill="none" stroke={ARROW_COLOR} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#fc-arrow)" />
            {/* Label pill */}
            <foreignObject x={lp.x - 36} y={lp.y - 10} width={72} height={20} style={{ pointerEvents: 'none' }}>
              <div style={{
                background: P.labelBg,
                border: `1px solid ${P.labelBdr}`,
                borderRadius: 10,
                padding: '2px 7px',
                fontSize: 9,
                fontWeight: 600,
                color: P.blue,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {conn.action}
              </div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Pan / zoom canvas ─────────────────────────────────────────────────────────

function usePanZoom(canvasW, canvasH) {
  const containerRef = useRef(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const [, forceUpdate] = useState(0);
  const isDragging = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0 });

  // Fit on first render
  const didFit = useRef(false);
  const fitToScreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    const pad = 48;
    const scale = Math.min(1.2, Math.min((vw - pad * 2) / canvasW, (vh - pad * 2) / canvasH));
    const x = (vw - canvasW * scale) / 2;
    const y = (vh - canvasH * scale) / 2;
    transformRef.current = { x, y, scale };
    forceUpdate(n => n + 1);
  }, [canvasW, canvasH]);

  useEffect(() => {
    if (!didFit.current) {
      const el = containerRef.current;
      if (el && el.clientWidth > 0) {
        didFit.current = true;
        fitToScreen();
      }
    }
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      const prev = transformRef.current;
      const newScale = Math.min(5, Math.max(0.15, prev.scale * factor));
      const ratio = newScale / prev.scale;
      transformRef.current = { scale: newScale, x: mx - (mx - prev.x) * ratio, y: my - (my - prev.y) * ratio };
      forceUpdate(n => n + 1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    dragOrigin.current = { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y };
    e.currentTarget.style.cursor = 'grabbing';
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    transformRef.current = { ...transformRef.current, x: e.clientX - dragOrigin.current.x, y: e.clientY - dragOrigin.current.y };
    forceUpdate(n => n + 1);
  }, []);

  const onMouseUp = useCallback((e) => {
    isDragging.current = false;
    if (e.currentTarget) e.currentTarget.style.cursor = 'grab';
  }, []);

  const getTransform = () => transformRef.current;

  return { containerRef, getTransform, fitToScreen, onMouseDown, onMouseMove, onMouseUp };
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function WireframeFlowView() {
  const { conceptId } = usePrototype();
  const flow = getFlowForConcept(conceptId);
  const { screens, connections } = flow;
  const isDocumentFlow = flow === DOCUMENT_FLOW;

  const maxCol = Math.max(...screens.map(s => s.col));
  const maxRow = Math.max(...screens.map(s => s.row));
  const canvasW = MARGIN * 2 + (maxCol + 1) * CW + maxCol * GAP_X;
  const canvasH = MARGIN * 2 + (maxRow + 1) * CH + maxRow * GAP_Y + 28; // +28 for labels

  const { containerRef, getTransform, fitToScreen, onMouseDown, onMouseMove, onMouseUp } = usePanZoom(canvasW, canvasH);

  const flowLabel = isDocumentFlow ? 'Document flow' : 'Screenshot flow';

  const canvas = (
    <div style={{ position: 'relative', width: canvasW, height: canvasH }}>
      {screens.map(screen => {
        const CardComponent = CARD_COMPONENTS[screen.id];
        return CardComponent ? (
          <div key={screen.id}>
            <CardComponent screen={screen} />
            <CardLabel screen={screen} />
          </div>
        ) : null;
      })}
      <FlowArrows screens={screens} connections={connections} canvasW={canvasW} canvasH={canvasH} />
    </div>
  );

  const content = (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: '1px solid #e5e7eb', borderRadius: 10,
          padding: '4px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{flowLabel}</span>
          <div style={{ width: 1, height: 14, background: '#e5e7eb' }} />
          <button
            type="button"
            onClick={fitToScreen}
            style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px', borderRadius: 4 }}
            title="Fit to screen"
          >
            ⊞ Fit
          </button>
          <div style={{ width: 1, height: 14, background: '#e5e7eb' }} />
          <span style={{ fontSize: 11, color: '#9ca3af' }}>Scroll to zoom · Drag to pan</span>
        </div>
      </div>

      {/* Pan/zoom viewport */}
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0, cursor: 'grab', overflow: 'hidden', background: P.bg, position: 'relative' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Dot grid background */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <defs>
            <pattern id="fc-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#d1d5db" opacity="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#fc-dots)" />
        </svg>

        {/* Transformed canvas */}
        <div
          style={{
            position: 'absolute',
            transformOrigin: '0 0',
            transform: `translate(${getTransform().x}px, ${getTransform().y}px) scale(${getTransform().scale})`,
          }}
        >
          {canvas}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', height: 'calc(100vh - var(--topnav-height, 52px))', position: 'relative' }}>
      {isDocumentFlow ? (
        <PrototypeProvider conceptId="image-two-buttons">
          {content}
        </PrototypeProvider>
      ) : content}
    </div>
  );
}
