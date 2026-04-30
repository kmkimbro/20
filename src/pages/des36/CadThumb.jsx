/** Small wireframe preview used as a stand-in for a linked CAD assembly thumbnail. */
export default function CadThumb({
  borderColor = '#E5E7EB',
  /** Fixed display size (px). Omit for full-width in card layout. */
  displayWidth,
  displayHeight,
}) {
  const W = 128;
  const H = 80;
  const cx = W / 2;
  const cy = H / 2;
  const s = 18;
  const off = 8;
  const front = [[cx - s, cy - s], [cx + s, cy - s], [cx + s, cy + s], [cx - s, cy + s]];
  const back = front.map(([x, y]) => [x + off, y - off]);

  const dw = displayWidth != null ? Number(displayWidth) : null;
  const dh =
    displayHeight != null
      ? Number(displayHeight)
      : dw != null
        ? Math.round((dw * H) / W)
        : null;

  return (
    <svg
      width={dw != null ? dw : '100%'}
      height={dh != null ? dh : undefined}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        display: 'block',
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        ...(dw != null ? { flexShrink: 0 } : {}),
      }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width={W} height={H} fill="#F3F4F6" />
      <g stroke="#9CA3AF" strokeWidth="1" fill="none">
        <polygon points={front.map((p) => p.join(',')).join(' ')} />
        <polygon points={back.map((p) => p.join(',')).join(' ')} />
        {front.map(([x, y], i) => (
          <line key={i} x1={x} y1={y} x2={back[i][0]} y2={back[i][1]} />
        ))}
      </g>
    </svg>
  );
}
