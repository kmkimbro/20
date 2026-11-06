# Quarter20 prototype design system

One source for the colors, type, spacing and core components the prototypes
already use. Live reference: **`/prototype/design-system`** (linked from the
prototype gallery).

## What's here

| File | What it is |
|------|------------|
| `tokens.css` | CSS custom properties, all prefixed `--q20-`. Defines values only, so importing it changes nothing on screen. |
| `tokens.js` | The same tokens for inline styles and JS (`color`, `font`, `text`, `space`, `radius`, `shadow`, `layout`). |
| `components.css` | Styles for the shared components. Every class is prefixed `.q20-`, so nothing leaks into existing screens. |
| `components.jsx` | `Button`, `IconButton`, `Field`, `Input`, `Textarea`, `Checkbox`, `Tile`, `TileGroup`, `Modal`, `Tag`, `Card`, `Eyebrow`, `Lead`. |
| `index.js` | Import everything from here. |

The values were taken from what the prototypes use most today (for example
`#4F6EF7` primary, `#111827` text, `#6B7280` muted, `#E5E7EB` borders, 8px
radius, the 480/640px modal from Magic Parser and AI workflow 4, and the tile
and checkbox from the "What kind of document" step).

## Using it in a new screen

```jsx
import { Button, Modal, Tile, TileGroup, Checkbox, color, space } from '../design-system';

<Modal open title="How do you want to make this document?" onClose={close}
  footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button>Next</Button></>}>
  <TileGroup columns={2}>
    <Tile icon={File} title="Blank document" detail="Start empty." selected onClick={...} />
  </TileGroup>
</Modal>

<div style={{ color: color.textMuted, padding: space[4] }} />
```

In CSS:

```css
@import '../design-system/tokens.css'; /* or import any component, which pulls it in */

.my-panel {
  border: 1px solid var(--q20-color-border);
  border-radius: var(--q20-radius-md);
  color: var(--q20-color-text);
}
```

## Rules of thumb

- Use a token instead of a raw hex value. If a value you need is missing, add it to both `tokens.css` and `tokens.js`.
- One primary button per surface; `secondary` for the alternative.
- Icons: `lucide-react` at 14, 16 or 18px. Custom CAD icons live in `src/components/icons/`.
- Font: Inter (loaded in `index.html`).

## Existing screens

Existing prototypes still use their own CSS (`styles.css`, `magic-parser.css`,
`reference-flow.css`, …) and the older `--blue-primary`/`--gray-*` variables.
They were left untouched on purpose so nothing changes visually. Move a screen
onto the tokens when you're next working in it.
