/**
 * Document tree: operations (numbered 1, 2, 3...), each with parts, subpages, and nested suboperations (1.1, 1.1.1...).
 * Operations and suboperations are not deleteable (tied to CAD). Subpages can be added/moved/deleted.
 */

let nextSubPageSeq = 1;

export function createOperation(id, number, label, parts = [], subPages = [], suboperations = [], toolIds = []) {
  return { id, number, label, parts, toolIds, subPages, suboperations };
}

export function createSuboperation(id, number, label, parts = [], subPages = [], suboperations = [], toolIds = []) {
  return { id, number, label, parts, toolIds, subPages, suboperations };
}

export function createPart(id, name) {
  return { id, name };
}

export function createSubPage(id, label) {
  return { id, label };
}

/** Top-level operation id: op1, or merged megadoc m0-op1, m1-op2, … */
export function isTopLevelOperationId(id) {
  return /^(?:m\d+-)?op\d+$/.test(id);
}

/** Deep-clone operation tree with a string prefix on every operation, part, and subpage id. */
export function cloneOperationsWithIdPrefix(operations, prefix) {
  const mapOp = (node) => ({
    ...node,
    id: prefix + node.id,
    parts: (node.parts || []).map((p) => ({ ...p, id: prefix + p.id })),
    subPages: (node.subPages || []).map((s) => ({ ...s, id: prefix + s.id })),
    suboperations: (node.suboperations || []).map(mapOp),
    toolIds: [...(node.toolIds || [])],
  });
  return operations.map(mapOp);
}

/** Parse activePageId: ownerId (op1 or op1.1), and whether it's a subpage. Subpage ids: op1-1, op1.1-1 */
export function getPageContext(pageId) {
  if (!pageId) return { ownerId: null, isSubPage: false, isTopLevelOp: false };
  const subPageMatch = pageId.match(/^(.+)-(\d+)$/);
  if (subPageMatch) {
    const ownerId = subPageMatch[1];
    const isTopLevelOp = isTopLevelOperationId(ownerId);
    return { ownerId, isSubPage: true, isTopLevelOp };
  }
  const isTopLevelOp = isTopLevelOperationId(pageId);
  return { ownerId: pageId, isSubPage: false, isTopLevelOp };
}

/** Find operation or suboperation by id (op1, op1.1, op1.1.1) */
export function findNode(operations, nodeId) {
  for (const op of operations) {
    if (op.id === nodeId) return { node: op, parent: null, parentList: operations, index: operations.findIndex((o) => o.id === nodeId) };
    const found = findNodeInSuboperations(op.suboperations, nodeId, op);
    if (found) return found;
  }
  return null;
}

function findNodeInSuboperations(subops, nodeId, parentOp) {
  if (!subops) return null;
  for (let i = 0; i < subops.length; i++) {
    const sub = subops[i];
    if (sub.id === nodeId) return { node: sub, parent: parentOp, parentList: subops, index: i };
    const found = findNodeInSuboperations(sub.suboperations, nodeId, sub);
    if (found) return found;
  }
  return null;
}

/** Get owner node (operation or suboperation) for a page id (op1, op1.1, or from subpage op1-1 -> op1) */
export function getOwnerNode(operations, pageId) {
  const { ownerId } = getPageContext(pageId);
  if (!ownerId) return null;
  const found = findNode(operations, ownerId);
  return found ? found.node : null;
}

/** Get the top-level operation id for a page (op1, op2, op3) so CAD view can highlight the right card. */
export function getTopLevelOperationId(operations, pageId) {
  const { ownerId } = getPageContext(pageId);
  if (!ownerId) return null;
  let id = ownerId;
  for (;;) {
    const found = findNode(operations, id);
    if (!found) return null;
    if (!found.parent) return found.node.id;
    id = found.parent.id;
  }
}

/** Add subpage to owner (operation or suboperation); append at end. Returns { operations, newSubPageId }. */
export function addSubPageToOwner(operations, ownerId) {
  const found = findNode(operations, ownerId);
  if (!found) return { operations, newSubPageId: null };
  const { node } = found;
  const id = `${ownerId}-${nextSubPageSeq++}`;
  const newSubPage = { id, label: 'Section' };
  const newOps = updateNode(operations, ownerId, (nd) => ({
    ...nd,
    subPages: [...(nd.subPages || []), newSubPage],
  }));
  return { operations: newOps, newSubPageId: id };
}

/** Immutable update a node by id */
function updateNode(operations, nodeId, updater) {
  return operations.map((op) => {
    if (op.id === nodeId) return updater(op);
    if (op.suboperations?.length) {
      return { ...op, suboperations: updateNodeInSuboperations(op.suboperations, nodeId, updater) };
    }
    return op;
  });
}

function updateNodeInSuboperations(subops, nodeId, updater) {
  return subops.map((sub) => {
    if (sub.id === nodeId) return updater(sub);
    if (sub.suboperations?.length) {
      return { ...sub, suboperations: updateNodeInSuboperations(sub.suboperations, nodeId, updater) };
    }
    return sub;
  });
}

/** Add a part to an operation/suboperation by id. Returns new operations array. Allows duplicates (same part name multiple times). */
export function addPartToOperation(operations, nodeId, part) {
  return operations.map((op) => {
    if (op.id === nodeId) {
      const parts = op.parts || [];
      return { ...op, parts: [...parts, part] };
    }
    if (op.suboperations?.length) {
      return { ...op, suboperations: addPartToOperation(op.suboperations, nodeId, part) };
    }
    return op;
  });
}

/** Remove a part row from an operation/suboperation by part id. Does not affect parts catalog. */
export function removePartFromOperation(operations, nodeId, partId) {
  return operations.map((op) => {
    if (op.id === nodeId) {
      const parts = (op.parts || []).filter((p) => p.id !== partId);
      return { ...op, parts };
    }
    if (op.suboperations?.length) {
      return { ...op, suboperations: removePartFromOperation(op.suboperations, nodeId, partId) };
    }
    return op;
  });
}

/** Rename one part row on an operation/suboperation (by part id). */
export function renamePartInOperation(operations, nodeId, partId, newName) {
  const name = (newName ?? '').toString().trim();
  if (!partId || !name) return operations;
  return operations.map((op) => {
    if (op.id === nodeId) {
      const parts = (op.parts || []).map((p) => (p.id === partId ? { ...p, name } : p));
      return { ...op, parts };
    }
    if (op.suboperations?.length) {
      return { ...op, suboperations: renamePartInOperation(op.suboperations, nodeId, partId, name) };
    }
    return op;
  });
}

/** Replace one part row with a new part (by old part id). */
export function replacePartInOperation(operations, nodeId, oldPartId, newPart) {
  if (!oldPartId || !newPart?.name) return operations;
  const name = (newPart.name ?? '').toString().trim();
  if (!name) return operations;
  return operations.map((op) => {
    if (op.id === nodeId) {
      const parts = (op.parts || []).map((p) => (p.id === oldPartId ? { ...newPart, name } : p));
      return { ...op, parts };
    }
    if (op.suboperations?.length) {
      return { ...op, suboperations: replacePartInOperation(op.suboperations, nodeId, oldPartId, newPart) };
    }
    return op;
  });
}

/** Add tool id to an operation/suboperation’s toolIds Allows same tool multiple times (multiple rows). */
export function addToolIdToOperation(operations, nodeId, toolId) {
  if (!toolId) return operations;
  return operations.map((op) => {
    if (op.id === nodeId) {
      const toolIds = op.toolIds || [];
      return { ...op, toolIds: [...toolIds, toolId] };
    }
    if (op.suboperations?.length) {
      return { ...op, suboperations: addToolIdToOperation(op.suboperations, nodeId, toolId) };
    }
    return op;
  });
}

/** Remove one tool id occurrence from operation (table row). Global tools list unchanged. */
export function removeToolIdFromOperation(operations, nodeId, toolId) {
  if (!toolId) return operations;
  return operations.map((op) => {
    if (op.id === nodeId) {
      const toolIds = op.toolIds || [];
      const idx = toolIds.indexOf(toolId);
      if (idx < 0) return op;
      const next = [...toolIds];
      next.splice(idx, 1);
      return { ...op, toolIds: next };
    }
    if (op.suboperations?.length) {
      return { ...op, suboperations: removeToolIdFromOperation(op.suboperations, nodeId, toolId) };
    }
    return op;
  });
}

/** Replace one tool id with another in an operation (same position). */
export function replaceToolIdInOperation(operations, nodeId, oldToolId, newToolId) {
  if (!oldToolId || !newToolId) return operations;
  return operations.map((op) => {
    if (op.id === nodeId) {
      const toolIds = (op.toolIds || []).map((id) => (id === oldToolId ? newToolId : id));
      return { ...op, toolIds };
    }
    if (op.suboperations?.length) {
      return { ...op, suboperations: replaceToolIdInOperation(op.suboperations, nodeId, oldToolId, newToolId) };
    }
    return op;
  });
}

/** Reorder parts array within an operation by moving fromIdx to toIdx. */
export function reorderPartsInOperation(operations, nodeId, fromIdx, toIdx) {
  if (fromIdx === toIdx) return operations;
  return operations.map((op) => {
    if (op.id === nodeId) {
      const parts = [...(op.parts || [])];
      const [item] = parts.splice(fromIdx, 1);
      parts.splice(toIdx, 0, item);
      return { ...op, parts };
    }
    if (op.suboperations?.length) {
      return { ...op, suboperations: reorderPartsInOperation(op.suboperations, nodeId, fromIdx, toIdx) };
    }
    return op;
  });
}

/** Reorder toolIds array within an operation by moving fromIdx to toIdx. */
export function reorderToolIdsInOperation(operations, nodeId, fromIdx, toIdx) {
  if (fromIdx === toIdx) return operations;
  return operations.map((op) => {
    if (op.id === nodeId) {
      const toolIds = [...(op.toolIds || [])];
      const [item] = toolIds.splice(fromIdx, 1);
      toolIds.splice(toIdx, 0, item);
      return { ...op, toolIds };
    }
    if (op.suboperations?.length) {
      return { ...op, suboperations: reorderToolIdsInOperation(op.suboperations, nodeId, fromIdx, toIdx) };
    }
    return op;
  });
}

/** Remove subpage from owner. Returns { operations, newActivePageId } */
export function removeSubPage(operations, ownerId, subPageId) {
  const found = findNode(operations, ownerId);
  if (!found) return { operations, newActivePageId: null };
  const { node } = found;
  const subPages = (node.subPages || []).filter((s) => s.id !== subPageId);
  const idx = (node.subPages || []).findIndex((s) => s.id === subPageId);
  const newActiveId = subPages[idx]?.id ?? subPages[idx - 1]?.id ?? ownerId;
  const newOps = updateNode(operations, ownerId, () => ({ ...node, subPages }));
  return { operations: newOps, newActivePageId: newActiveId };
}

/** Reorder subpages within owner: move subPageId up or down */
export function reorderSubPages(operations, ownerId, subPageId, direction) {
  const found = findNode(operations, ownerId);
  if (!found) return operations;
  const { node } = found;
  const subPages = [...(node.subPages || [])];
  const idx = subPages.findIndex((s) => s.id === subPageId);
  if (idx < 0) return operations;
  if (direction === 'up' && idx <= 0) return operations;
  if (direction === 'down' && idx >= subPages.length - 1) return operations;
  const swap = direction === 'up' ? idx - 1 : idx + 1;
  [subPages[idx], subPages[swap]] = [subPages[swap], subPages[idx]];
  return updateNode(operations, ownerId, () => ({ ...node, subPages }));
}

/** Reorder suboperations within parent (operation or suboperation) */
export function reorderSuboperations(operations, parentId, subOpId, direction) {
  const parentFound = findNode(operations, parentId);
  if (!parentFound) return operations;
  const { node: parent } = parentFound;
  const list = parent.suboperations || [];
  const idx = list.findIndex((s) => s.id === subOpId);
  if (idx < 0) return operations;
  if (direction === 'up' && idx <= 0) return operations;
  if (direction === 'down' && idx >= list.length - 1) return operations;
  const subops = [...list];
  const swap = direction === 'up' ? idx - 1 : idx + 1;
  [subops[idx], subops[swap]] = [subops[swap], subops[idx]];
  return updateNode(operations, parentId, () => ({ ...parent, suboperations: subops }));
}

/** Reorder top-level operations */
export function reorderOperations(operations, opId, direction) {
  const idx = operations.findIndex((o) => o.id === opId);
  if (idx < 0) return operations;
  if (direction === 'up' && idx <= 0) return operations;
  if (direction === 'down' && idx >= operations.length - 1) return operations;
  const next = [...operations];
  const swap = direction === 'up' ? idx - 1 : idx + 1;
  [next[idx], next[swap]] = [next[swap], next[idx]];
  return next;
}

/** Add a new top-level operation (step). Returns new operations array. */
export function addOperation(operations, label = 'New step') {
  const nextNum = operations.length + 1;
  const id = `op${nextNum}`;
  const newOp = createOperation(id, nextNum, label, [], [], []);
  return [...operations, newOp];
}

/** Build flat list of pages for canvas: each operation/suboperation main page + its subpages, depth-first */
export function buildPageList(operations) {
  const pages = [];
  function walk(ops) {
    for (const op of ops) {
      const title = typeof op.number === 'number' ? `${op.number} ${op.label}` : `${op.number} ${op.label}`;
      pages.push({ id: op.id, title, isSubPage: false, parts: op.parts });
      for (const sub of op.subPages || []) {
        pages.push({ id: sub.id, title: sub.label, isSubPage: true, parts: null });
      }
      if (op.suboperations?.length) walk(op.suboperations);
    }
  }
  walk(operations);
  return pages;
}

/** Check if pageId is a subpage (deletable). Subpage ids: op1-1, op1.1-1, m0-op1-1, … */
export function isSubPageId(pageId) {
  return /^(?:m\d+-)?op[\d.]+-\d+$/.test(pageId);
}

/** Return list of operations/suboperations that reference this tool. Each item is { id, label }. */
export function getOperationsUsingTool(operations, toolId) {
  const out = [];
  function walk(ops) {
    for (const op of ops) {
      if ((op.toolIds || []).includes(toolId)) {
        const label = op.number != null && op.label != null ? `${op.number} ${op.label}` : (op.label || op.id);
        out.push({ id: op.id, label });
      }
      if (op.suboperations?.length) walk(op.suboperations);
    }
  }
  walk(operations);
  return out;
}

/** Remove toolId from every node's toolIds. Returns new operations array. */
export function removeToolFromOperations(operations, toolId) {
  function mapNode(node) {
    const toolIds = (node.toolIds || []).filter((id) => id !== toolId);
    const next = { ...node, toolIds };
    if (node.suboperations?.length) {
      next.suboperations = node.suboperations.map(mapNode);
    }
    return next;
  }
  return operations.map(mapNode);
}
