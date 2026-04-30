import GraphNodeCardShell, { GraphNodeTypePill } from './GraphNodeCardShell.jsx';
import { GRAPH_NODE_THEME } from './graphNodeTheme';

/**
 * Document — compact canvas graph node only.
 * For full document / PRD cards in lists, use existing document components elsewhere.
 */
export default function DocumentGraphNodeCard({
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
  const theme = GRAPH_NODE_THEME.document;
  const footer = entity.connects?.length > 0 ? (
    <span style={{ fontSize: 10, color: '#9CA3AF' }}>
      {entity.connects.length} connection{entity.connects.length === 1 ? '' : 's'}
    </span>
  ) : null;

  return (
    <GraphNodeCardShell
      className={className}
      style={style}
      entityKind="document"
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
