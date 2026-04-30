/**
 * Renders the Tools Bill of Materials table (read-only).
 */
export default function ToolsTable({ tools = [] }) {
  return (
    <div className="tools-bom-table-wrap">
      <h3 className="tools-bom-section-title">Tools Bill of Materials</h3>
      <table className="tools-bom-table">
        <thead>
          <tr>
            <th>Tool name</th>
          </tr>
        </thead>
        <tbody>
          {tools.length === 0 ? (
            <tr>
              <td colSpan={1} className="tools-bom-empty">No tools defined</td>
            </tr>
          ) : (
            tools.map((tool) => (
              <tr key={tool.id}>
                <td>{tool.name}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
