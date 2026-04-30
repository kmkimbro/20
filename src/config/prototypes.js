export const PROTOTYPES = [
  {
    id: 'des-36',
    title: 'DES 36 — Onboarding',
    description:
      'Project & document browser. Creating or opening a document opens the combined editor (parts + tools + CAD).',
    path: '/prototype/des-36',
  },
  {
    id: 'des-36-v2',
    title: 'DES 36 — Onboarding 2',
    description:
      'Same as Onboarding; skips the new-document modal. Opening a document continues to the combined editor (parts + tools + CAD).',
    path: '/prototype/des-36-v2',
  },
  {
    id: 'des-36-document-connection',
    title: 'DES 36 — Document connection',
    description:
      'Copy of DES 36 Onboarding 2 for exploring document-to-document relationships. Uses its own saved state (separate from other DES 36 prototypes).',
    path: '/prototype/des-36-document-connection',
  },
  {
    id: 'des-combined',
    title: 'parts and tool table interaction - 1',
    description: 'Parts and tools tables: + Add row, slash menu selection, and tag insertion in text.',
    path: '/prototype/des-combined',
  },
  {
    id: 'des-combined-2',
    title: 'parts and tool table interaction - 2',
    description: 'Duplicate of parts and tool table interaction - 1 for iteration.',
    path: '/prototype/des-combined-2',
  },
  {
    id: 'des-combined-3',
    title: 'parts and tool table interaction - 3',
    description:
      'Full editor: parts/tools, CAD tree, screenshots, Tools Library. After DES 36 Onboarding, creating or opening a document lands here. + Add row appears on hover over each table (touch: always visible).',
    path: '/prototype/des-combined-3',
  },
  {
    id: 'tool-library-mid-fi',
    title: 'Tool Library – mid fi',
    description:
      'DES 36 onboarding (project browser → create/open document) flowing into the full parts & tools editor with Tools Library (same interactions as parts and tool table interaction 3).',
    path: '/prototype/tool-library-mid-fi',
  },
  {
    id: 'image-consolidated',
    title: 'DES 53 Improved Screenshots in Document',
    description: 'One control button (actions/remove in a single control).',
    path: '/prototype/image-consolidated',
  },
  {
    id: 'des-53-v2',
    title: 'DES 53 V2',
    description: 'Iteration of DES 53 Improved Screenshots in Document.',
    path: '/prototype/des-53-v2',
  },
  {
    id: 'image-two-buttons',
    title: 'DES 49&50 Document page improvements',
    description: 'Two distinct buttons (e.g. Remove + Replace).',
    path: '/prototype/image-two-buttons',
  },
  {
    id: 'megadocument',
    title: 'Megadocument',
    description:
      'Same as DES 36 — Document connection: project onboarding, document links, and connection graph. Own saved state (separate localStorage from other DES 36 prototypes).',
    path: '/prototype/megadocument',
  },
  {
    id: 'megadocument-2',
    title: 'Megadocument 2',
    description:
      'Document-connection flow with its own save slot. Merged packages appear under their project in the rail; choosing one opens a package page in the main area with member files (normal editor per file; no combined mega-document).',
    path: '/prototype/megadocument-2',
  },
  {
    id: 'megadocument-empty',
    title: 'Megadocument — empty state',
    description:
      'First-login workspace: empty projects list, no document packages or member docs, no plugin tags in the rail (unlike other shells that show Onshape), empty Tool Library, Parts Library as a dashed placeholder with Create project only (no sample parts table), and a TBD placeholder for Reusable Procedures. Other upload / import panels are prototype-only simulations.',
    path: '/prototype/megadocument-empty',
  },
];
