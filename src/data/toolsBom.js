/**
 * Tools Bill of Materials – in-memory data for the combined prototype.
 * DocumentState: partsCatalog (global parts), toolsBOM (global tools), operations (with parts + notes).
 */

/** @typedef {{ id: string, name: string }} Part */

/** @typedef {{ id: string, name: string }} Tool */

/** @typedef {{ partId: string, qty: number }} OperationPart */

/** @typedef {{ id: string, name: string, created: string, toolIds: string[], parts: OperationPart[], notes: string }} Operation */

/** Parts catalog for the document (all parts known). */
export const PARTS_CATALOG_INITIAL = [
  { id: 'part-screw', name: 'Screw' },
  { id: 'part-blade', name: 'Blade' },
  { id: 'part-brushless-motor', name: 'BrushlessMotor' },
];

/** Global tools list. */
export const TOOLS_BOM_INITIAL = [
  { id: 'tool-screw', name: 'screw' },
  { id: 'tool-glue', name: 'glue' },
];

/** Operations with tool refs, parts (qty), and notes. */
export const BOM_OPERATIONS_INITIAL = [
  { id: 'op-1', name: 'Operation 1', created: '2026-01-25', toolIds: [], parts: [], notes: '' },
  {
    id: 'op-2',
    name: 'Operation 2',
    created: '2026-02-16',
    toolIds: ['tool-screw', 'tool-glue'],
    parts: [
      { partId: 'part-screw', qty: 2 },
      { partId: 'part-blade', qty: 1 },
      { partId: 'part-brushless-motor', qty: 1 },
    ],
    notes: 'Use [Tool: glue] on [Part: Blade].',
  },
  { id: 'op-3', name: 'Operation 3', created: '2026-02-20', toolIds: [], parts: [], notes: '' },
  { id: 'op-4', name: 'Operation 4', created: '2026-03-01', toolIds: ['tool-screw'], parts: [], notes: '' },
  { id: 'op-5', name: 'Operation 5', created: '2026-03-10', toolIds: [], parts: [], notes: '' },
];

// Legacy exports for backward compatibility
export const TOOLS_BOM = TOOLS_BOM_INITIAL;
export const BOM_OPERATIONS = BOM_OPERATIONS_INITIAL;

/**
 * Resolve tool ids to tool names.
 * @param {string[]} toolIds
 * @param {Tool[]} toolsBom
 * @returns {string[]}
 */
export function getToolNamesForOperation(toolIds, toolsBom) {
  const byId = Object.fromEntries(toolsBom.map((t) => [t.id, t]));
  return toolIds.map((id) => byId[id]?.name ?? id).filter(Boolean);
}

/**
 * Resolve operation.parts to { name, qty } via partsCatalog.
 * @param {OperationPart[]} parts
 * @param {Part[]} partsCatalog
 * @returns {{ name: string, qty: number }[]}
 */
export function getPartNamesForOperation(parts, partsCatalog) {
  const byId = Object.fromEntries(partsCatalog.map((p) => [p.id, p]));
  return (parts || []).map((op) => ({ name: byId[op.partId]?.name ?? op.partId, qty: op.qty ?? 1 }));
}
