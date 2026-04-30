/**
 * CAD diff badges + change summary — same block as Des36PrdDocCard for auto-updated docs.
 */
export default function Des36PrdDocCadChangeInline({
  accentKey,
  cadDiffAdded,
  cadDiffRemoved,
  cadDiffModified,
  cadChangeSummary,
  style: styleProp,
}) {
  const hasDiffBadges =
    accentKey === 'auto_updated'
    && (
      (typeof cadDiffAdded === 'number' && cadDiffAdded > 0)
      || (typeof cadDiffRemoved === 'number' && cadDiffRemoved > 0)
      || (typeof cadDiffModified === 'number' && cadDiffModified > 0)
    );
  const showAutoCadBlock =
    accentKey === 'auto_updated'
    && (hasDiffBadges || Boolean(cadChangeSummary?.trim()));

  if (!showAutoCadBlock) return null;

  return (
    <div
      style={{
        flexShrink: 0,
        minWidth: 0,
        maxWidth: '100%',
        ...styleProp,
      }}
      title={cadChangeSummary?.trim() || undefined}
    >
      {hasDiffBadges ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
          {typeof cadDiffAdded === 'number' && cadDiffAdded > 0 ? (
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 4px',
              borderRadius: 4,
              background: 'transparent',
              color: '#166534',
              lineHeight: 1.2,
            }}
            >
              +
              {cadDiffAdded}
            </span>
          ) : null}
          {typeof cadDiffRemoved === 'number' && cadDiffRemoved > 0 ? (
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 4px',
              borderRadius: 4,
              background: 'transparent',
              color: '#991B1B',
              lineHeight: 1.2,
            }}
            >
              −
              {cadDiffRemoved}
            </span>
          ) : null}
          {typeof cadDiffModified === 'number' && cadDiffModified > 0 ? (
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 4px',
              borderRadius: 4,
              background: 'transparent',
              color: '#92400E',
              lineHeight: 1.2,
            }}
            >
              +
              {cadDiffModified}
            </span>
          ) : null}
        </div>
      ) : cadChangeSummary?.trim() ? (
        <div style={{
          fontSize: 10,
          color: '#6B7280',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
        >
          {cadChangeSummary.trim()}
        </div>
      ) : null}
    </div>
  );
}
