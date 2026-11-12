import { useState } from 'react';
import LayoutBuilder from '../LayoutBuilder.jsx';
import OnshapeWorkspace from './OnshapeWorkspace.jsx';
import './infer.css';

// AI workflow 5 with prompt tiles: you upload the CAD, the document opens, and you pick how to start on the
// empty document (None, Import, Auto Assembly, Parts list, Work instruction). Each tile fills an editable prompt.
export default function AiWorkflow5Prompts() {
  const [source, setSource] = useState(null);
  const [pending, setPending] = useState(null);

  if (source === 'q20') {
    return (
      <LayoutBuilder
        storageKey="q20_ai_workflow_5_prompts_q20_v1"
        inferDocument
        referenceFlow
        promptStart
      />
    );
  }

  if (pending) {
    return (
      <LayoutBuilder
        key={`${pending.title}-${pending.cadName}`}
        storageKey="q20_ai_workflow_5_prompts_onshape_v1"
        inferDocument
        promptStart
        pendingInfer={pending}
      />
    );
  }

  if (source === 'onshape') {
    return <OnshapeWorkspace onOpenDocument={setPending} />;
  }

  return (
    <div className="aw3-start">
      <div className="aw3-start-card">
        <h1>Start</h1>
        <div className="aw3-start-actions">
          <button type="button" onClick={() => setSource('onshape')}>from onshape/SW</button>
          <button type="button" onClick={() => setSource('q20')}>from q20</button>
        </div>
      </div>
    </div>
  );
}
