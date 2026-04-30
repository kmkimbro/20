import { useState } from 'react';
import { GRAPH_CARD_SIZE } from './mockWeldFrameLayout.js';

const shellBase = {
  boxSizing: 'border-box',
  width: GRAPH_CARD_SIZE.width,
  height: GRAPH_CARD_SIZE.height,
  maxWidth: GRAPH_CARD_SIZE.width,
  borderRadius: 8,
  background: '#fff',
  padding: '8px 10px',
  textAlign: 'left',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  cursor: 'default',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

/**
 * Shared chrome for compact canvas graph nodes: dimmed / highlight / hover scale.
 */
export default function GraphNodeCardShell({
  entityKind,
  theme,
  label,
  subtitle,
  typePill,
  footer,
  dimmed = false,
  /** Opacity when dimmed (unrelated nodes during graph hover). */
  dimmedOpacity = 0.22,
  highlighted = false,
  /** Softer ring for nodes that are connected to the hovered node but not the hover target. */
  connectedHighlight = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  style,
  className,
}) {
  const [hover, setHover] = useState(false);
  const interactive = Boolean(onClick);
  /** Slight scale on hover for canvas affordance, even when there is no click handler. */
  const scaled = hover && !dimmed;

  return (
    <div
      className={className}
      data-graph-entity={entityKind}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick?.(e);
            }
          }
          : undefined
      }
      onClick={onClick}
      onMouseEnter={(e) => {
        setHover(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHover(false);
        onMouseLeave?.(e);
      }}
      style={{
        ...shellBase,
        background: highlighted ? theme.accentSoft : shellBase.background,
        opacity: dimmed ? dimmedOpacity : 1,
        transition: 'opacity 0.2s ease, transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, border-left-width 0.18s ease, border-left-color 0.18s ease, background 0.18s ease',
        transform: scaled ? 'scale(1.04)' : 'scale(1)',
        transformOrigin: 'center center',
        cursor: interactive ? 'pointer' : 'default',
        border: highlighted ? `1px solid ${theme.accent}` : '1px solid #E5E7EB',
        borderLeft: highlighted ? `4px solid ${theme.accent}` : connectedHighlight ? `3px solid ${theme.accent}` : '1px solid #E5E7EB',
        boxShadow: highlighted
          ? `0 0 0 3px ${theme.accentSoft}, 0 8px 20px rgba(15, 23, 42, 0.12)`
          : connectedHighlight
            ? `0 0 0 2px ${theme.accentSoft}`
            : scaled
              ? '0 6px 18px rgba(15, 23, 42, 0.1)'
              : '0 1px 2px rgba(15, 23, 42, 0.05)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexShrink: 0 }}>
        <span
          title={label}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#111827',
            lineHeight: 1.25,
            minWidth: 0,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {label}
        </span>
        {typePill}
      </div>
      <div
        title={subtitle}
        style={{
          flex: 1,
          minHeight: 0,
          fontSize: 10,
          fontWeight: 500,
          color: '#6B7280',
          lineHeight: 1.35,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {subtitle}
      </div>
      {footer ? <div style={{ marginTop: 'auto', flexShrink: 0, paddingTop: 6 }}>{footer}</div> : null}
    </div>
  );
}

export function GraphNodeTypePill({ theme, text }) {
  return (
    <span
      title={text}
      style={{
        flexShrink: 0,
        maxWidth: 92,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: theme.typePillFg,
        background: theme.typePillBg,
        border: `1px solid ${theme.typePillBorder}`,
        borderRadius: 4,
        padding: '2px 6px',
        lineHeight: 1.2,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
}
