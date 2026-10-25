import { expect, it } from 'vitest';
import { configSchema, parseExperiment } from '../../src/services/experiments';
import { defaultConfig, simulate } from '../../src/math/engine';
const experiment = {
  schemaVersion: 1,
  algorithmVersion: '1.0.0',
  id: 'test-id',
  name: 'Reproducible quadratic',
  createdAt: '2026-10-25T00:00:00.000Z',
  config: { ...defaultConfig, maxIterations: 5 },
  runs: [simulate({ ...defaultConfig, maxIterations: 5 }, 'gd')],
};
it('round-trips a versioned experiment', () =>
  expect(parseExperiment(JSON.stringify(experiment))).toEqual(experiment));
it('rejects unsupported versions, invalid parameters, and arbitrary algorithms', () => {
  for (const patch of [
    { schemaVersion: 2 },
    { config: { ...experiment.config, learningRate: -1 } },
    { config: { ...experiment.config, objective: 'eval(js)' } },
  ])
    expect(() => parseExperiment(JSON.stringify({ ...experiment, ...patch }))).toThrow();
  expect(configSchema.safeParse({ ...defaultConfig, algorithms: ['gd', 'gd'] }).success).toBe(false);
  expect(configSchema.safeParse({ ...defaultConfig, initial: [1e300, 0] }).success).toBe(false);
  expect(configSchema.safeParse({ ...defaultConfig, maxIterations: 10001 }).success).toBe(false);
});
it('rejects mismatched optimizer records and nonconsecutive steps', () => {
  expect(() =>
    parseExperiment(JSON.stringify({ ...experiment, runs: [{ ...experiment.runs[0], algorithm: 'adam' }] })),
  ).toThrow();
  const e = structuredClone(experiment);
  e.runs[0].history[1].step = 5;
  expect(() => parseExperiment(JSON.stringify(e))).toThrow();
});
it('caps import size before parsing', () =>
  expect(() => parseExperiment(' '.repeat(32_000_001))).toThrow('32 MB'));
