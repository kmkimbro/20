import ToolGraphNodeCard from './ToolGraphNodeCard.jsx';
import OperationGraphNodeCard from './OperationGraphNodeCard.jsx';
import PersonGraphNodeCard from './PersonGraphNodeCard.jsx';
import CadGraphNodeCard from './CadGraphNodeCard.jsx';
import DocumentGraphNodeCard from './DocumentGraphNodeCard.jsx';

/**
 * Dispatches to the compact canvas card for each graph entity type.
 * Same interaction props for every variant: dimmed, highlighted, pointer handlers.
 */
export default function GraphNode({
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
  const common = {
    dimmed,
    dimmedOpacity,
    highlighted,
    connectedHighlight,
    onClick,
    onMouseEnter,
    onMouseLeave,
    style,
    className,
  };

  switch (entity.type) {
    case 'document':
      return <DocumentGraphNodeCard entity={entity} {...common} />;
    case 'tool':
      return <ToolGraphNodeCard entity={entity} {...common} />;
    case 'operation':
      return <OperationGraphNodeCard entity={entity} {...common} />;
    case 'person':
      return <PersonGraphNodeCard entity={entity} {...common} />;
    case 'cad':
      return <CadGraphNodeCard entity={entity} {...common} />;
    default:
      return null;
  }
}
