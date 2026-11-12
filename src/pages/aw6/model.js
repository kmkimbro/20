import { planFromSample } from '../infer/samples.js';

export const STORAGE_KEY = 'q20_ai_workflow_6_v1';
export const SAMPLE_CAD = 'weldment_frame.step';
export const SAMPLE_PDF = 'Frame Assembly Work Instruction.pdf';
/** How long the CAD takes to finish processing after a document is created (prototype time). */
export const CAD_READY_MS = 15000;

export const ONSHAPE_DOCS = [
  { id: 'os-1', name: 'Weldment frame', file: 'weldment_frame.step' },
  { id: 'os-2', name: 'Drone chassis', file: 'drone_chassis.step' },
  { id: 'os-3', name: 'Bulkhead assembly', file: 'bulkhead_assembly.step' },
];

export function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createdLabel() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

export function bareName(fileName = '') {
  return fileName.replace(/\.(step|stp|iges|igs|stl|obj|pdf)(\.gz)?$/i, '');
}

export function samplePlan() {
  return planFromSample().planSteps;
}

export function modelParts() {
  return [...new Set(samplePlan().flatMap((step) => step.parts.map((part) => part.name)))];
}

/** The pages of the sample work instruction, used when no PDF is chosen. */
export function samplePages() {
  return samplePlan().slice(0, 6).map((step) => ({
    title: step.title,
    note: step.note,
    parts: step.parts,
  }));
}

export function emptyOperation(n) {
  return { id: uid('op'), title: `Operation ${n}`, kind: 'empty' };
}

export function generatedOperations() {
  return samplePlan().map((step, index) => ({
    id: uid('op'),
    title: step.title,
    kind: 'generated',
    note: step.note,
    parts: step.parts,
    marks: step.marks,
    shot: index,
  }));
}

export function importedOperations(pageCount) {
  return Array.from({ length: pageCount }, (_, index) => ({
    id: uid('op'),
    title: `Operation ${index + 1}`,
    kind: 'imported',
    page: index,
  }));
}

const DEFAULT_STATE = {
  projects: [{ id: 'proj-1', name: 'Untitled Project' }],
  documents: [],
  cadLibrary: [{ id: 'cad-1', name: SAMPLE_CAD }],
};

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked; the prototype still works for this visit */
  }
}

export function resetState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
