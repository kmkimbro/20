import { hasRichTextContent } from './procedureRichText.js';

export const DEFAULT_PROCEDURE_STORAGE_KEY = 'des57_procedures_v1';

const EDITOR_PROCEDURE_STORAGE_KEYS = {
  'des-57-procedures-v1-editor': DEFAULT_PROCEDURE_STORAGE_KEY,
};

export function resolveProcedureStorageKey({ queryKey, conceptId } = {}) {
  if (queryKey) return queryKey;
  return EDITOR_PROCEDURE_STORAGE_KEYS[conceptId] || null;
}

export function loadProcedureState(storageKey = DEFAULT_PROCEDURE_STORAGE_KEY) {
  try {
    const raw = localStorage.getItem(storageKey);
    const state = raw ? JSON.parse(raw) : {};
    return state && typeof state === 'object' ? state : {};
  } catch {
    return {};
  }
}

export function saveProcedureState(updater, storageKey = DEFAULT_PROCEDURE_STORAGE_KEY) {
  const prev = loadProcedureState(storageKey);
  const next = typeof updater === 'function' ? updater(prev) : updater;
  localStorage.setItem(storageKey, JSON.stringify(next || {}));
  return next || {};
}

export function procedureListFromState(state) {
  return Array.isArray(state?.procedures) ? state.procedures : [];
}

export function normalizeProcedureName(name, fallback = 'Untitled procedure') {
  const trimmed = (name ?? '').toString().trim();
  return trimmed || fallback;
}

export function countProcedureUses(state, procedureName) {
  const key = normalizeProcedureName(procedureName).toLowerCase();
  const refsByDoc = state?.procedureReferencesByDoc || {};
  let total = 0;
  Object.values(refsByDoc).forEach((refs) => {
    Object.entries(refs || {}).forEach(([name, count]) => {
      if (name.toLowerCase() === key) total += Number(count) || 0;
    });
  });
  return total;
}

export function deleteProcedureFromState(state, procedure) {
  const targetId = procedure?.id;
  const targetName = normalizeProcedureName(procedure?.name).toLowerCase();
  const procedures = procedureListFromState(state).filter((p) => {
    if (targetId && p.id) return p.id !== targetId;
    return normalizeProcedureName(p.name).toLowerCase() !== targetName;
  });
  const refsByDoc = { ...(state?.procedureReferencesByDoc || {}) };
  Object.keys(refsByDoc).forEach((docName) => {
    const refs = { ...(refsByDoc[docName] || {}) };
    Object.keys(refs).forEach((name) => {
      if (normalizeProcedureName(name).toLowerCase() === targetName) {
        delete refs[name];
      }
    });
    refsByDoc[docName] = refs;
  });
  return { ...state, procedures, procedureReferencesByDoc: refsByDoc };
}

export function upsertProcedureInState(state, { name, text, previousName, id }) {
  const procedureName = normalizeProcedureName(name);
  if (!hasRichTextContent(text)) return state;
  const procedureText = (text ?? '').toString();

  const prev = procedureListFromState(state);
  const previousNameNormalized = previousName ? normalizeProcedureName(previousName) : null;
  const existing = prev.find((p) => {
    if (id && p.id) return p.id === id;
    if (previousNameNormalized && normalizeProcedureName(p.name).toLowerCase() === previousNameNormalized.toLowerCase()) {
      return true;
    }
    return normalizeProcedureName(p.name).toLowerCase() === procedureName.toLowerCase();
  });

  const nextProcedure = {
    ...(existing || { id: id || `proc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }),
    name: procedureName,
    text: procedureText,
    updatedAt: new Date().toISOString(),
  };
  const nextProcedures = existing
    ? prev.map((p) => (p.id === existing.id ? nextProcedure : p))
    : [...prev, nextProcedure];

  let refsByDoc = { ...(state?.procedureReferencesByDoc || {}) };
  if (previousNameNormalized && previousNameNormalized.toLowerCase() !== procedureName.toLowerCase()) {
    refsByDoc = Object.fromEntries(Object.entries(refsByDoc).map(([docName, refs]) => {
      const nextRefs = { ...(refs || {}) };
      const oldKey = Object.keys(nextRefs).find(
        (key) => normalizeProcedureName(key).toLowerCase() === previousNameNormalized.toLowerCase(),
      );
      if (oldKey !== undefined) {
        const count = nextRefs[oldKey];
        delete nextRefs[oldKey];
        nextRefs[procedureName] = (nextRefs[procedureName] || 0) + (Number(count) || 0);
      }
      return [docName, nextRefs];
    }));
  }

  return { ...state, procedures: nextProcedures, procedureReferencesByDoc: refsByDoc };
}
