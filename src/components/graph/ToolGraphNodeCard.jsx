import GraphNodeCardShell, { GraphNodeTypePill } from './GraphNodeCardShell.jsx';
import { GRAPH_NODE_THEME } from './graphNodeTheme';

/** Tools & fixtures — compact graph node. */
export default function ToolGraphNodeCard({
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
  const theme = GRAPH_NODE_THEME.tool;
  const footer = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {entity.calibrationDue ? (
        <span style={{ fontSize: 10, fontWeight: 600, color: '#b45309' }} title="Calibration">
          Cal. due {entity.calibrationDue}
        </span>
      ) : null}
      {entity.connects?.length > 0 ? (
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>
          {entity.connects.length} connection{entity.connects.length === 1 ? '' : 's'}
        </span>
      ) : null}
    </div>
  );
  const hasFooter = Boolean(entity.calibrationDue) || (entity.connects?.length ?? 0) > 0;

  return (
    <GraphNodeCardShell
      className={className}
      style={style}
      entityKind="tool"
      theme={theme}
      label={entity.label}
      subtitle={entity.subtitle}
      typePill={<GraphNodeTypePill theme={theme} text={theme.typeLabel} />}
      footer={hasFooter ? footer : null}
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
