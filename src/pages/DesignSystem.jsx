import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, File, Hexagon, Layers, MoreHorizontal, Plus, Sparkles, Upload,
} from 'lucide-react';
import {
  Button, Card, Checkbox, Eyebrow, Field, IconButton, Input, Lead, Modal, Tag, Textarea, Tile, TileGroup,
  color, font, radius, shadow, space,
} from '../design-system/index.js';

const COLOR_GROUPS = [
  {
    name: 'Primary',
    tokens: [
      ['primary', '--q20-color-primary'],
      ['primaryHover', '--q20-color-primary-hover'],
      ['primaryDeep', '--q20-color-primary-deep'],
      ['primarySubtle', '--q20-color-primary-subtle'],
      ['primaryBorder', '--q20-color-primary-border'],
      ['nav', '--q20-color-nav'],
    ],
  },
  {
    name: 'Text',
    tokens: [
      ['text', '--q20-color-text'],
      ['textSecondary', '--q20-color-text-secondary'],
      ['textLead', '--q20-color-text-lead'],
      ['textMuted', '--q20-color-text-muted'],
      ['textSubtle', '--q20-color-text-subtle'],
    ],
  },
  {
    name: 'Surface and border',
    tokens: [
      ['surface', '--q20-color-surface'],
      ['surfaceSubtle', '--q20-color-surface-subtle'],
      ['surfaceHover', '--q20-color-surface-hover'],
      ['page', '--q20-color-page'],
      ['border', '--q20-color-border'],
      ['borderStrong', '--q20-color-border-strong'],
    ],
  },
  {
    name: 'Status',
    tokens: [
      ['danger', '--q20-color-danger'],
      ['dangerSubtle', '--q20-color-danger-subtle'],
      ['success', '--q20-color-success'],
      ['successSubtle', '--q20-color-success-subtle'],
      ['warning', '--q20-color-warning'],
      ['warningSubtle', '--q20-color-warning-subtle'],
    ],
  },
];

const TYPE_SCALE = [
  ['2xl', 'Page title', 700],
  ['xl', 'Modal title', 700],
  ['lg', 'Section title', 700],
  ['md', 'Body text and inputs', 400],
  ['sm', 'UI labels and buttons', 600],
  ['xs', 'Captions, hints and tags', 400],
  ['2xs', 'Dense metadata', 500],
];

const DOC_TYPES = [
  { id: 'blank', label: 'Blank document', detail: 'Start empty and add the content yourself.', icon: File },
  { id: 'import', label: 'Import', detail: 'Upload your own document.', icon: Sparkles },
  { id: 'auto', label: 'Auto Assembly', detail: 'We suggest an assembly plan from your CAD.', icon: Layers },
  { id: 'parts', label: 'Parts list', detail: 'Generate a parts list from your CAD.', icon: Hexagon },
];

const EXTRACT = ['Operations', 'Images', 'Tables', 'Parts'];

const page = {
  minHeight: '100vh',
  background: color.page,
  fontFamily: font.family,
  color: color.text,
};

function Section({ id, title, lead, children }) {
  return (
    <section id={id} style={{ marginTop: space[8] + 16 }}>
      <h2 style={{
        margin: 0, fontSize: font.size.xl, fontWeight: 700, letterSpacing: '-0.02em',
      }}
      >
        {title}
      </h2>
      {lead ? <Lead className="ds-lead">{lead}</Lead> : null}
      <div style={{ marginTop: space[4] }}>{children}</div>
    </section>
  );
}

function Code({ children }) {
  return (
    <code style={{
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 12,
      color: color.textSecondary,
      background: color.surfaceHover,
      borderRadius: radius.xs,
      padding: '1px 5px',
      wordBreak: 'break-all',
    }}
    >
      {children}
    </code>
  );
}

function Swatch({ jsName, cssVar }) {
  const value = color[jsName];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div style={{
        height: 56, borderRadius: radius.md, background: value, border: `1px solid ${color.border}`,
      }}
      />
      <strong style={{ fontSize: 13 }}>{jsName}</strong>
      <span style={{ fontSize: 12, color: color.textMuted }}>{value}</span>
      <Code>{cssVar}</Code>
    </div>
  );
}

const grid = (min) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
  gap: space[4],
});

const row = {
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: space[3],
};

export default function DesignSystem() {
  const [docType, setDocType] = useState('blank');
  const [picks, setPicks] = useState(['Operations', 'Images']);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');

  const allPicked = picks.length === EXTRACT.length;
  const somePicked = picks.length > 0 && !allPicked;
  const toggle = (id) => setPicks((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <div style={page}>
      <style>{'.ds-lead { margin-top: 6px; max-width: 640px; } .ds-eyebrow { margin-top: 24px; }'}</style>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 24px 96px' }}>
        <Link to="/prototype" style={{ color: color.primary, textDecoration: 'none', fontWeight: 500, fontSize: 14 }}>
          ← All prototypes
        </Link>
        <Eyebrow className="ds-eyebrow">Quarter20 prototypes</Eyebrow>
        <h1 style={{
          margin: '6px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em',
        }}
        >
          Design system
        </h1>
        <Lead className="ds-lead">
          The colors, type, spacing and components the prototypes already use, in one place.
          Import from <Code>src/design-system</Code> in a new screen instead of copying hex values.
        </Lead>

        <Section id="color" title="Color" lead="Use the CSS variable in stylesheets and the JS name in inline styles.">
          {COLOR_GROUPS.map((group) => (
            <div key={group.name} style={{ marginBottom: space[6] }}>
              <Eyebrow>{group.name}</Eyebrow>
              <div style={{ ...grid(140), marginTop: space[3] }}>
                {group.tokens.map(([jsName, cssVar]) => <Swatch key={jsName} jsName={jsName} cssVar={cssVar} />)}
              </div>
            </div>
          ))}
        </Section>

        <Section id="type" title="Typography" lead="Inter, loaded from Google Fonts in index.html. Weights 400, 500, 600, 650 and 700.">
          <Card flat style={{ padding: 0 }}>
            {TYPE_SCALE.map(([key, use, weight], i) => (
              <div
                key={key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: space[4],
                  alignItems: 'baseline',
                  padding: '14px 16px',
                  borderTop: i ? `1px solid ${color.border}` : 'none',
                }}
              >
                <span style={{ fontSize: font.size[key], fontWeight: weight, letterSpacing: weight === 700 ? '-0.02em' : 0 }}>
                  {use}
                </span>
                <Code>{`--q20-font-size-${key} · ${font.size[key]}px`}</Code>
              </div>
            ))}
            <div style={{ padding: '14px 16px', borderTop: `1px solid ${color.border}` }}>
              <Eyebrow>Eyebrow label</Eyebrow>
              <div style={{ marginTop: 6 }}><Code>.q20-eyebrow · 12px · 650 · uppercase</Code></div>
            </div>
          </Card>
        </Section>

        <Section id="spacing" title="Spacing" lead="A 4px base. Modals use 18px and 22px gutters.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(space).sort((a, b) => a[1] - b[1]).map(([key, px]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
                <span style={{ width: 120, flexShrink: 0 }}><Code>{`--q20-space-${String(key).replace('.', '-')}`}</Code></span>
                <span style={{
                  width: px, height: 12, background: color.primary, borderRadius: 2, flexShrink: 0,
                }}
                />
                <span style={{ fontSize: 12, color: color.textMuted }}>{px}px</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="radius" title="Radius and shadow">
          <div style={grid(150)}>
            {Object.entries(radius).map(([key, px]) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{
                  height: 64, background: color.surface, border: `1px solid ${color.borderStrong}`, borderRadius: px,
                }}
                />
                <Code>{`--q20-radius-${key}`}</Code>
                <span style={{ fontSize: 12, color: color.textMuted }}>{px}px</span>
              </div>
            ))}
          </div>
          <div style={{ ...grid(200), marginTop: space[6] }}>
            {Object.entries(shadow).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{
                  height: 72, background: color.surface, borderRadius: radius.md, boxShadow: value,
                }}
                />
                <Code>{`--q20-${key === 'focusRing' ? 'focus-ring' : `shadow-${key}`}`}</Code>
              </div>
            ))}
          </div>
        </Section>

        <Section id="buttons" title="Button" lead="One primary action per surface. Secondary for the alternative, ghost or link for low-emphasis actions.">
          <Card flat>
            <div style={row}>
              <Button>Create document</Button>
              <Button variant="secondary">Cancel</Button>
              <Button variant="ghost" icon={<Plus size={14} />}>Add row</Button>
              <Button variant="link">Back</Button>
              <Button variant="danger">Delete</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div style={{ ...row, marginTop: space[4] }}>
              <Button size="lg">Large</Button>
              <Button size="sm" variant="secondary" icon={<Upload size={12} />}>Small</Button>
              <IconButton label="More"><MoreHorizontal size={18} /></IconButton>
            </div>
            <div style={{ marginTop: space[4] }}>
              <Code>{'<Button variant="ghost" icon={<Plus size={14} />}>Add row</Button>'}</Code>
            </div>
          </Card>
        </Section>

        <Section id="inputs" title="Input and checkbox">
          <Card flat>
            <div style={{ ...grid(260), alignItems: 'start' }}>
              <Field label="Document name" hint="Shown in the project rail.">
                <Input placeholder="Untitled Document" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="CAD link" error="Paste an Onshape or SolidWorks link.">
                <Input invalid defaultValue="not a link" />
              </Field>
              <Field label="Notes">
                <Textarea placeholder="Anything the generator should know" />
              </Field>
            </div>
            <div style={{ ...row, marginTop: space[5], gap: space[5] }}>
              <Checkbox
                checked={allPicked}
                indeterminate={somePicked}
                onChange={() => setPicks(allPicked ? [] : EXTRACT)}
              >
                <strong style={{ fontWeight: 650 }}>Select all</strong>
              </Checkbox>
              {EXTRACT.map((id) => (
                <Checkbox key={id} checked={picks.includes(id)} onChange={() => toggle(id)}>{id}</Checkbox>
              ))}
              <Checkbox checked disabled>Disabled</Checkbox>
            </div>
          </Card>
        </Section>

        <Section id="tiles" title="Tile" lead="Pick one option from a short set. Use TileGroup for the grid.">
          <Card flat>
            <TileGroup columns={2}>
              {DOC_TYPES.map((item) => (
                <Tile
                  key={item.id}
                  icon={item.icon}
                  title={item.label}
                  detail={item.detail}
                  selected={docType === item.id}
                  onClick={() => setDocType(item.id)}
                />
              ))}
            </TileGroup>
          </Card>
        </Section>

        <Section id="tags" title="Tag and card">
          <div style={row}>
            <Tag>Generated draft</Tag>
            <Tag tone="primary">Linked</Tag>
            <Tag tone="success">Up to date</Tag>
            <Tag tone="warning">CAD changed</Tag>
            <Tag tone="danger">Missing part</Tag>
            <Tag tone="primary" pill>3 steps</Tag>
          </div>
          <div style={{ ...grid(240), marginTop: space[5] }}>
            <Card>
              <Eyebrow>Card</Eyebrow>
              <p style={{ margin: '6px 0 0', fontSize: 14 }}>Default surface with a soft shadow.</p>
            </Card>
            <Card flat>
              <Eyebrow>Flat card</Eyebrow>
              <p style={{ margin: '6px 0 0', fontSize: 14 }}>Border only, for nesting inside panels.</p>
            </Card>
            <Card onClick={() => {}}>
              <Eyebrow>Interactive card</Eyebrow>
              <p style={{ margin: '6px 0 0', fontSize: 14 }}>Hover to see the border change.</p>
            </Card>
          </div>
        </Section>

        <Section id="modal" title="Modal" lead="Header with optional eyebrow and back button, scrolling body, footer with actions. Escape and the backdrop close it.">
          <Button variant="secondary" onClick={() => setModal(true)}>Open modal</Button>
          <Modal
            open={modal}
            size="md"
            eyebrow="Piston Assembly.step"
            title="How do you want to make this document?"
            onBack={() => setModal(false)}
            onClose={() => setModal(false)}
            footer={(
              <>
                <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
                <Button onClick={() => setModal(false)}>Next</Button>
              </>
            )}
          >
            <TileGroup columns={2}>
              {DOC_TYPES.map((item) => (
                <Tile
                  key={item.id}
                  icon={item.icon}
                  title={item.label}
                  detail={item.detail}
                  selected={docType === item.id}
                  onClick={() => setDocType(item.id)}
                />
              ))}
            </TileGroup>
          </Modal>
        </Section>

        <Section id="icons" title="Icons" lead="Use lucide-react at 14, 16 or 18px. Custom CAD icons live in src/components/icons.">
          <div style={{ ...row, color: color.textMuted }}>
            {[File, Sparkles, Layers, Hexagon, ClipboardList, Upload, Plus].map((Icon, i) => <Icon key={i} size={18} />)}
          </div>
        </Section>
      </div>
    </div>
  );
}
