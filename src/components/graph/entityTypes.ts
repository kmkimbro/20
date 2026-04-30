import type { CSSProperties, MouseEvent } from 'react';

/**
 * Entity kinds for connection graphs (within-project and future cross-project).
 * Extend here when adding new node types — GraphNode switches on `entity.type`.
 */
export const EntityType = {
  Document: 'document',
  Tool: 'tool',
  Operation: 'operation',
  Person: 'person',
  Cad: 'cad',
} as const;

export type EntityType = (typeof EntityType)[keyof typeof EntityType];

export type ConnectionEdgeRef = {
  to: string;
  reason: string;
};

/** Optional scope id for future cross-project graphs (ignored for within-project layout today). */
type GraphEntityScope = {
  projectId?: string;
};

export type ToolNode = GraphEntityScope & {
  id: string;
  type: 'tool';
  /** e.g. "Torque wrench T4" */
  label: string;
  /** e.g. "Cal. due May 2026" */
  subtitle: string;
  calibrationDue?: string;
  connects: ConnectionEdgeRef[];
};

export type OperationNode = GraphEntityScope & {
  id: string;
  type: 'operation';
  /** e.g. "Op 3 · Full weld" */
  label: string;
  /** e.g. "WI-002 step 1" */
  subtitle: string;
  parentDocId: string;
  connects: ConnectionEdgeRef[];
};

export type PersonNode = GraphEntityScope & {
  id: string;
  type: 'person';
  /** e.g. "Alice M." */
  label: string;
  /** e.g. "Weld technician" */
  subtitle: string;
  connects: ConnectionEdgeRef[];
};

export type CadSyncStatus = 'in-sync' | 'needs-review' | 'auto-updated';

export type CadNode = GraphEntityScope & {
  id: string;
  type: 'cad';
  /** e.g. "weldment_frame_v4" */
  label: string;
  /** e.g. "V31 · Auto-updated today" */
  subtitle: string;
  version: string;
  syncStatus: CadSyncStatus;
  connects: ConnectionEdgeRef[];
};

/**
 * Compact graph node for a document (not the full PRD document library card).
 * Same interaction contract as other {@link GraphNode} variants.
 */
export type DocumentNode = GraphEntityScope & {
  id: string;
  type: 'document';
  label: string;
  subtitle: string;
  connects: ConnectionEdgeRef[];
};

/** Nodes rendered by {@link GraphNode} (compact canvas cards). */
export type GraphCanvasNode = DocumentNode | ToolNode | OperationNode | PersonNode | CadNode;

/** Graph payload for within-project (and future cross-project) connection views. */
export type ProjectGraph = {
  projectId: string;
  projectName: string;
  cadFile: string;
  /** All entities in the project graph (includes documents). */
  entities: GraphCanvasNode[];
};

/** Shared interaction contract for graph nodes (matches future document graph wrapper). */
export type GraphNodeInteractionProps = {
  dimmed?: boolean;
  highlighted?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onMouseEnter?: (event: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLElement>) => void;
};

export type GraphNodeProps = GraphNodeInteractionProps & {
  entity: GraphCanvasNode;
  /** Optional: narrrow width cap on canvas */
  className?: string;
  style?: CSSProperties;
};
