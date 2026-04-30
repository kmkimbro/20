import GraphNodeCardShell, { GraphNodeTypePill } from './GraphNodeCardShell.jsx';
import { GRAPH_NODE_THEME, CAD_SYNC_LABEL } from './graphNodeTheme';

const SYNC_STYLE = {
  'in-sync': { fg: '#047857', bg: '#ECFDF5', border: 'rgba(16, 185, 129, 0.28)' },
  'needs-review': { fg: '#B45309', bg: '#FFFBEB', border: 'rgba(245, 158, 11, 0.35)' },
  'auto-updated': { fg: '#4338ca', bg: '#EEF2FF', border: 'rgba(79, 110, 247, 0.2)' },
};

/** CAD file / part — compact graph node. */
export default function CadGraphNodeCard({
  entity,
  dimmed,
  dimmedOpacity,
  highlighted,
  connectedHighlight,
  onClick,
  onMouseEnter,
  onMouseLeave,
  style,
  className,
}) {
  const theme = GRAPH_NODE_THEME.cad;
  const sync = SYNC_STYLE[entity.syncStatus] ?? SYNC_STYLE['in-sync'];
  const footer = (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: sync.fg,
          background: sync.bg,
          border: `1px solid ${sync.border}`,
          borderRadius: 4,
          padding: '2px 6px',
        }}
      >
        {CAD_SYNC_LABEL[entity.syncStatus]}
      </span>
      {entity.version ? (
        <span style={{ fontSize: 10, fontWeight: 600, color: '#6366f1' }} title="CAD version">
          {entity.version}
        </span>
      ) : null}
      {entity.connects?.length > 0 ? (
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>
          {entity.connects.length} connection{entity.connects.length === 1 ? '' : 's'}
        </span>
      ) : null}
    </div>
  );

  return (
    <GraphNodeCardShell
      className={className}
      style={style}
      entityKind="cad"
      theme={theme}
      label={entity.label}
      subtitle={entity.subtitle}
      typePill={<GraphNodeTypePill theme={theme} text={theme.typeLabel} />}
      footer={footer}
      dimmed={dimmed}
      dimmedOpacity={dimmedOpacity}
      highlighted={highlighted}
      connectedHighlight={connectedHighlight}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
}
