import { useState } from 'react';
import LayoutBuilder from '../LayoutBuilder.jsx';
import OnshapeWorkspace from './OnshapeWorkspace.jsx';
import './infer.css';

export default function ReferenceFlow() {
  const [source, setSource] = useState(null);
  const [pending, setPending] = useState(null);

  if (source === 'q20') {
    return (
      <LayoutBuilder
        storageKey="q20_ai_workflow_4_q20_v1"
        inferDocument
        referenceFlow
        parseSetup
      />
    );
  }

  if (pending) {
    return (
      <LayoutBuilder
        key={`${pending.title}-${pending.cadName}`}
        storageKey="q20_ai_workflow_4_onshape_v1"
        inferDocument
        parseSetup
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
