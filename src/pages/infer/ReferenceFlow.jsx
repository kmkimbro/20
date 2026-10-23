import { useState } from 'react';
import LayoutBuilder from '../LayoutBuilder.jsx';
import OnshapeWorkspace from './OnshapeWorkspace.jsx';

export default function ReferenceFlow() {
  const [linkedCad, setLinkedCad] = useState('');
  const [onshape, setOnshape] = useState(false);
  const [pending, setPending] = useState(null);

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

  if (onshape) {
    return (
      <OnshapeWorkspace
        onUseCad={(name) => {
          setLinkedCad(name);
          setOnshape(false);
        }}
        onOpenDocument={setPending}
      />
    );
  }

  return (
    <LayoutBuilder
      key={linkedCad || 'new'}
      storageKey="q20_ai_workflow_4_q20_v1"
      inferDocument
      referenceFlow
      parseSetup
      linkedCad={linkedCad}
      onLinkIntegration={() => setOnshape(true)}
    />
  );
}
