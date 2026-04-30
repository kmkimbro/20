# Document Editor (q20)

A React-based document editor prototype. The app includes a header, document outline (sidebar), toolbar, canvas (with tables and placed images), and modals. The same codebase supports both the **production** experience and **prototype concepts** so you can test different workflows (e.g. image controls) in the full app before promoting one to production.

---

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Use the toolbar to place images (screenshot, placeholder, or upload), then drag and resize them on the canvas.

**Build for production:**

```bash
npm run build
npm run preview   # serve the built app from dist/
```

---

## How the app works

- **Production route:** `/` — The main document editor. Header, sidebar, toolbar, canvas, and screenshot/upload modal are all interactive. You can place images on the canvas, drag them, and resize them (corner handles; hold Shift for aspect lock).
- **Components:** The app is built from React components in `src/components/` (Header, Sidebar, Toolbar, Canvas, ScreenshotModal, PlacedItem). `App.jsx` holds state (modal, placed items, canvas mouse position) and composes the layout. Styles live in `styles.css` at the project root.

---

## How the prototype system works

The prototype system lets you **test alternative designs for a specific workflow** (e.g. image controls) **inside the full app** — same header, sidebar, toolbar, modal, placement, drag, and resize; only the part you’re designing (e.g. the controls on a placed image) is swapped for a “concept” version.

### Routes

| Route | What you see |
|-------|----------------|
| `/` | Production app (default components). |
| `/prototype` | **Prototype gallery** — a list of links to each concept. |
| `/prototype/:conceptId` | Full app with **one workflow** replaced by a concept (e.g. `/prototype/image-consolidated`, `/prototype/image-two-buttons`). |

Everything stays clickable and functional: you still place images from the toolbar/modal, drag and resize them; only the **control UI** on the placed image (e.g. one button vs two buttons) changes by concept.

### How it’s wired

1. **Context** — `PrototypeContext` provides which component to use for “placed image” (production `PlacedItem` or a concept component). `PrototypeProvider` sets this from a `conceptId` (e.g. from the URL).
2. **Routes** — `main.jsx` sets up:
   - `/` → App wrapped in `PrototypeProvider` with `conceptId={null}` (production).
   - `/prototype` → Prototype gallery page.
   - `/prototype/:conceptId` → `PrototypeWrapper` reads `conceptId` from the URL and wraps App in `PrototypeProvider` with that id.
3. **Canvas** — Renders placed items using `usePrototype().placedItemComponent`. So the same app and state drive production or a concept; only the placed-image component changes.
4. **Concepts** — Each concept is a React component in `src/prototypes/` (e.g. `PlacedItem_ConceptA.jsx`, `PlacedItem_ConceptB.jsx`) with the **same props** as production: `item`, `canvasRect`, `onRemove`, `onUpdate`. Same drag/resize/content; only the control UI (buttons, layout) differs.

### Current concepts (image workflow)

- **Consolidated button** (`image-consolidated`) — One control (e.g. “⋯ Remove”) for the placed image.
- **Two separated buttons** (`image-two-buttons`) — Two distinct buttons (e.g. Remove + Replace).

Open `/prototype` and click a concept to try it in the full app.

---

## Adding a new prototype concept

1. **Create the component** in `src/prototypes/`, e.g. `PlacedItem_ConceptC.jsx`. Use the same props as `PlacedItem`: `item`, `canvasRect`, `onRemove`, `onUpdate`. Copy drag/resize logic from an existing concept if needed; change only the control UI.
2. **Register it** in `src/contexts/PrototypeContext.jsx`: add an entry to `CONCEPT_MAP`, e.g. `'image-your-concept': PlacedItem_ConceptC`.
3. **Add a gallery link** in `src/pages/PrototypeGallery.jsx`: add an object to the `PROTOTYPES` array with `id`, `title`, `description`, and `path: '/prototype/image-your-concept'`.

The route `/prototype/:conceptId` already exists; no new route is required. Visit `/prototype` and use the new link to open the full app with your concept.

---

## Project structure

```
q20/
├── index.html          # Vite entry
├── styles.css          # Global styles
├── package.json
├── vite.config.js
├── public/
│   └── logo.png
└── src/
    ├── main.jsx              # Router + routes (/, /prototype, /prototype/:conceptId)
    ├── App.jsx                # Document editor: state + layout (Header, Sidebar, Toolbar, Canvas, Modal)
    ├── PrototypeWrapper.jsx   # Wraps App with PrototypeProvider using route :conceptId
    ├── components/            # Production UI
    │   ├── Header.jsx
    │   ├── Sidebar.jsx
    │   ├── Toolbar.jsx
    │   ├── Canvas.jsx         # Uses usePrototype().placedItemComponent for placed items
    │   ├── PlacedItem.jsx     # Production placed-image component
    │   ├── ScreenshotModal.jsx
    │   └── ...
    ├── contexts/
    │   ├── PrototypeContext.jsx   # Context + getPlacedItemComponent(conceptId)
    │   └── PrototypeProvider.jsx  # Provides placedItemComponent from conceptId
    ├── pages/
    │   └── PrototypeGallery.jsx   # List of links to /prototype/:conceptId
    └── prototypes/            # Concept components (same props as PlacedItem)
        ├── PlacedItem_ConceptA.jsx
        └── PlacedItem_ConceptB.jsx
```

---

## Summary

- **Production** = `/` with default components; build with `npm run build`.
- **Prototypes** = full app at `/prototype/:conceptId` with one workflow swapped (e.g. image controls). Use `/prototype` to choose a concept.
- **Adding concepts** = new component in `src/prototypes/`, register in `PrototypeContext.jsx`, add link in `PrototypeGallery.jsx`.

This gives you one codebase for both the live product and design exploration, so you can test entire workflows in context before promoting a concept to production.
