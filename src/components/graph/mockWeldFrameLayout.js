/**
 * Weld frame connection graph layout — five dashed zones (reference UI).
 * Process docs | CAD & parts | Quality & maintenance | Tools | Operations & people
 */

/** Every graph node card (CAD, document PRD, tool, op, person) uses this box. */
export const GRAPH_CARD_SIZE = { width: 236, height: 108 };
/** Vertical / horizontal gap between adjacent cards. */
export const GRAPH_CARD_GAP = 8;
/** Outer padding around the graph canvas content. */
export const GRAPH_PAGE_MARGIN = 24;

const { width: CW, height: CH } = GRAPH_CARD_SIZE;
const G = GRAPH_CARD_GAP;
/** Top of the n-th stacked card (0-based) in a column. */
const stackTop = (n) => 80 + n * (CH + G);

const lastOpTop = stackTop(4);
const peopleRowTop = lastOpTop + CH + G;

const CANVAS_HEIGHT = peopleRowTop + CH + 40;
const CANVAS_WIDTH = 1664;
const ZONE_H = CANVAS_HEIGHT - 32;

/** Canvas inner size (absolute nodes + zones). */
export const MOCK_WELD_FRAME_CANVAS = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };

/**
 * Zone guides: label + position + accent (dashed border color).
 * @type {{ id: string; left: number; top: number; width: number; height: number; label: string; accent: string; tint: string }[]}
 */
export const MOCK_WELD_FRAME_ZONES = [
  {
    id: 'z-process',
    left: 16,
    top: 16,
    width: 296,
    height: ZONE_H,
    label: 'Process docs',
    accent: '#059669',
    tint: 'rgba(5, 150, 105, 0.06)',
  },
  {
    id: 'z-cad',
    left: 320,
    top: 16,
    width: 296,
    height: ZONE_H,
    label: 'CAD & parts',
    accent: '#4F6EF7',
    tint: 'rgba(79, 110, 247, 0.06)',
  },
  {
    id: 'z-quality',
    left: 624,
    top: 16,
    width: 288,
    height: ZONE_H,
    label: 'Quality & maintenance',
    accent: '#0d9488',
    tint: 'rgba(13, 148, 136, 0.07)',
  },
  {
    id: 'z-tools',
    left: 920,
    top: 16,
    width: 280,
    height: ZONE_H,
    label: 'Tools & fixtures',
    accent: '#d97706',
    tint: 'rgba(217, 119, 6, 0.08)',
  },
  {
    id: 'z-ops',
    left: 1208,
    top: 16,
    width: 440,
    height: ZONE_H,
    label: 'Operations & people',
    accent: '#7c3aed',
    tint: 'rgba(124, 58, 237, 0.06)',
  },
];

/** Center a card of width CW in a zone of width zw, zone left zl */
function cx(zl, zw) {
  return zl + Math.max(G, Math.floor((zw - CW) / 2));
}

const col = (zones, zoneId) => zones.find((z) => z.id === zoneId);

const L_PROCESS = cx(col(MOCK_WELD_FRAME_ZONES, 'z-process').left, col(MOCK_WELD_FRAME_ZONES, 'z-process').width);
const L_CAD = cx(col(MOCK_WELD_FRAME_ZONES, 'z-cad').left, col(MOCK_WELD_FRAME_ZONES, 'z-cad').width);
const L_QUALITY = cx(col(MOCK_WELD_FRAME_ZONES, 'z-quality').left, col(MOCK_WELD_FRAME_ZONES, 'z-quality').width);
const L_TOOLS = cx(col(MOCK_WELD_FRAME_ZONES, 'z-tools').left, col(MOCK_WELD_FRAME_ZONES, 'z-tools').width);
const L_OPS = col(MOCK_WELD_FRAME_ZONES, 'z-ops').left + G;
const L_OPS_B = L_OPS + CW + G;

/** @type {Record<string, { left: number; top: number }>} */
export const MOCK_WELD_FRAME_NODE_POSITIONS = {
  wi002: { left: L_PROCESS, top: stackTop(0) },
  wi001: { left: L_PROCESS, top: stackTop(1) },
  cad01: { left: L_CAD, top: stackTop(0) },
  pn441: { left: L_CAD, top: stackTop(1) },
  pn882: { left: L_CAD, top: stackTop(2) },
  qc07: { left: L_QUALITY, top: stackTop(0) },
  maint03: { left: L_QUALITY, top: stackTop(1) },
  tool01: { left: L_TOOLS, top: stackTop(0) },
  tool02: { left: L_TOOLS, top: stackTop(1) },
  tool03: { left: L_TOOLS, top: stackTop(2) },
  op01: { left: L_OPS, top: stackTop(0) },
  op02: { left: L_OPS, top: stackTop(1) },
  op03: { left: L_OPS, top: stackTop(2) },
  op04: { left: L_OPS, top: stackTop(3) },
  op05: { left: L_OPS, top: stackTop(4) },
  alice: { left: L_OPS, top: peopleRowTop },
  bob: { left: L_OPS_B, top: peopleRowTop },
};

/** Legend row (matches node type colors) for the graph header. */
export const MOCK_WELD_FRAME_LEGEND = [
  { key: 'cad', label: 'CAD / parts', color: '#4F6EF7' },
  { key: 'document', label: 'Documents', color: '#059669' },
  { key: 'tool', label: 'Tools', color: '#d97706' },
  { key: 'operation', label: 'Operations', color: '#7c3aed' },
  { key: 'person', label: 'People', color: '#64748b' },
];
