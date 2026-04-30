# Prototype components (React)

The prototype is a **React** application (Vite + React). The layout and behavior are implemented as React components so the same codebase can go from prototype to production.

- **src/App.jsx** composes the app: Header, Sidebar, Toolbar, Canvas, ScreenshotModal. App holds state for modal open/tab, placed items on the canvas, and last canvas mouse position for placement.
- **src/components/** contains one React component per major UI block: Header, Sidebar, Toolbar, Canvas, ScreenshotModal, PlacedItem (for placed images/placeholders on the canvas).
- **styles.css** at project root is imported from `src/main.jsx`; the same class names are used in JSX.
- **public/** holds static assets (e.g. logo.png); reference them with `/logo.png`.

To run the dev server:

```bash
npm run dev
```

To build for production:

```bash
npm run build
```

Output is in **dist/**. Preview the production build with `npm run preview`.

## Prototype concepts (workflow testing)

- **Routes:** `/` = production app. `/prototype` = gallery of concept links. `/prototype/:conceptId` = full app with one workflow swapped for a concept (e.g. `image-consolidated`, `image-two-buttons`).
- **src/contexts/PrototypeContext.jsx** and **PrototypeProvider.jsx** – provide which component to use for "placed image" (production vs concept). Canvas reads `usePrototype().placedItemComponent` and renders it for each placed item.
- **src/prototypes/** – one component per concept (e.g. PlacedItem_ConceptA, PlacedItem_ConceptB). Same props as production (item, canvasRect, onRemove, onUpdate); only the control UI differs. Add new concepts here and register in PrototypeContext CONCEPT_MAP.
- **src/pages/PrototypeGallery.jsx** – lists links to each concept. Full app remains interactive (place, resize, move); only the image controls change by concept.
