import { createContext, useContext } from 'react';
import PlacedItem from '../components/PlacedItem.jsx';
import PlacedItem_ConceptA from '../prototypes/PlacedItem_ConceptA.jsx';
import PlacedItem_ConceptA_V2 from '../prototypes/PlacedItem_ConceptA_V2.jsx';
import PlacedItem_ConceptB from '../prototypes/PlacedItem_ConceptB.jsx';
import PlacedItem_Combined from '../prototypes/PlacedItem_Combined.jsx';

const CONCEPT_MAP = {
  'image-consolidated': PlacedItem_ConceptA,
  'des-53-v2': PlacedItem_ConceptA_V2,
  'image-two-buttons': PlacedItem_ConceptB,
  'des-combined': PlacedItem_Combined,
  'des-combined-2': PlacedItem_Combined,
  'des-combined-3': PlacedItem_Combined,
};

export const PrototypeContext = createContext({
  placedItemComponent: PlacedItem,
  conceptId: null,
});

export function usePrototype() {
  return useContext(PrototypeContext);
}

export function getPlacedItemComponent(conceptId) {
  if (!conceptId) return PlacedItem;
  return CONCEPT_MAP[conceptId] ?? PlacedItem;
}

/** Prototypes that share DES 53 behavior (screenshot capture, retake, etc.) */
export function hasScreenshotCapture(conceptId) {
  return conceptId === 'image-consolidated' || conceptId === 'des-53-v2' || conceptId === 'des-combined' || conceptId === 'des-combined-2' || conceptId === 'des-combined-3';
}

export { CONCEPT_MAP };
