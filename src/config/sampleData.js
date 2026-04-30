/**
 * Sample data for flow preview and initial app state.
 */
export const INITIAL_OPERATIONS = [
  {
    id: 'op1',
    number: 1,
    label: 'Arms/Propeller assembly',
    parts: [{ id: 'op1-part1', name: 'Chasis Base' }],
    toolIds: ['tool-screw', 'tool-glue'],
    subPages: [],
    suboperations: [
      { id: 'op1.1', number: '1.1', label: 'Attach propeller', parts: [], toolIds: [], subPages: [], suboperations: [] },
      { id: 'op1.2', number: '1.2', label: 'Secure arms', parts: [], toolIds: [], subPages: [], suboperations: [] },
    ],
  },
  {
    id: 'op2',
    number: 2,
    label: 'Chasis',
    parts: [],
    toolIds: [],
    subPages: [],
    suboperations: [
      { id: 'op2.1', number: '2.1', label: 'Mount chassis base', parts: [], toolIds: [], subPages: [], suboperations: [] },
    ],
  },
  {
    id: 'op3',
    number: 3,
    label: 'Board',
    parts: [],
    toolIds: [],
    subPages: [],
    suboperations: [],
  },
];

/** Operations with sub-pages for document-tree flow preview. */
export const OPERATIONS_WITH_SUBPAGES = [
  {
    id: 'op1',
    number: 1,
    label: 'Arms/Propeller assembly',
    parts: [{ id: 'op1-part1', name: 'Chasis Base' }],
    subPages: [{ id: 'op1-sub1', label: 'Sub-page A' }, { id: 'op1-sub2', label: 'Sub-page B' }],
    suboperations: [
      { id: 'op1.1', number: '1.1', label: 'Attach propeller', parts: [], subPages: [], suboperations: [] },
      { id: 'op1.2', number: '1.2', label: 'Secure arms', parts: [], subPages: [], suboperations: [] },
    ],
  },
  {
    id: 'op2',
    number: 2,
    label: 'Chasis',
    parts: [],
    subPages: [],
    suboperations: [
      { id: 'op2.1', number: '2.1', label: 'Mount chassis base', parts: [], subPages: [], suboperations: [] },
    ],
  },
  {
    id: 'op3',
    number: 3,
    label: 'Board',
    parts: [],
    subPages: [],
    suboperations: [],
  },
];
