import type { Objective2D, Vec } from '../types';
export const resolution = 96;
export function sampleSurface(o: Objective2D, n = resolution) {
  const raw: number[] = [];
  let min = Infinity,
    max = -Infinity;
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const f = o.value(
        new Float64Array([
          o.domain.x[0] + (i / n) * (o.domain.x[1] - o.domain.x[0]),
          o.domain.y[0] + (j / n) * (o.domain.y[1] - o.domain.y[0]),
        ]),
      );
      raw.push(f);
      min = Math.min(min, f);
      max = Math.max(max, f);
    }
  const scale = Math.max((max - min) * 0.015, 1e-8),
    denom = Math.log1p((max - min) / scale) || 1;
  const normalized = raw.map((f) => Math.log1p((f - min) / scale) / denom);
  const height = (theta: Vec) => {
    const f = o.value(new Float64Array(theta));
    return (Math.log1p(Math.max(0, f - min) / scale) / denom) * 2.8;
  };
  const world = (theta: Vec): [number, number, number] => [
    ((theta[0] - o.domain.x[0]) / (o.domain.x[1] - o.domain.x[0])) * 6 - 3,
    height(theta) + 0.045,
    3 - ((theta[1] - o.domain.y[0]) / (o.domain.y[1] - o.domain.y[0])) * 6,
  ];
  return { raw, normalized, min, max, height, world, n };
}
export function terrainColor(t: number): [number, number, number] {
  const stops = [
    [0.06, 0.23, 0.29],
    [0.08, 0.55, 0.59],
    [0.22, 0.68, 0.72],
    [0.35, 0.37, 0.72],
    [0.6, 0.43, 0.85],
    [0.77, 0.61, 0.96],
  ];
  const p = Math.max(0, Math.min(0.99999, t)) * (stops.length - 1),
    i = Math.floor(p),
    k = p - i;
  return stops[i].map((v, j) => v + (stops[i + 1][j] - v) * k) as [number, number, number];
}
export const inDomain = (o: Objective2D, t: Vec) =>
  t.every(Number.isFinite) &&
  t[0] >= o.domain.x[0] &&
  t[0] <= o.domain.x[1] &&
  t[1] >= o.domain.y[0] &&
  t[1] <= o.domain.y[1];
