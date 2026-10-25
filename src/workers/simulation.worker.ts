import { createState, initialSample, isActive, optimizerStep } from '../math/engine';
import type { Config, OptimizerState, Run, WorkerRequest, WorkerResponse } from '../types';
let config: Config;
let states: OptimizerState[] = [];
let statuses: Run['status'][] = [];
let elapsed: number[] = [];
let id = 0;
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === 'reset') {
    config = request.config;
    id = request.runId;
    states = config.algorithms.map(() => createState(config));
    elapsed = states.map(() => 0);
    const runs = config.algorithms.map((algorithm, i) => {
      const recorded = request.restore?.[i];
      if (recorded) {
        const last = recorded.history.at(-1)!;
        states[i] = {
          theta: [...last.theta],
          m: [...last.moments.m],
          v: [...last.moments.v],
          t: last.step,
          rng: (config.seed + (algorithm === 'noisy' ? 0x6d2b79f5 * 2 * last.step : 0)) >>> 0,
          evaluations: { ...recorded.evaluations },
        };
        elapsed[i] = recorded.runtimeMs;
        return { ...recorded, history: [] };
      }
      const sample = initialSample(config);
      if (sample.status === 'ready' && algorithm !== 'noisy' && sample.gradNorm <= config.gradientTolerance)
        sample.status = 'gradient-tolerance';
      return {
        algorithm,
        history: [sample],
        status: sample.status,
        evaluations: states[i].evaluations,
        runtimeMs: 0,
      };
    });
    statuses = runs.map((r) => r.status);
    self.postMessage({ type: 'batch', runId: id, runs } satisfies WorkerResponse);
    return;
  }
  if (request.runId !== id) return;
  const runs = config.algorithms.map((algorithm, i) => {
    if (!isActive(statuses[i]))
      return {
        algorithm,
        history: [],
        status: statuses[i],
        evaluations: states[i].evaluations,
        runtimeMs: elapsed[i],
      };
    const history: Run['history'] = [];
    const begin = performance.now();
    for (let n = 0; n < Math.min(request.count, 100); n++) {
      if (!isActive(statuses[i])) break;
      const result = optimizerStep(algorithm, states[i], config);
      states[i] = result.state;
      statuses[i] = result.sample.status;
      if (result.sample.status === 'non-finite') break;
      result.sample.elapsed = elapsed[i] + performance.now() - begin;
      history.push(result.sample);
    }
    elapsed[i] += performance.now() - begin;
    return {
      algorithm,
      history,
      status: statuses[i],
      evaluations: states[i].evaluations,
      runtimeMs: elapsed[i],
    };
  });
  self.postMessage({ type: 'batch', runId: id, runs } satisfies WorkerResponse);
};
