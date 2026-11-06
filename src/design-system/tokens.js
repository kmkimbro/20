/**
 * Quarter20 prototype design tokens for JS (inline styles, canvas, charts).
 * Mirrors tokens.css; keep the two in sync.
 *
 *   import { color, space } from '../design-system';
 *   <div style={{ color: color.textMuted, padding: space[4] }} />
 */

export const color = {
  primary: '#4F6EF7',
  primaryHover: '#3E5BE0',
  primaryDeep: '#223EB5',
  primarySubtle: '#EEF1FE',
  primaryBorder: '#C7D2FE',
  nav: '#5884E7',

  text: '#111827',
  textSecondary: '#374151',
  textLead: '#4B5563',
  textMuted: '#6B7280',
  textSubtle: '#9CA3AF',
  textInverse: '#FFFFFF',

  surface: '#FFFFFF',
  surfaceSubtle: '#F9FAFB',
  surfaceHover: '#F3F4F6',
  page: '#F0F2F7',
  overlay: 'rgba(17, 24, 39, 0.45)',

  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  danger: '#DC2626',
  dangerSubtle: '#FEF2F2',
  dangerBorder: '#FECACA',
  success: '#047857',
  successSubtle: '#ECFDF5',
  warning: '#92400E',
  warningSubtle: '#FEF3C7',
  warningBorder: '#FDE68A',
};

export const font = {
  family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  size: { '2xs': 11, xs: 12, sm: 13, md: 14, lg: 16, xl: 18, '2xl': 22 },
  weight: { regular: 400, medium: 500, semibold: 600, strong: 650, bold: 700 },
  lineHeight: { tight: 1.2, normal: 1.45 },
  letterSpacing: { title: '-0.02em', eyebrow: '0.04em' },
};

/** Text styles that recur across the prototypes. */
export const text = {
  pageTitle: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' },
  modalTitle: { fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' },
  sectionTitle: { fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' },
  body: { fontSize: 14, fontWeight: 400, lineHeight: 1.45 },
  ui: { fontSize: 13, fontWeight: 600 },
  caption: { fontSize: 12, fontWeight: 400, color: color.textMuted },
  eyebrow: {
    fontSize: 12, fontWeight: 650, letterSpacing: '0.04em', textTransform: 'uppercase', color: color.textMuted,
  },
};

export const space = {
  1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12, 3.5: 14, 4: 16, 4.5: 18, 5: 20, 5.5: 22, 6: 24, 8: 32,
};

export const radius = {
  xs: 4, sm: 6, md: 8, lg: 10, xl: 12, pill: 999,
};

export const shadow = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
  card: '0 1px 4px rgba(15, 23, 42, 0.06)',
  popover: '0 4px 12px rgba(0, 0, 0, 0.15)',
  modal: '0 20px 50px rgba(15, 23, 42, 0.16)',
  focusRing: '0 0 0 3px rgba(79, 110, 247, 0.15)',
};

export const layout = {
  topnavHeight: 52,
  toolbarHeight: 48,
  sidebarWidth: 240,
  modalWidth: { sm: 480, md: 640, lg: 720 },
  zOverlay: 80,
};

const tokens = { color, font, text, space, radius, shadow, layout };
export default tokens;
