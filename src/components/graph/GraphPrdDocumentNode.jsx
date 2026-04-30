import { useState } from 'react';
import Des36PrdDocCard from '../../pages/des36/Des36PrdDocCard.jsx';
import { GRAPH_NODE_THEME } from './graphNodeTheme';

const accent = GRAPH_NODE_THEME.document.accent;
const accentSoft = GRAPH_NODE_THEME.document.accentSoft;

/**
 * Wraps existing {@link Des36PrdDocCard} for the connection graph canvas:
 * same dimmed / highlighted / hover-scale / pointer contract as {@link GraphNode} variants.
 */
const DEFAULT_PRD = {
  stateLabel: '—',
  lastUpdated: '—',
  accentKey: 'in_sync',
  operationCount: 1,
  cadFileLabel: '—',
};

export default function GraphPrdDocumentNode({
  entity,
  prd,
  dimmed = false,
  dimmedOpacity = 0.28,
  highlighted = false,
  connectedHighlight = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  docId,
  projectId,
  onRenameDocument,
  onCadFileLabelClick,
}) {
  const [hover, setHover] = useState(false);
  const scaled = hover && !dimmed;
  const prdSafe = prd ?? DEFAULT_PRD;

  return (
    <div
      data-graph-entity="document"
      style={{
        width: 'fit-content',
        opacity: dimmed ? dimmedOpacity : 1,
        transition: 'opacity 0.22s ease, transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        transform: scaled ? 'scale(1.04)' : 'scale(1)',
        transformOrigin: 'center center',
        borderRadius: 12,
        borderLeft: highlighted ? `4px solid ${accent}` : connectedHighlight ? `3px solid ${accent}` : '4px solid transparent',
        boxShadow: highlighted
          ? `0 0 0 3px ${accentSoft}, 0 8px 20px rgba(15, 23, 42, 0.1)`
          : connectedHighlight
            ? `0 0 0 2px ${accentSoft}`
            : scaled
              ? '0 8px 22px rgba(15, 23, 42, 0.12)'
              : 'none',
      }}
      onMouseEnter={(e) => {
        setHover(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHover(false);
        onMouseLeave?.(e);
      }}
    >
      <Des36PrdDocCard
        compact
        name={entity.label}
        subtitle={entity.subtitle}
        stateLabel={prdSafe.stateLabel}
        lastUpdated={prdSafe.lastUpdated}
        documentLastEdited={prdSafe.documentLastEdited}
        accentKey={prdSafe.accentKey}
        operationCount={prdSafe.operationCount}
        cadFileLabel={prdSafe.cadFileLabel}
        cadVersion={prdSafe.cadVersion}
        cadChangeSummary={prdSafe.cadChangeSummary}
        cadDiffAdded={prdSafe.cadDiffAdded}
        cadDiffRemoved={prdSafe.cadDiffRemoved}
        cadDiffModified={prdSafe.cadDiffModified}
        docId={docId}
        projectId={projectId}
        onRenameDocument={onRenameDocument}
        onCadFileLabelClick={onCadFileLabelClick}
        onClick={onClick}
        onHover={() => {}}
      />
    </div>
  );
}
