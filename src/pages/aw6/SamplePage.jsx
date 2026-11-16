/** A drawn stand-in for one page of the sample PDF work instruction. */
export default function SamplePage({ page, index, mini = false }) {
  return (
    <div className={`aw6-pdf-page${mini ? ' is-mini' : ''}`}>
      <div className="aw6-pdf-band">
        <span>Frame Assembly</span>
        <span>{`WI-014 · Rev C · Page ${index + 1}`}</span>
      </div>
      <h4>{`${index + 1}. ${page?.title || 'Step'}`}</h4>
      {page?.note && !mini ? <p>{page.note}</p> : <div className="aw6-pdf-lines"><i /><i /></div>}
      <div className="aw6-pdf-figure">
        <svg viewBox="0 0 160 90" aria-hidden="true">
          <path d="M30 52 L80 28 L130 52 L80 76 Z" fill="#EEF1FE" stroke="#8A9BF0" strokeWidth="1.2" />
          <path d="M80 28 L80 52 L130 76" fill="none" stroke="#8A9BF0" strokeWidth="1.2" />
        </svg>
      </div>
      {page?.parts?.length && !mini ? (
        <table>
          <tbody>
            {page.parts.map((part) => (
              <tr key={part.pn}>
                <td>{part.item}</td>
                <td>{part.pn}</td>
                <td>{part.name}</td>
                <td>{part.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <div className="aw6-pdf-rows"><i /><i /><i /></div>}
    </div>
  );
}
