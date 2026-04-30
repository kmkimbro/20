/** Document categories for Parts network + list grouping (brand-aligned). */
export const DOC_TYPE_ORDER = ['prd', 'checklist', 'study', 'plan', 'qc', 'other'];

export const DOC_TYPE_META = {
  prd: { label: 'PRD', color: '#4F6EF7', pillBg: '#EEF2FF', pillBorder: 'rgba(79, 110, 247, 0.2)' },
  checklist: { label: 'Checklist', color: '#0d9488', pillBg: '#ecfdf5', pillBorder: 'rgba(13, 148, 136, 0.25)' },
  study: { label: 'Study', color: '#d97706', pillBg: '#fffbeb', pillBorder: 'rgba(217, 119, 6, 0.25)' },
  plan: { label: 'Plan', color: '#7c3aed', pillBg: '#f5f3ff', pillBorder: 'rgba(124, 58, 237, 0.2)' },
  qc: { label: 'QC', color: '#db2777', pillBg: '#fdf2f8', pillBorder: 'rgba(219, 39, 119, 0.2)' },
  other: { label: 'Document', color: '#64748b', pillBg: '#f1f5f9', pillBorder: '#e2e8f0' },
};

/** Sync / workflow status (aligned with PRD card language). */
export const STATUS_META = {
  in_sync: { label: 'In sync', fg: '#047857', bg: '#ECFDF5', border: 'rgba(16, 185, 129, 0.28)' },
  auto_updated: { label: 'Auto-updated', fg: '#4F6EF7', bg: '#EEF2FF', border: 'rgba(79, 110, 247, 0.14)' },
  draft: { label: 'Draft', fg: '#57534e', bg: '#f5f5f4', border: '#e7e5e4' },
  no_cad: { label: 'No CAD linked', fg: '#B45309', bg: '#FFFBEB', border: 'rgba(245, 158, 11, 0.35)' },
};

export function docTypeLabel(key) {
  return DOC_TYPE_META[key]?.label ?? DOC_TYPE_META.other.label;
}

export function statusLabel(key) {
  return STATUS_META[key]?.label ?? '—';
}
