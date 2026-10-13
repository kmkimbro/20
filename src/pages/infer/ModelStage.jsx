function Face({ d, fill, stroke = 'rgba(40,48,60,0.35)' }) {
  return <path d={d} fill={fill} stroke={stroke} strokeWidth="0.6" strokeLinejoin="round" />;
}

function Solid({ x, y, w, d, h, top, left, right }) {
  return (
    <g>
      <Face d={`M${x} ${y} L${x} ${y + h} L${x + d} ${y + h + d * 0.5} L${x + d} ${y + d * 0.5} Z`} fill={left} />
      <Face d={`M${x + d} ${y + d * 0.5} L${x + w + d} ${y - w * 0.5 + d * 0.5} L${x + w + d} ${y - w * 0.5 + d * 0.5 + h} L${x + d} ${y + d * 0.5 + h} Z`} fill={right} />
      <Face d={`M${x} ${y} L${x + w} ${y - w * 0.5} L${x + w + d} ${y - w * 0.5 + d * 0.5} L${x + d} ${y + d * 0.5} Z`} fill={top} />
    </g>
  );
}

export default function ModelStage({ active = [] }) {
  const lit = active.length > 0;
  return (
    <svg viewBox="0 0 800 520" role="img" aria-label="3D CAD model">
      <defs>
        <linearGradient id="cad-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F4F6F8" />
          <stop offset="100%" stopColor="#C9D1DC" />
        </linearGradient>
        <radialGradient id="cad-ground" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="#E7ECF2" />
          <stop offset="100%" stopColor="#C5CED8" />
        </radialGradient>
        <linearGradient id="metal-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F7F8FA" />
          <stop offset="100%" stopColor="#D5DCE4" />
        </linearGradient>
        <linearGradient id="metal-left" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C5CED8" />
          <stop offset="100%" stopColor="#8E99A8" />
        </linearGradient>
        <linearGradient id="metal-right" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#AEB8C4" />
          <stop offset="100%" stopColor="#6E7886" />
        </linearGradient>
        <linearGradient id="hot-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EEF2FF" />
          <stop offset="100%" stopColor="#C7D2FE" />
        </linearGradient>
        <linearGradient id="hot-left" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C7D2FE" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
        <linearGradient id="hot-right" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#A5B4FC" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <filter id="cad-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="16" stdDeviation="10" floodColor="#1F2937" floodOpacity="0.22" />
        </filter>
      </defs>
      <rect width="800" height="520" fill="url(#cad-sky)" />
      <ellipse cx="400" cy="360" rx="280" ry="70" fill="url(#cad-ground)" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`g${i}`} x1={160 + i * 60} y1="300" x2={80 + i * 80} y2="430" stroke="#B7C0CC" strokeWidth="1" />
      ))}
      <g filter="url(#cad-shadow)">
        <Solid x={210} y={250} w={280} d={150} h={16} top="url(#metal-top)" left="url(#metal-left)" right="url(#metal-right)" />
        <Solid x={230} y={228} w={18} d={110} h={28} top="url(#metal-top)" left="url(#metal-left)" right="url(#metal-right)" />
        <Solid x={452} y={118} w={18} d={110} h={28} top="url(#metal-top)" left="url(#metal-left)" right="url(#metal-right)" />
        <Solid x={248} y={214} w={200} d={16} h={22} top="url(#metal-top)" left="url(#metal-left)" right="url(#metal-right)" />
        <Solid x={250} y={268} w={200} d={16} h={22} top="url(#metal-top)" left="url(#metal-left)" right="url(#metal-right)" />
        <Solid
          x={300}
          y={200}
          w={78}
          d={48}
          h={36}
          top={lit ? 'url(#hot-top)' : 'url(#metal-top)'}
          left={lit ? 'url(#hot-left)' : 'url(#metal-left)'}
          right={lit ? 'url(#hot-right)' : 'url(#metal-right)'}
        />
        <Solid x={390} y={168} w={52} d={36} h={24} top="url(#metal-top)" left="url(#metal-left)" right="url(#metal-right)" />
        <Solid x={268} y={236} w={40} d={28} h={18} top="#E5E7EB" left="#B8C0CA" right="#8B95A3" />
      </g>
    </svg>
  );
}
