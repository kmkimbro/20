import { mockWeldFrameProject } from './mockWeldFrameProjectGraph.js';

export const MOCK_WELD_FRAME_PROJECT_ID = mockWeldFrameProject.projectId;

function coerceProjectDocsShape(obj) {
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return {};
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (!Array.isArray(out[k])) out[k] = [];
  }
  return out;
}

/** Project docs matching graph document ids — PRD cards on home / Documents tab. */
const MOCK_WELD_FRAME_PROJECT_DOCS = [
  {
    id: 'wi002',
    name: 'WI-002',
    prdCard: {
      stateLabel: 'In sync',
      lastUpdated: '1h ago',
      accentKey: 'in_sync',
      operationCount: 6,
      cadFileLabel: mockWeldFrameProject.cadFile,
    },
  },
  {
    id: 'wi001',
    name: 'WI-001',
    prdCard: {
      stateLabel: 'In sync',
      lastUpdated: '3h ago',
      accentKey: 'in_sync',
      operationCount: 5,
      cadFileLabel: mockWeldFrameProject.cadFile,
    },
  },
  {
    id: 'qc07',
    name: 'QC-07',
    prdCard: {
      stateLabel: 'In sync',
      lastUpdated: 'Yesterday',
      accentKey: 'in_sync',
      operationCount: 4,
      cadFileLabel: mockWeldFrameProject.cadFile,
    },
  },
  {
    id: 'maint03',
    name: 'MAINT-03',
    prdCard: {
      stateLabel: 'In sync',
      lastUpdated: 'Feb 2',
      accentKey: 'in_sync',
      operationCount: 2,
      cadFileLabel: 'No CAD file linked',
    },
  },
];

/**
 * Onboarding 2: always ensure the demo "Weld frame" project exists alongside any saved projects.
 * No manual localStorage reset — first visit (or any visit where the mock id is missing) gets it merged in.
 *
 * If the user had zero projects before merge, we also open that project on the Documents tab.
 */
export function applyOnboarding2MockMerge(saved) {
  const pid = MOCK_WELD_FRAME_PROJECT_ID;
  const rawProjects = saved?.projects;
  const prevProjects = Array.isArray(rawProjects) ? [...rawProjects] : [];
  const hadMock = prevProjects.some((p) => p.id === pid);
  const hadAnyProjects = prevProjects.length > 0;

  const projects = hadMock
    ? prevProjects
    : [...prevProjects, { id: pid, name: mockWeldFrameProject.projectName }];

  const projectDocs = coerceProjectDocsShape(saved?.projectDocs ?? {});
  if (!projectDocs[pid]?.length) {
    projectDocs[pid] = MOCK_WELD_FRAME_PROJECT_DOCS.map((d) => ({ ...d, prdCard: { ...d.prdCard } }));
  }

  const projectCadOnboarding = { ...(saved?.projectCadOnboarding ?? {}) };
  if (!projectCadOnboarding[pid]) {
    projectCadOnboarding[pid] = { phase: 'complete' };
  }

  const wasCompletelyEmpty = !hadAnyProjects;
  const addedMockNow = !hadMock;

  return {
    projects,
    projectDocs,
    projectCadOnboarding,
    ...(wasCompletelyEmpty && addedMockNow
      ? {
          selectedId: pid,
          view: 'project',
          projectMainTab: 'documents',
        }
      : {}),
  };
}
