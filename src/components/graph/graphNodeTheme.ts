import type { EntityType, CadSyncStatus } from './entityTypes';

/** Theme row for one graph entity kind (compact canvas cards). */
export type GraphNodeThemeRow = {
  accent: string;
  accentSoft: string;
  typePillFg: string;
  typePillBg: string;
  typePillBorder: string;
  /** Short label in the type pill (uppercased in UI). */
  typeLabel: string;
};

/** Brand-aligned accents: tool amber, operation purple, person gray, CAD blue, document green (process / QC docs). */
export const GRAPH_NODE_THEME: Record<EntityType, GraphNodeThemeRow> = {
  document: {
    accent: '#059669',
    accentSoft: 'rgba(5, 150, 105, 0.14)',
    typePillFg: '#047857',
    typePillBg: '#ecfdf5',
    typePillBorder: 'rgba(5, 150, 105, 0.32)',
    typeLabel: 'Document',
  },
  tool: {
    accent: '#d97706',
    accentSoft: 'rgba(217, 119, 6, 0.14)',
    typePillFg: '#b45309',
    typePillBg: '#fffbeb',
    typePillBorder: 'rgba(217, 119, 6, 0.35)',
    typeLabel: 'Tools & fixtures',
  },
  operation: {
    accent: '#7c3aed',
    accentSoft: 'rgba(124, 58, 237, 0.12)',
    typePillFg: '#6d28d9',
    typePillBg: '#f5f3ff',
    typePillBorder: 'rgba(124, 58, 237, 0.28)',
    typeLabel: 'Operations / steps',
  },
  person: {
    accent: '#64748b',
    accentSoft: 'rgba(100, 116, 139, 0.14)',
    typePillFg: '#475569',
    typePillBg: '#f1f5f9',
    typePillBorder: '#e2e8f0',
    typeLabel: 'People / roles',
  },
  cad: {
    accent: '#4F6EF7',
    accentSoft: 'rgba(79, 110, 247, 0.12)',
    typePillFg: '#4338ca',
    typePillBg: '#eef2ff',
    typePillBorder: 'rgba(79, 110, 247, 0.22)',
    typeLabel: 'CAD files / parts',
  },
};

export const CAD_SYNC_LABEL: Record<CadSyncStatus, string> = {
  'in-sync': 'In sync',
  'needs-review': 'Needs review',
  'auto-updated': 'Auto-updated',
};
