import GraphNodeCardShell, { GraphNodeTypePill } from './GraphNodeCardShell.jsx';
import { GRAPH_NODE_THEME } from './graphNodeTheme';

/** Operation / step — compact graph node. */
export default function OperationGraphNodeCard({
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
  const theme = GRAPH_NODE_THEME.operation;
  const footer = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: '#94a3b8',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title="Parent document id"
      >
        Doc · {entity.parentDocId}
      </span>
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
      entityKind="operation"
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
