import { describe, expect, it } from 'vitest';
import { classification, eigenvalues, objectives, objectiveById } from '../../src/math/objectives';
describe.each(objectives)('$name scientific contract', (o) => {
  const points = [o.initial, [0.37, -0.29], [-0.6, 0.8]];
  it.each(points)('analytic gradient agrees with central differences at (%s,%s)', (x, y) => {
    const p = new Float64Array([x, y]),
      g = o.gradient(p);
    for (let i = 0; i < 2; i++) {
      const h = 1e-5 * Math.max(1, Math.abs(p[i])),
        a = p.slice(),
        b = p.slice();
      a[i] += h;
      b[i] -= h;
      const fd = (o.value(a) - o.value(b)) / (2 * h);
      expect(Math.abs(g[i] - fd)).toBeLessThan(2e-5 * Math.max(1, Math.abs(g[i])));
    }
  });
  it.each(points)('analytic Hessian agrees with differentiated gradients at (%s,%s)', (x, y) => {
    const p = new Float64Array([x, y]),
      hessian = o.hessian(p);
    for (let i = 0; i < 2; i++) {
      const h = 1e-5,
        a = p.slice(),
        b = p.slice();
      a[i] += h;
      b[i] -= h;
      const ga = o.gradient(a),
        gb = o.gradient(b);
      for (let j = 0; j < 2; j++)
        expect(Math.abs(hessian[j][i] - (ga[j] - gb[j]) / (2 * h))).toBeLessThan(
          5e-5 * Math.max(1, Math.abs(hessian[j][i])),
        );
    }
    expect(hessian[0][1]).toBeCloseTo(hessian[1][0], 10);
  });
  it('has a finite initial state and approximate stationary declared critical points', () => {
    expect(Number.isFinite(o.value(new Float64Array(o.initial)))).toBe(true);
    for (const p of o.knownCriticalPoints) {
      expect(Math.hypot(...o.gradient(new Float64Array([p.x, p.y])))).toBeLessThan(0.002);
    }
  });
});
it('matches independent known values', () => {
  const fixtures: [string, number[], number][] = [
    ['quadratic', [1, 2], 5],
    ['elliptical', [1, 2], 81],
    ['rosenbrock', [0, 0], 1],
    ['rosenbrock', [1, 1], 0],
    ['himmelblau', [3, 2], 0],
    ['rastrigin', [0, 0], 0],
    ['beale', [3, 0.5], 0],
    ['saddle', [1, 2], -3],
    ['monkey', [1, 2], -11],
    ['doublewell', [1, 0], 0],
    ['noisy-quadratic', [1, 2], 5],
  ];
  for (const [id, p, value] of fixtures)
    expect(objectiveById(id).value(new Float64Array(p))).toBeCloseTo(value, 10);
});
it('classifies only stationary points and reports degeneracy', () => {
  expect(
    eigenvalues([
      [2, 0],
      [0, 40],
    ]),
  ).toEqual([2, 40]);
  expect(classification(0, [-2, 2])).toBe('Saddle point');
  expect(classification(0, [2, 40])).toBe('Local minimum');
  expect(classification(0, [-4, -2])).toBe('Local maximum');
  expect(classification(0, [0, 0])).toContain('Inconclusive');
  expect(classification(1, [2, 40])).toBe('Non-stationary point');
});
