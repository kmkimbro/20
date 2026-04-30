/**
 * Two-panel Tools BOM view: left = operation list, right = operation details (with parts table + notes editor) or Tools BOM table.
 * State: partsCatalog, toolsBom, operations (notes + parts stay in sync with "/" menu).
 */
import { useState, useCallback } from 'react';
import {
  PARTS_CATALOG_INITIAL,
  TOOLS_BOM_INITIAL,
  BOM_OPERATIONS_INITIAL,
} from '../../data/toolsBom.js';
import ToolsTable from './ToolsTable.jsx';
import OperationList from './OperationList.jsx';
import OperationDetails from './OperationDetails.jsx';

const TAB_DETAILS = 'details';
const TAB_BOM = 'bom';

function nextId(prefix) {
  return `${prefix}-${Date.now()}`;
}

export default function ToolsBomView() {
  const [partsCatalog, setPartsCatalog] = useState(() => [...PARTS_CATALOG_INITIAL]);
  const [toolsBom, setToolsBom] = useState(() => [...TOOLS_BOM_INITIAL]);
  const [operations, setOperations] = useState(() =>
    BOM_OPERATIONS_INITIAL.map((op) => ({
      ...op,
      parts: op.parts ? [...op.parts] : [],
      notes: op.notes ?? '',
    }))
  );

  const [selectedOpId, setSelectedOpId] = useState(operations[0]?.id ?? null);
  const [rightTab, setRightTab] = useState(TAB_DETAILS);

  const selectedOp = operations.find((o) => o.id === selectedOpId) ?? null;

  const onNotesChange = useCallback((opId, newNotes) => {
    setOperations((prev) =>
      prev.map((op) => (op.id === opId ? { ...op, notes: newNotes } : op))
    );
  }, []);

  const onAddPartToCatalogAndOperation = useCallback((opId, name, qty) => {
    const partId = nextId('part');
    const part = { id: partId, name: name.trim() };
    setPartsCatalog((prev) => [...prev, part]);
    setOperations((prev) =>
      prev.map((op) =>
        op.id === opId
          ? { ...op, parts: [...(op.parts || []), { partId, qty }] }
          : op
      )
    );
    return { partId, tokenName: part.name };
  }, []);

  const onAddToolToBom = useCallback((name) => {
    const id = nextId('tool');
    setToolsBom((prev) => [...prev, { id, name: name.trim() }]);
  }, []);

  return (
    <div className="tools-bom-view">
      <aside className="tools-bom-panel tools-bom-panel--left">
        <OperationList
          operations={operations}
          selectedId={selectedOpId}
          onSelect={setSelectedOpId}
        />
      </aside>

      <main className="tools-bom-panel tools-bom-panel--right">
        <div className="tools-bom-tabs">
          <button
            type="button"
            className={`tools-bom-tab${rightTab === TAB_DETAILS ? ' tools-bom-tab--active' : ''}`}
            onClick={() => setRightTab(TAB_DETAILS)}
          >
            Operation details
          </button>
          <button
            type="button"
            className={`tools-bom-tab${rightTab === TAB_BOM ? ' tools-bom-tab--active' : ''}`}
            onClick={() => setRightTab(TAB_BOM)}
          >
            Tools BOM
          </button>
        </div>

        <div className="tools-bom-content">
          {rightTab === TAB_DETAILS && (
            <OperationDetails
              operation={selectedOp}
              toolsBom={toolsBom}
              partsCatalog={partsCatalog}
              notes={selectedOp?.notes ?? ''}
              onNotesChange={(notes) => selectedOpId && onNotesChange(selectedOpId, notes)}
              onAddPartToCatalogAndOperation={onAddPartToCatalogAndOperation}
              onAddToolToBom={onAddToolToBom}
            />
          )}
          {rightTab === TAB_BOM && <ToolsTable tools={toolsBom} />}
        </div>
      </main>
    </div>
  );
}
