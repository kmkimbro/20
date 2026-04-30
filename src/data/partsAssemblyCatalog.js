/**
 * Demo assembly trees for the Parts browser (sidebar under Projects).
 * Document nodes: docName (editor query), docType, syncStatus — see partsDocTaxonomy.js.
 */

export const PART_ASSEMBLY_CATALOG = [
  {
    id: 'asm-pump-skid',
    name: 'Pump skid (ASM)',
    tree: {
      id: 'p-root',
      label: 'Pump skid (ASM)',
      syncStatus: 'in_sync',
      children: [
        {
          id: 'p-frame',
          label: 'Frame & mounts',
          syncStatus: 'in_sync',
          children: [
            {
              id: 'p-doc-frame',
              label: 'Frame weldment PRD',
              type: 'document',
              docName: 'Untitled Document',
              docType: 'prd',
              syncStatus: 'in_sync',
              hint: 'Main layout',
            },
            {
              id: 'p-doc-shipping',
              label: 'Shipping base checklist',
              type: 'document',
              docName: 'Document name',
              docType: 'checklist',
              syncStatus: 'auto_updated',
              hint: 'Ops',
            },
          ],
        },
        {
          id: 'p-hyd',
          label: 'Hydraulics stack',
          syncStatus: 'auto_updated',
          children: [
            {
              id: 'p-sub-manifold',
              label: 'Manifold block',
              syncStatus: 'draft',
              children: [
                {
                  id: 'p-doc-valve',
                  label: 'Valve block study',
                  type: 'document',
                  docName: 'Document name',
                  docType: 'study',
                  syncStatus: 'auto_updated',
                  hint: 'CAD-linked',
                },
              ],
            },
            {
              id: 'p-doc-pump',
              label: 'Pump housing PRD',
              type: 'document',
              docName: 'Untitled Document',
              docType: 'prd',
              syncStatus: 'no_cad',
              hint: 'STEP assembly',
            },
          ],
        },
      ],
    },
  },
  {
    id: 'asm-door-latch',
    name: 'Door latch (ASM)',
    tree: {
      id: 'd-root',
      label: 'Door latch (ASM)',
      syncStatus: 'draft',
      children: [
        {
          id: 'd-bracket',
          label: 'Bracket subassembly',
          syncStatus: 'in_sync',
          children: [
            {
              id: 'd-doc-latch',
              label: 'Latch mechanism PRD',
              type: 'document',
              docName: 'Untitled Document',
              docType: 'prd',
              syncStatus: 'in_sync',
              hint: 'Design review',
            },
          ],
        },
        {
          id: 'd-doc-qc',
          label: 'QC sampling plan',
          type: 'document',
          docName: 'Document name',
          docType: 'qc',
          syncStatus: 'draft',
        },
      ],
    },
  },
  {
    id: 'asm-test-rig',
    name: 'Valve test rig (ASM)',
    tree: {
      id: 't-root',
      label: 'Valve test rig (ASM)',
      syncStatus: 'in_sync',
      children: [
        {
          id: 't-plate',
          label: 'Fixture plate',
          syncStatus: 'auto_updated',
          children: [
            {
              id: 't-doc-fixture',
              label: 'Fixture PRD',
              type: 'document',
              docName: 'Untitled Document',
              docType: 'prd',
              syncStatus: 'auto_updated',
            },
          ],
        },
        {
          id: 't-doc-safety',
          label: 'Safety interlocks',
          type: 'document',
          docName: 'Document name',
          docType: 'plan',
          syncStatus: 'in_sync',
        },
      ],
    },
  },
];

export const DEFAULT_PARTS_ASSEMBLY_ID = PART_ASSEMBLY_CATALOG[0]?.id ?? null;

export function getAssemblyById(id) {
  return PART_ASSEMBLY_CATALOG.find((a) => a.id === id) ?? PART_ASSEMBLY_CATALOG[0] ?? null;
}
