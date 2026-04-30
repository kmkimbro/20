import { useState, useEffect, useRef } from 'react';
import { X, Upload, ExternalLink, Download } from 'lucide-react';

const C = {
  blue: '#4F6EF7',
  blueLight: '#EEF1FE',
  text: '#111827',
  sub: '#6B7280',
  muted: '#9CA3AF',
  cardBdr: '#E5E7EB',
  card: '#ffffff',
  bg: '#F0F2F7',
  amberBg: '#FFFBEB',
  amberBorder: '#FCD34D',
  amberText: '#B45309',
};

export const CAD_TOOLS = [
  { id: 'solidworks', name: 'SolidWorks' },
  { id: 'onshape', name: 'Onshape' },
  { id: 'catia', name: 'CATIA' },
  { id: 'siemens_nx', name: 'Siemens NX' },
];

const ANALYSIS_STEPS = [
  'Reading assembly…',
  'Extracting parts…',
  'Matching against your library…',
  'Finding connected documents…',
];

const GEN_STEPS = [
  'Generating Work Instruction…',
  'Generating Quality Check…',
  'Generating Maintenance Doc…',
  'Generating Field Ops…',
];

function CadCard({ title, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '14px 16px', borderRadius: 10,
        border: `1.5px solid ${selected ? C.blue : C.cardBdr}`,
        background: selected ? C.blueLight : '#fff',
        cursor: 'pointer', textAlign: 'left', fontSize: 14, fontWeight: 600, color: C.text,
        transition: 'border 0.15s, background 0.15s',
      }}
    >
      {title}
    </button>
  );
}

/**
 * Workflow 1 steps 2–5 inside project view (zero documents, onboarding not complete).
 */
export function Des36PrdCadOnboarding({
  projectName,
  onboarding,
  onUpdate,
  onGoToProject,
  onAnalysisDone,
  onGenerateComplete,
  fileInputRef,
}) {
  const [selectedCad, setSelectedCad] = useState(null);
  const [oauthStep, setOauthStep] = useState('idle'); // idle | opened | done
  const [pluginStep, setPluginStep] = useState('instructions'); // instructions | waiting
  const [analysisIdx, setAnalysisIdx] = useState(0);
  const [genIdx, setGenIdx] = useState(0);
  const [assemblyName, setAssemblyName] = useState(onboarding.assemblyName || `${projectName} — Main assembly`);

  const phase = onboarding.phase || 'cad_connect';

  useEffect(() => {
    if (phase !== 'analyzing') return undefined;
    let cancelled = false;
    let step = 0;
    setAnalysisIdx(0);
    const tick = () => {
      if (cancelled) return;
      if (step < ANALYSIS_STEPS.length - 1) {
        step += 1;
        setAnalysisIdx(step);
        setTimeout(tick, 1500);
      } else {
        setTimeout(() => {
          if (!cancelled) onAnalysisDone(assemblyName);
        }, 600);
      }
    };
    const id = setTimeout(tick, 1200);
    return () => { cancelled = true; clearTimeout(id); };
  }, [phase, assemblyName, onAnalysisDone]);

  useEffect(() => {
    if (phase !== 'generating') return undefined;
    let cancelled = false;
    let step = 0;
    setGenIdx(0);
    const tick = () => {
      if (cancelled) return;
      if (step < GEN_STEPS.length - 1) {
        step += 1;
        setGenIdx(step);
        setTimeout(tick, 850);
      } else {
        setTimeout(() => {
          if (!cancelled) onGenerateComplete();
        }, 400);
      }
    };
    const id = setTimeout(tick, 600);
    return () => { cancelled = true; clearTimeout(id); };
  }, [phase, onGenerateComplete]);

  if (phase === 'cad_connect') {
    return (
      <div style={{ maxWidth: 920 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>
          Connect your CAD tool
        </h2>
        <p style={{ fontSize: 14, color: C.sub, margin: '0 0 28px', maxWidth: 560 }}>
          Link a live CAD session or upload geometry to analyze. You need one source before documents can be generated.
        </p>
        <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', background: '#fff', borderRadius: 12, border: `1px solid ${C.cardBdr}`, overflow: 'hidden' }}>
          <div style={{ flex: 1, padding: '24px 28px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              Plugin / live connection
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {CAD_TOOLS.map((t) => (
                <CadCard
                  key={t.id}
                  title={t.name}
                  selected={selectedCad === t.id}
                  onClick={() => {
                    setSelectedCad(t.id);
                    onUpdate({
                      ...onboarding,
                      phase: 'cad_flow',
                      cadTool: t.id,
                      cadFlowType: t.id === 'onshape' ? 'oauth' : 'plugin',
                    });
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ width: 1, background: C.cardBdr, alignSelf: 'stretch' }} />
          <div style={{ flex: 1, padding: '24px 28px', background: '#FAFAFA' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Or upload manually
            </div>
            <p style={{ fontSize: 13, color: C.sub, margin: '0 0 16px', lineHeight: 1.5 }}>
              Don&apos;t have a plugin? Upload a file to get started.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".stp,.step,.iges,.igs,.f3d"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                onUpdate({
                  ...onboarding,
                  phase: 'analyzing',
                  cadSource: { kind: 'upload', fileName: f.name },
                  assemblyName: f.name.replace(/\.[^.]+$/, ''),
                });
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 8, border: `1px dashed ${C.blue}`,
                background: C.blueLight, color: C.blue, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Upload size={16} />
              Upload .stp / .step / .iges / .f3d
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'cad_flow') {
    const tool = CAD_TOOLS.find((t) => t.id === onboarding.cadTool);
    const isOauth = onboarding.cadFlowType === 'oauth';

    if (isOauth) {
      return (
        <div style={{ maxWidth: 480, background: '#fff', borderRadius: 12, border: `1px solid ${C.cardBdr}`, padding: 28 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>Connect {tool?.name}</h3>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: C.sub, lineHeight: 1.5 }}>
            We&apos;ll open Onshape so you can authorize q20. When you&apos;re done, return here — we&apos;ll detect the connection (prototype: simulated).
          </p>
          {oauthStep === 'idle' && (
            <button
              type="button"
              onClick={() => {
                setOauthStep('opened');
                window.open('https://cad.onshape.com', '_blank', 'noopener,noreferrer');
                setTimeout(() => setOauthStep('done'), 1200);
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: C.blue, color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <ExternalLink size={16} />
              Open Onshape to authorize
            </button>
          )}
          {oauthStep === 'opened' && (
            <p style={{ fontSize: 13, color: C.sub }}>Waiting for authorization…</p>
          )}
          {oauthStep === 'done' && (
            <div>
              <p style={{ fontSize: 14, color: '#15803D', marginBottom: 16, fontWeight: 500 }}>Connected (simulated)</p>
              <button
                type="button"
                onClick={() => onUpdate({
                  ...onboarding,
                  phase: 'analyzing',
                  cadSource: { kind: 'plugin', tool: onboarding.cadTool },
                  assemblyName: `${tool?.name} document`,
                })}
                style={{
                  background: C.blue, color: '#fff', border: 'none', borderRadius: 8,
                  padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Continue
              </button>
            </div>
          )}
          <button type="button" onClick={() => onUpdate({ ...onboarding, phase: 'cad_connect', cadTool: undefined })} style={{ display: 'block', marginTop: 20, background: 'none', border: 'none', color: C.sub, cursor: 'pointer', fontSize: 13 }}>
            ← Back
          </button>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: 480, background: '#fff', borderRadius: 12, border: `1px solid ${C.cardBdr}`, padding: 28 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>{tool?.name} plugin</h3>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: C.sub, lineHeight: 1.5 }}>
          Install the q20 CAD plugin for your desktop tool. It syncs assemblies and keeps documents up to date.
        </p>
        {pluginStep === 'instructions' && (
          <>
            <button
              type="button"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: C.text, color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12,
              }}
            >
              <Download size={16} />
              Download plugin
            </button>
            <button
              type="button"
              onClick={() => setPluginStep('waiting')}
              style={{ display: 'block', background: 'none', border: 'none', color: C.blue, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
            >
              I&apos;ve installed it — connect
            </button>
          </>
        )}
        {pluginStep === 'waiting' && (
          <button
            type="button"
            onClick={() => onUpdate({
              ...onboarding,
              phase: 'analyzing',
              cadSource: { kind: 'plugin', tool: onboarding.cadTool },
              assemblyName: `${tool?.name} assembly`,
            })}
            style={{
              background: C.blue, color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Connect now (simulated)
          </button>
        )}
        <button type="button" onClick={() => { setPluginStep('instructions'); onUpdate({ ...onboarding, phase: 'cad_connect', cadTool: undefined }); }} style={{ display: 'block', marginTop: 20, background: 'none', border: 'none', color: C.sub, cursor: 'pointer', fontSize: 13 }}>
          ← Back
        </button>
      </div>
    );
  }

  if (phase === 'analyzing') {
    const label = onboarding.cadSource?.fileName || onboarding.assemblyName || assemblyName;
    return (
      <div style={{ maxWidth: 520 }}>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 8 }}>Analyzing</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 28px', color: C.text }}>{label}</h2>
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.cardBdr}`, padding: '28px 32px' }}>
          <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{
              height: '100%', width: `${((analysisIdx + 1) / ANALYSIS_STEPS.length) * 100}%`,
              background: C.blue, borderRadius: 3,
              transition: 'width 0.4s ease',
            }}
            />
          </div>
          <p style={{ fontSize: 15, color: C.text, fontWeight: 500, margin: 0 }}>
            {ANALYSIS_STEPS[analysisIdx]}
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'review') {
    const s = onboarding.summary || {};
    return (
      <div style={{ maxWidth: 520 }}>
        <div style={{
          background: '#fff', borderRadius: 12, border: `1px solid ${C.cardBdr}`,
          padding: '28px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>Assembly</label>
          <input
            value={assemblyName}
            onChange={(e) => setAssemblyName(e.target.value)}
            style={{
              display: 'block', width: '100%', marginTop: 6, marginBottom: 22,
              fontSize: 20, fontWeight: 700, border: 'none', borderBottom: `2px solid ${C.blue}`,
              outline: 'none', padding: '4px 0', color: C.text,
            }}
          />
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 14, color: C.text, lineHeight: 2 }}>
            <li>
              <strong>{s.partsExtracted ?? 24}</strong> parts extracted
              {s.partsKnown != null && (
                <span style={{ color: C.sub }}> — {s.partsKnown} already in your library</span>
              )}
            </li>
            {(s.existingDocsConnected ?? 0) > 0 && (
              <li><strong>{s.existingDocsConnected}</strong> existing docs connected</li>
            )}
            <li>
              <strong>{s.docsReadyToGenerate ?? 4}</strong> docs ready to generate
              <span style={{ color: C.sub }}> — Work Instruction, Quality Check, Maintenance Doc, Field Ops</span>
            </li>
          </ul>
          {s.attention && (
            <div style={{
              marginTop: 18, padding: '12px 14px', borderRadius: 8,
              background: C.amberBg, border: `1px solid ${C.amberBorder}`, fontSize: 13, color: C.amberText,
            }}>
              {s.attention}
            </div>
          )}
          <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => onUpdate({ ...onboarding, phase: 'generating', assemblyName })}
              style={{
                background: C.blue, color: '#fff', border: 'none', borderRadius: 8,
                padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Generate docs →
            </button>
            <button
              type="button"
              onClick={onGoToProject}
              style={{ background: 'none', border: 'none', color: C.blue, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
            >
              Go to project
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'generating') {
    return (
      <div style={{ maxWidth: 480 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 20px' }}>Generating documents</h2>
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.cardBdr}`, padding: 24 }}>
          <p style={{ fontSize: 15, color: C.blue, fontWeight: 500, margin: 0 }}>{GEN_STEPS[genIdx]}</p>
        </div>
      </div>
    );
  }

  return null;
}
