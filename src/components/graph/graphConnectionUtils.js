/** @param {string} hoverId */
export function buildNeighborIds(hoverId, entities) {
  if (!hoverId || !entities?.length) return new Set();
  const out = new Set([hoverId]);
  const hoverEntity = entities.find((e) => e.id === hoverId);
  if (hoverEntity?.connects) {
    for (const c of hoverEntity.connects) out.add(c.to);
  }
  for (const n of entities) {
    if (!n.connects) continue;
    for (const c of n.connects) {
      if (c.to === hoverId) out.add(n.id);
    }
  }
  return out;
}

export function entityByIdMap(entities) {
  return new Map((entities || []).map((e) => [e.id, e]));
}

/** Outgoing + incoming edges for detail panel. */
export function listConnectionRows(entityId, entities) {
  const byId = entityByIdMap(entities);
  const self = byId.get(entityId);
  if (!self) return [];
  const rows = [];
  for (const c of self.connects || []) {
    const t = byId.get(c.to);
    rows.push({
      key: `out-${c.to}-${c.reason}`,
      direction: 'To',
      name: t?.label ?? c.to,
      type: t?.type,
      reason: c.reason,
    });
  }
  for (const n of entities) {
    if (n.id === entityId) continue;
    for (const c of n.connects || []) {
      if (c.to === entityId) {
        rows.push({
          key: `in-${n.id}-${c.reason}`,
          direction: 'From',
          name: n.label,
          type: n.type,
          reason: c.reason,
        });
      }
    }
  }
  return rows;
}
