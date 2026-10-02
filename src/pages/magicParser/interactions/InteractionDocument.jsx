import CadChangeReview from './CadChangeReview.jsx';
import GhostSteps from './GhostSteps.jsx';
import TagOntoStep from './TagOntoStep.jsx';
import './interaction.css';

export const INTERACTION_COPY = {
  'cad-change': {
    home: 'Open the work instruction. A CAD change is waiting on the steps and the screenshot — keep the update, or keep what was already on the page.',
  },
  'ghost-steps': {
    home: 'Open the work instruction. Suggested steps arrived from the assembly. Keep one, edit it, or drag it off the page.',
  },
  'tag-step': {
    home: 'Open the work instruction. Drag a part, tool, or procedure from the toolkit onto a step and the sentence fills in.',
  },
};

const VIEWS = {
  'cad-change': CadChangeReview,
  'ghost-steps': GhostSteps,
  'tag-step': TagOntoStep,
};

export default function InteractionDocument({ mode, document: doc, onBack }) {
  const View = VIEWS[mode];
  if (!View) return null;
  return <View document={doc} onBack={onBack} />;
}
