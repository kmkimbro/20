export const STORAGE_KEY = 'layout_builder_v1';

export const C = {
  blue: '#4F6EF7',
  blueDeep: '#223EB5',
  blueLight: '#EEF1FE',
  nav: '#5884E7',
  bg: '#F0F2F7',
  card: '#ffffff',
  cardBdr: '#E5E7EB',
  text: '#111827',
  sub: '#6B7280',
  muted: '#9CA3AF',
  amber: '#FDE68A',
  amberBg: '#FEF3C7',
  amberText: '#92400E',
};

export const CURRENT_USER = 'Jane Smith';
export const REF_DATE = new Date(2026, 8, 17);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DATE_FORMATS = [
  { id: 'medium', preview: 'Sep 17 2026' },
  { id: 'us', preview: '09/17/2026' },
  { id: 'iso', preview: '2026-09-17' },
  { id: 'long', preview: '17 Sep 2026' },
];

export const PAGE_FORMATS = [
  { id: 'n', preview: '1' },
  { id: 'nOfM', preview: '1 of 4' },
  { id: 'pageN', preview: 'Page 1' },
  { id: 'pageNofM', preview: 'Page 1 of 4' },
];

export const DOC_TEMPLATES = [
  { id: 'eng-report', name: 'Engineering Report', headerId: 'lay-official', footerId: 'lay-footer1' },
  { id: 'test-proc', name: 'Test Procedure', headerId: 'lay-company', footerId: 'lay-footer1' },
  { id: 'work-inst', name: 'Work Instruction', headerId: 'lay-unofficial', footerId: 'lay-footer2' },
  { id: 'change-order', name: 'Change Order', headerId: 'lay-official', footerId: 'lay-footer2' },
];

export const AURORA_LOGO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="150" height="28" viewBox="0 0 150 28">
  <path d="M5 23 L15 5 L25 23" fill="none" stroke="#1e3a8a" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M9 23 L15 12 L21 23" fill="none" stroke="#3b82f6" stroke-width="1.3" stroke-linejoin="round"/>
  <text x="32" y="13" font-family="Inter,Arial,sans-serif" font-size="9" font-weight="700" fill="#1e3a8a" letter-spacing="1.4">AURORA</text>
  <text x="32" y="23" font-family="Inter,Arial,sans-serif" font-size="7" font-weight="500" fill="#64748b" letter-spacing="1.6">ANALYTICS</text>
</svg>`)}`;

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatDate(date, formatId) {
  const d = date instanceof Date ? date : REF_DATE;
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  if (formatId === 'us') return `${pad2(m + 1)}/${pad2(day)}/${y}`;
  if (formatId === 'iso') return `${y}-${pad2(m + 1)}-${pad2(day)}`;
  if (formatId === 'long') return `${day} ${MONTHS[m]} ${y}`;
  return `${MONTHS[m]} ${day} ${y}`;
}

export function formatPage(formatId, pageIndex, pageCount) {
  const n = pageIndex;
  const m = pageCount;
  if (formatId === 'n') return `${n}`;
  if (formatId === 'nOfM') return `${n} of ${m}`;
  if (formatId === 'pageNofM') return `Page ${n} of ${m}`;
  return `Page ${n}`;
}

export function tokenLabel(token) {
  if (!token) return '';
  if (token.type === 'text') return token.text || 'Text';
  if (token.type === 'builtin') {
    if (token.id === 'date') return 'Date';
    if (token.id === 'page') return 'Page number';
    if (token.id === 'author') return 'Author';
    return token.id;
  }
  if (token.type === 'placeholder') return token.label || token.id;
  return '';
}

export const GRID_COLS = 12;

export function rowsToItems(rows) {
  const items = [];
  (rows || []).forEach((row, y) => {
    const cells = row.length ? row : [null];
    const base = Math.floor(GRID_COLS / cells.length);
    let extra = GRID_COLS % cells.length;
    let x = 0;
    cells.forEach((token, ci) => {
      const w = Math.max(1, base + (extra > 0 ? 1 : 0));
      if (extra > 0) extra -= 1;
      items.push({
        id: `c-${y}-${ci}`,
        x,
        y,
        w,
        h: 1,
        token: token || null,
      });
      x += w;
    });
  });
  return items;
}

export function layoutItems(layout) {
  if (Array.isArray(layout?.items) && layout.items.length) return layout.items;
  return rowsToItems(layout?.rows || [[null]]);
}

export function itemsToRows(items) {
  const byRow = new Map();
  (items || []).forEach((item) => {
    const list = byRow.get(item.y) || [];
    list.push(item);
    byRow.set(item.y, list);
  });
  const rows = [...byRow.keys()].sort((a, b) => a - b).map((y) => (
    byRow.get(y).sort((a, b) => a.x - b.x).map((item) => item.token || null)
  ));
  return rows.length ? rows : [[null]];
}

export function gridRowCount(items) {
  return (items || []).reduce((max, item) => Math.max(max, item.y + item.h), 1);
}

export function cellCount(layout) {
  if (Array.isArray(layout?.items)) return layout.items.filter((item) => item?.token).length;
  return (layout?.rows || []).reduce((n, row) => n + row.filter(Boolean).length, 0);
}

export function emptyLayout(type = 'header') {
  return {
    id: uid('lay'),
    name: type === 'footer' ? 'Untitled Footer' : type === 'header' ? 'Untitled Header' : 'Untitled Layout',
    type: type || '',
    rows: [[null]],
  };
}

export function cloneLayout(layout) {
  return JSON.parse(JSON.stringify(layout));
}

export function layoutDocCount(layoutId, docState) {
  return Object.values(docState || {}).filter(
    (d) => d.headerId === layoutId || d.footerId === layoutId,
  ).length;
}

export function resolveToken(token, ctx) {
  if (!token) return { kind: 'empty', filled: true, text: '' };
  if (token.type === 'text') {
    return { kind: 'text', filled: Boolean(token.text), text: token.text || '' };
  }
  if (token.type === 'builtin') {
    if (token.id === 'date') {
      const fmt = ctx.values?.date_format || token.format || 'us';
      return { kind: 'date', filled: true, text: formatDate(ctx.date, fmt), format: fmt };
    }
    if (token.id === 'page') {
      const fmt = ctx.values?.page_format || token.format || 'pageN';
      return {
        kind: 'page',
        filled: true,
        text: formatPage(fmt, ctx.pageIndex, ctx.pageCount),
        format: fmt,
      };
    }
    if (token.id === 'author') {
      return { kind: 'text', filled: true, text: ctx.user || CURRENT_USER };
    }
  }
  if (token.type === 'placeholder') {
    const isImage = Boolean(token.isImage || token.id === 'logo');
    if (isImage) {
      const src = ctx.values?.[token.id] || token.src || null;
      return { kind: 'image', filled: Boolean(src), src, label: token.label || 'Logo', id: token.id };
    }
    let val = ctx.values?.[token.id];
    if (val == null || val === '') {
      if (token.id === 'docname') val = ctx.docName || '';
      else if (token.defaultVal) val = token.defaultVal;
      else val = '';
    }
    return {
      kind: 'placeholder',
      filled: Boolean(val),
      text: val || '',
      label: token.label || token.id,
      id: token.id,
      savedValues: token.savedValues || [],
    };
  }
  return { kind: 'empty', filled: true, text: '' };
}

function logoPh() {
  return { type: 'placeholder', id: 'logo', label: 'Logo', isImage: true };
}

export function seedState() {
  const layouts = [
    {
      id: 'lay-company',
      name: 'Company Header',
      type: 'header',
      rows: [
        [logoPh(), { type: 'builtin', id: 'page' }],
        [null, { type: 'builtin', id: 'date' }],
      ],
    },
    {
      id: 'lay-unofficial',
      name: 'Unofficial',
      type: 'header',
      rows: [
        [{ type: 'builtin', id: 'date' }, { type: 'builtin', id: 'page' }],
        [logoPh()],
      ],
    },
    {
      id: 'lay-official',
      name: 'Company Header - Official',
      type: 'header',
      rows: [
        [{ type: 'builtin', id: 'date' }, { type: 'placeholder', id: 'revision', label: 'Revision' }],
        [{ type: 'placeholder', id: 'nda', label: 'NDA', defaultVal: 'Confidential — NDA applies' }],
        [logoPh()],
      ],
    },
    {
      id: 'lay-footer1',
      name: 'Footer 1',
      type: 'footer',
      rows: [
        [{ type: 'builtin', id: 'date' }, { type: 'builtin', id: 'page' }],
        [logoPh()],
      ],
    },
    {
      id: 'lay-footer2',
      name: 'Footer 2',
      type: 'footer',
      rows: [
        [{ type: 'builtin', id: 'date' }, { type: 'builtin', id: 'page' }],
        [logoPh()],
      ],
    },
  ];

  return {
    layouts,
    savedConsts: [],
    savedLogos: [AURORA_LOGO],
    savedPlaceholders: [
      { id: 'nda', label: 'NDA Clause', defaultVal: 'Confidential — NDA applies' },
    ],
    projects: [{ id: 'proj-1', name: 'Untitled Project' }],
    documents: [
      { id: 'doc-1', name: 'Test Document 1', projectId: 'proj-1', created: 'Dec 21, 2024' },
      { id: 'doc-2', name: 'Untitled Document', projectId: 'proj-1', created: 'Sep 17, 2026' },
    ],
    docState: {
      'doc-1': {
        headerId: 'lay-company',
        footerId: 'lay-footer1',
        values: {
          date_format: 'us',
          page_format: 'pageN',
          logo: AURORA_LOGO,
          docname: 'Test Document 1',
        },
      },
      'doc-2': {
        headerId: 'lay-company',
        footerId: null,
        values: { date_format: 'medium', page_format: 'n' },
      },
    },
  };
}

export function loadState(key = STORAGE_KEY) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    const base = seedState();
    return {
      ...base,
      ...parsed,
      layouts: Array.isArray(parsed.layouts) ? parsed.layouts : base.layouts,
      savedConsts: Array.isArray(parsed.savedConsts) ? parsed.savedConsts : [],
      savedLogos: Array.isArray(parsed.savedLogos) ? parsed.savedLogos : [AURORA_LOGO],
      savedPlaceholders: Array.isArray(parsed.savedPlaceholders) ? parsed.savedPlaceholders : base.savedPlaceholders,
      projects: Array.isArray(parsed.projects) && parsed.projects.length ? parsed.projects : base.projects,
      documents: Array.isArray(parsed.documents) && parsed.documents.length ? parsed.documents : base.documents,
      docState: parsed.docState && typeof parsed.docState === 'object' ? parsed.docState : base.docState,
    };
  } catch {
    return seedState();
  }
}

export function saveState(state, key = STORAGE_KEY) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export const DOC_PAGES = [
  { id: 'cover', title: 'Cover', kind: 'meta', icon: 'book' },
  { id: 'history', title: 'Document Version History', kind: 'meta', icon: 'history' },
  { id: 'bom', title: 'Bill of Materials', kind: 'meta', icon: 'list' },
  { id: 'op1', title: 'Operation 1', kind: 'operation' },
  { id: 'op2', title: 'Operation 2', kind: 'operation', sample: true },
  { id: 'op2-sub', title: 'Sub-page 1', kind: 'sub', parent: 'op2' },
  { id: 'op3', title: 'Operation 3', kind: 'operation' },
];

export const PRINT_PAGES = [
  { id: 'op2', title: 'Operation 2', pageIndex: 1, sample: true },
  { id: 'op2-sub', title: 'Sub-page 1', pageIndex: 2, isSub: true },
];
