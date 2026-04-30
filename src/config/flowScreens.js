/**
 * Flow configs with layout positions and connections (arrows + action labels).
 * Layout: col 0-3, row 0-2. Connections show "click this → go here".
 */

/** Screenshot flow: DES 53, DES 53 V2, Production */
export const SCREENSHOT_FLOW = {
  screens: [
    {
      id: 'document',
      label: 'Document view',
      col: 1,
      row: 0,
      anchors: {
        'place-image': { x: 0.24, y: 0.15 },
        'cad-nav':     { x: 0.15, y: 0.15 },
        'canvas':      { x: 0.65, y: 0.65 },
      },
    },
    {
      id: 'image-selected',
      label: 'Image selected',
      col: 2,
      row: 0,
      anchors: {
        'replace': { x: 0.86, y: 0.38 },
        'retake':  { x: 0.86, y: 0.52 },
        '3d-view': { x: 0.20, y: 0.72 },
      },
    },
    {
      id: 'screenshot-modal',
      label: 'Screenshot modal',
      col: 0,
      row: 1,
      anchors: {
        'pick': { x: 0.50, y: 0.65 },
      },
    },
    {
      id: 'cad-view',
      label: 'CAD view & capture',
      col: 2,
      row: 1,
      anchors: {
        'screenshot-btn': { x: 0.72, y: 0.88 },
        'viewer':         { x: 0.63, y: 0.50 },
      },
    },
  ],
  connections: [
    { from: 'document',          fromAnchor: 'place-image',    to: 'screenshot-modal', toAnchor: 'pick',           action: 'Place image'  },
    { from: 'document',          fromAnchor: 'cad-nav',        to: 'cad-view',         toAnchor: 'viewer',         action: 'CAD View'     },
    { from: 'document',          fromAnchor: 'canvas',         to: 'image-selected',                               action: 'Select image' },
    { from: 'image-selected',    fromAnchor: 'replace',        to: 'screenshot-modal', toAnchor: 'pick',           action: 'Replace'      },
    { from: 'image-selected',    fromAnchor: 'retake',         to: 'cad-view',         toAnchor: 'viewer',         action: 'Retake'       },
    { from: 'image-selected',    fromAnchor: '3d-view',        to: 'cad-view',         toAnchor: 'viewer',         action: '3D view'      },
    { from: 'screenshot-modal',  fromAnchor: 'pick',           to: 'document',         toAnchor: 'canvas',         action: 'Pick & place' },
    { from: 'cad-view',          fromAnchor: 'screenshot-btn', to: 'document',         toAnchor: 'canvas',         action: 'Capture'      },
  ],
};

/** Document flow: DES 49&50 */
export const DOCUMENT_FLOW = {
  screens: [
    {
      id: 'document-tree',
      label: 'Outline view',
      col: 0,
      row: 0,
      anchors: {
        'outline-tab': { x: 0.23, y: 0.28 },
        'page-tab':    { x: 0.65, y: 0.28 },
        'add-subpage': { x: 0.50, y: 0.65 },
      },
    },
    {
      id: 'document-pages',
      label: 'Page thumbnails',
      col: 1,
      row: 0,
      anchors: {
        'outline-tab': { x: 0.23, y: 0.28 },
      },
    },
    {
      id: 'page-actions',
      label: 'Page actions',
      col: 0,
      row: 1,
      anchors: {
        'add-page': { x: 0.94, y: 0.35 },
        'canvas':   { x: 0.60, y: 0.60 },
      },
    },
    {
      id: 'image-two-buttons',
      label: 'Image (Remove + Replace)',
      col: 1,
      row: 1,
      anchors: {
        'remove':  { x: 0.82, y: 0.38 },
        'replace': { x: 0.91, y: 0.38 },
      },
    },
    {
      id: 'screenshot-modal',
      label: 'Screenshot modal',
      col: 2,
      row: 1,
      anchors: {
        'pick': { x: 0.50, y: 0.65 },
      },
    },
  ],
  connections: [
    { from: 'document-tree',     fromAnchor: 'page-tab',    to: 'document-pages',   toAnchor: 'outline-tab', action: 'Page view tab' },
    { from: 'document-pages',    fromAnchor: 'outline-tab', to: 'document-tree',    toAnchor: 'page-tab',    action: 'Outline tab'   },
    { from: 'document-tree',     fromAnchor: 'add-subpage', to: 'page-actions',     toAnchor: 'add-page',    action: 'Add sub-page'  },
    { from: 'page-actions',      fromAnchor: 'canvas',      to: 'image-two-buttons',                         action: 'Select image'  },
    { from: 'image-two-buttons', fromAnchor: 'replace',     to: 'screenshot-modal', toAnchor: 'pick',        action: 'Replace'       },
    { from: 'image-two-buttons', fromAnchor: 'remove',      to: 'document-tree',                             action: 'Remove'        },
    { from: 'screenshot-modal',  fromAnchor: 'pick',        to: 'document-tree',                             action: 'Pick & place'  },
  ],
};

/** Get flow for a concept. Returns { screens, connections }. */
export function getFlowForConcept(conceptId) {
  if (conceptId === 'image-two-buttons') {
    return DOCUMENT_FLOW;
  }
  return SCREENSHOT_FLOW;
}
