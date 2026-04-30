/**
 * List of operations; selecting one calls onSelect(operationId).
 */
export default function OperationList({ operations = [], selectedId, onSelect }) {
  return (
    <div className="tools-bom-op-list">
      <h3 className="tools-bom-section-title">Operations</h3>
      <ul className="tools-bom-op-list-ul">
        {operations.map((op) => (
          <li key={op.id}>
            <button
              type="button"
              className={`tools-bom-op-list-btn${selectedId === op.id ? ' tools-bom-op-list-btn--active' : ''}`}
              onClick={() => onSelect(op.id)}
            >
              {op.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
