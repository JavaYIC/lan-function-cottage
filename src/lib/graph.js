export function graphValue({ type, a, h, k, base }, x) {
  if (type === 'log' && x <= h) return NaN;
  if (a === 0) return k;
  const t = x - h;
  return a * (type === 'quad' ? t * t : type === 'exp' ? base ** t : Math.log(t) / Math.log(base)) + k;
}

// Inverse queries describe all real intersections, independently of the visible window.
export function graphIntersections(p, y) {
  if (p.a === 0) return { kind: y === p.k ? 'all' : 'none', xs: [] };
  const t = (y - p.k) / p.a;
  if (p.type === 'quad') {
    if (t < 0) return { kind: 'none', xs: [] };
    return { kind: 'finite', xs: t === 0 ? [p.h] : [p.h - Math.sqrt(t), p.h + Math.sqrt(t)] };
  }
  if (p.type === 'exp') return t <= 0 ? { kind: 'none', xs: [] } : { kind: 'finite', xs: [p.h + Math.log(t) / Math.log(p.base)] };
  const delta = p.base ** t;
  if (!Number.isFinite(delta) || delta === 0 || p.h + delta === p.h) return { kind: 'precision', xs: [] };
  return { kind: 'finite', xs: [p.h + delta] };
}

export function formatCoordinate(n) {
  if (!Number.isFinite(n)) return '超出数值范围';
  if (n === 0) return '0';
  return Math.abs(n) >= 1e6 || Math.abs(n) < 0.0001 ? n.toExponential(3) : Number(n.toFixed(4)).toString();
}
