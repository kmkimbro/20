import { INITIAL_OPERATIONS } from '../config/sampleData.js';
import { cloneOperationsWithIdPrefix } from './docTree.js';

const MEGA_STORAGE_KEYS = ['des36_state', 'megadocument_des36'];

/**
 * Resolve display titles for merged source document ids from persisted project state.
 */
export function resolveMegaSourceDocTitles(sourceDocIds) {
  const fallback = (i) => `Test Document ${i + 1}`;
  if (!sourceDocIds?.length) return [];

  const tryResolveFromState = (state) => {
    const pd = state?.projectDocs || {};
    return sourceDocIds.map((sid) => {
      for (const pid of Object.keys(pd)) {
        const list = pd[pid] || [];
        const doc = list.find((d) => d.id === sid);
        if (doc?.name) return doc.name;
      }
      return null;
    });
  };

  for (const key of MEGA_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const state = JSON.parse(raw);
      const names = tryResolveFromState(state);
      if (names.some(Boolean)) {
        return names.map((n, i) => (n && String(n).trim()) || fallback(i));
      }
    } catch {
      /* ignore */
    }
  }

  return sourceDocIds.map((_, i) => fallback(i));
}

/**
 * Build one flat operations array (for canvas/CAD) and sidebar section metadata
 * for a megadocument opened with ?megaOf=id1,id2,...
 */
export function buildStackedMegaOperations(sourceDocIds) {
  const titles = resolveMegaSourceDocTitles(sourceDocIds);
  const chunks = sourceDocIds.map((_, i) =>
    cloneOperationsWithIdPrefix(JSON.parse(JSON.stringify(INITIAL_OPERATIONS)), `m${i}-`),
  );
  const operations = chunks.flat();
  const megaSections = titles.map((title, i) => ({
    title,
    prefix: `m${i}-`,
    operations: chunks[i],
  }));
  return { operations, megaSections };
}

export function parseMegaOfParam(raw) {
  if (!raw) return null;
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.length >= 2 ? ids : null;
}

export function parseMegaOfSourceIds(searchParams) {
  return parseMegaOfParam(searchParams?.get?.('megaOf'));
}
