import { useId } from 'react';

/** Vesica "petal" formed by two overlapping circles. */
function lensPath(cx: number, cy: number, halfLen: number, halfWidth: number) {
  const r = (halfLen * halfLen + halfWidth * halfWidth) / (2 * halfWidth);
  return `M ${cx} ${cy - halfLen} A ${r} ${r} 0 0 1 ${cx} ${cy + halfLen} A ${r} ${r} 0 0 1 ${cx} ${cy - halfLen} Z`;
}

function Flower({ x, y, s, grad, rot = 0 }: { x: number; y: number; s: number; grad: string; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <circle cx={-60} cy={-60} r={60} fill="#7a1d24" opacity={0.75} />
      <circle cx={60} cy={60} r={60} fill="#7a1d24" opacity={0.75} />
      <circle cx={60} cy={-60} r={60} fill="#5d171d" opacity={0.6} />
      <circle cx={-60} cy={60} r={60} fill="#5d171d" opacity={0.6} />
      <path d={lensPath(0, -60, 60, 26)} fill={`url(#${grad})`} />
      <path d={lensPath(0, 60, 60, 26)} fill={`url(#${grad})`} />
      <path d={lensPath(-60, 0, 60, 26)} transform="rotate(90 -60 0)" fill={`url(#${grad})`} />
      <path d={lensPath(60, 0, 60, 26)} transform="rotate(90 60 0)" fill={`url(#${grad})`} />
    </g>
  );
}

/** Decorative background: faint circle lattice + gold petal clusters in two corners. */
export function Petals({ dense = false, opacity = 1 }: { dense?: boolean; opacity?: number }) {
  const id = useId().replace(/:/g, '');
  const grad = `pg${id}`;
  const lattice = `pl${id}`;
  return (
    <svg
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity }}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7c65a" />
          <stop offset="0.5" stopColor="#f2b01e" />
          <stop offset="1" stopColor="#c9620f" />
        </linearGradient>
        <pattern id={lattice} width="180" height="180" patternUnits="userSpaceOnUse">
          <circle cx="90" cy="90" r="90" fill="none" stroke="rgba(247,198,90,0.05)" strokeWidth="2" />
          <circle cx="0" cy="0" r="90" fill="none" stroke="rgba(247,198,90,0.04)" strokeWidth="2" />
          <circle cx="180" cy="180" r="90" fill="none" stroke="rgba(247,198,90,0.04)" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="1600" height="900" fill={`url(#${lattice})`} />
      <Flower x={40} y={60} s={dense ? 1.1 : 1.35} grad={grad} />
      <Flower x={1580} y={860} s={dense ? 1.1 : 1.35} grad={grad} rot={45} />
      {!dense && <Flower x={1560} y={40} s={0.55} grad={grad} rot={45} />}
    </svg>
  );
}

/** SPE ITB SC lockup. Uses an uploaded logo when available, otherwise a text lockup. */
export function Logo({ src, size = 1, onGold = false }: { src?: string; size?: number; onGold?: boolean }) {
  const fg = onGold ? 'var(--ink)' : 'var(--cream-50)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 * size, color: fg }}>
      {src ? (
        <img src={src} alt="SPE ITB SC" style={{ height: 54 * size, objectFit: 'contain' }} />
      ) : (
        <div style={{ lineHeight: 1.05, textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 26 * size, letterSpacing: '0.02em' }}>
            SPE<span style={{ fontWeight: 500, fontSize: 12 * size, marginLeft: 4 }}>International</span>
          </div>
          <div style={{ fontSize: 9 * size, fontWeight: 600, opacity: 0.9 }}>
            Bandung Institute of Technology
            <br />
            SPE Student Chapter
          </div>
        </div>
      )}
      <div style={{ width: 2, alignSelf: 'stretch', background: fg, opacity: 0.6 }} />
      <div style={{ fontWeight: 500, fontSize: 13 * size, lineHeight: 1.15 }}>
        Solutions.
        <br />
        People.
        <br />
        Energy.<sup style={{ fontSize: '0.5em' }}>SM</sup>
      </div>
    </div>
  );
}
