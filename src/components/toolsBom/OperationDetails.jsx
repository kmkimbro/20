/**
 * Shows selected operation: name, created, tools used, parts table, and notes editor with "/" menu.
 */
import { getToolNamesForOperation, getPartNamesForOperation } from '../../data/toolsBom.js';
import NotesEditor from './NotesEditor.jsx';

export default function OperationDetails({
  operation,
  toolsBom,
  partsCatalog,
  notes,
  onNotesChange,
  onAddPartToCatalogAndOperation,
  onAddToolToBom,
}) {
  if (!operation) {
    return (
      <div className="tools-bom-details tools-bom-details--empty">
        <p>Select an operation to view details.</p>
      </div>
    );
  }

  const toolNames = getToolNamesForOperation(operation.toolIds ?? [], toolsBom);
  const partsInOp = getPartNamesForOperation(operation.parts ?? [], partsCatalog);

  return (
    <div className="tools-bom-details">
      <div className="tools-bom-details-header">
        <h2 className="tools-bom-details-name">{operation.name}</h2>
        <div className="tools-bom-details-created">
          Created: {formatDate(operation.created)}
        </div>
      </div>

      <section className="tools-bom-details-section">
        <h3 className="tools-bom-section-title">Tools used in this operation</h3>
        {toolNames.length === 0 ? (
          <p className="tools-bom-no-tools">No tools used</p>
        ) : (
          <ul className="tools-bom-tools-used">
            {toolNames.map((name, i) => (
              <li key={i}>{name}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="tools-bom-details-section">
        <h3 className="tools-bom-section-title">Parts in this operation</h3>
        {partsInOp.length === 0 ? (
          <p className="tools-bom-no-tools">No parts</p>
        ) : (
          <table className="tools-bom-parts-table">
            <thead>
              <tr>
                <th>Part name</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {partsInOp.map((p, i) => (
                <tr key={i}>
                  <td>{p.name}</td>
                  <td>{p.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="tools-bom-details-section">
        <NotesEditor
          operation={operation}
          partsCatalog={partsCatalog}
          toolsBom={toolsBom}
          notes={notes}
          onNotesChange={onNotesChange}
          onAddPartToCatalogAndOperation={onAddPartToCatalogAndOperation}
          onAddToolToBom={onAddToolToBom}
        />
      </section>
    </div>
  );
}

function formatDate(isoOrDateStr) {
  if (!isoOrDateStr) return '—';
  try {
    const d = new Date(isoOrDateStr);
    return isNaN(d.getTime()) ? isoOrDateStr : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return isoOrDateStr;
  }
}
