/**
 * Derive flat table rows from {@link PART_ASSEMBLY_CATALOG} trees for the Parts Library table.
 */

function guessCadFile(partLabel, docNode) {
  const hint = (docNode.hint || '').toLowerCase();
  if (hint.includes('step')) return `${String(partLabel).replace(/\s+/g, '_')}.step`;
  if (hint.includes('iges')) return `${String(partLabel).replace(/\s+/g, '_')}.iges`;
  const base = String(partLabel || 'part')
    .replace(/\s*\(ASM\)\s*$/i, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
  return `${base || 'component'}.stp`;
}

/** @param {{ id: string, name: string, tree: object }} assembly */
export function partLibraryRowsFromAssembly(assembly) {
  if (!assembly?.tree) return [];
  const root = assembly.tree;
  const rows = [];

  function visit(node, parentStructuralLabel) {
    if (node.type === 'document' && node.docName) {
      const partLabel = parentStructuralLabel || assembly.name;
      rows.push({
        id: `${assembly.id}:${node.id}`,
        partLabel,
        cadFile: guessCadFile(partLabel, node),
        treeDocNames: [node.docName],
      });
      return;
    }
    for (const child of node.children || []) {
      const nextParent = node.id === root.id
        ? (child.type === 'document' ? assembly.name : child.label)
        : node.label;
      visit(child, nextParent);
    }
  }

  visit(root, assembly.name);

  const merged = new Map();
  for (const r of rows) {
    const key = `${r.partLabel}\0${r.cadFile}`;
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { ...r, treeDocNames: [...r.treeDocNames] });
    } else {
      const set = new Set([...prev.treeDocNames, ...r.treeDocNames]);
      prev.treeDocNames = [...set];
    }
  }
  return [...merged.values()];
}

/** @param {Array<{ id: string, name: string, tree: object }>} catalog */
export function allPartLibraryRows(catalog) {
  const out = [];
  for (const asm of catalog) {
    for (const row of partLibraryRowsFromAssembly(asm)) {
      out.push({
        ...row,
        assemblyId: asm.id,
        assemblyName: asm.name,
      });
    }
  }
  return out;
}
