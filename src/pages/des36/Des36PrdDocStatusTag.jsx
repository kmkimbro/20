/**
 * PRD document status pill — CAD / link state (in sync, auto-updated, no CAD).
 * CAD recency stays in the title tooltip only; document edit time lives on the card separately.
 */
function cadLinkTooltip({ stateLabel, lastUpdated, cadVersion, accentKey }) {
  const v = cadVersion?.trim();
  const parts = [stateLabel];
  if (accentKey === 'auto_updated' && v) parts.push(v);
  if (lastUpdated && lastUpdated !== '—') parts.push(`CAD ${lastUpdated}`);
  return parts.join(' · ');
}

export default function Des36PrdDocStatusTag({
  stateLabel,
  lastUpdated,
  accentKey,
  cadVersion,
}) {
  const tagBase = {
    display: 'inline-block',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
  };

  const tip = cadLinkTooltip({ stateLabel, lastUpdated, cadVersion, accentKey });

  if (accentKey === 'auto_updated') {
    const v = cadVersion?.trim();
    return (
      <span
        title={tip}
        style={{
          ...tagBase,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          maxWidth: '100%',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: '#4F6EF7',
          background: '#EEF2FF',
          border: '1px solid rgba(79, 110, 247, 0.14)',
          padding: '4px 8px',
          borderRadius: 5,
        }}
      >
        <span style={{ textTransform: 'uppercase' }}>{stateLabel}</span>
        {v ? (
          <>
            <span style={{ opacity: 0.45, fontWeight: 700 }} aria-hidden>·</span>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              color: '#3730A3',
              textTransform: 'none',
              letterSpacing: '-0.02em',
            }}
            >
              {v}
            </span>
          </>
        ) : null}
      </span>
    );
  }

  if (accentKey === 'no_cad') {
    return (
      <span
        title={tip}
        style={{
          ...tagBase,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          maxWidth: '100%',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.05em',
          color: '#B45309',
          background: '#FFFBEB',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          padding: '4px 8px',
          borderRadius: 5,
        }}
      >
        <span style={{ textTransform: 'uppercase' }}>{stateLabel}</span>
      </span>
    );
  }

  return (
    <span
      title={tip}
      style={{
        ...tagBase,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        maxWidth: '100%',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        color: '#047857',
        background: '#ECFDF5',
        border: '1px solid rgba(16, 185, 129, 0.28)',
        padding: '4px 8px',
        borderRadius: 5,
      }}
    >
      <span style={{ textTransform: 'uppercase' }}>{stateLabel}</span>
    </span>
  );
}
