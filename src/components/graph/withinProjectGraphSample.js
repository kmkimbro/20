/** Demo entities for within-project graph previews (replace with live project data later). */

/** @type {import('./entityTypes.ts').GraphCanvasNode[]} */
export const WITHIN_PROJECT_GRAPH_SAMPLE_NODES = [
  {
    id: 'doc-wi-002',
    type: 'document',
    label: 'WI-002 — Install',
    subtitle: 'Released · Issue 3',
    connects: [{ to: 'op-1', reason: 'Contains step' }],
  },
  {
    id: 'tool-1',
    type: 'tool',
    label: 'Torque wrench T4',
    subtitle: 'Cal. due May 2026',
    calibrationDue: '2026-05-01',
    connects: [{ to: 'op-1', reason: 'Used in step' }],
  },
  {
    id: 'op-1',
    type: 'operation',
    label: 'Op 3 · Full weld',
    subtitle: 'WI-002 step 1',
    parentDocId: 'doc-wi-002',
    connects: [
      { to: 'cad-1', reason: 'Geometry ref' },
      { to: 'person-1', reason: 'Owner' },
      { to: 'tool-1', reason: 'Uses tool' },
    ],
  },
  {
    id: 'person-1',
    type: 'person',
    label: 'Alice M.',
    subtitle: 'Weld technician',
    connects: [{ to: 'op-1', reason: 'Performs' }],
  },
  {
    id: 'cad-1',
    type: 'cad',
    label: 'weldment_frame_v4',
    subtitle: 'V31 · Auto-updated today',
    version: 'V31',
    syncStatus: 'auto-updated',
    connects: [{ to: 'op-1', reason: 'Consumed by' }],
  },
];
