import { algorithms } from './engine';
import type { Run, Sample, Vec } from '../types';
const n = (v: number) =>
  !Number.isFinite(v)
    ? 'non-finite'
    : Math.abs(v) >= 1000 || (Math.abs(v) < 0.001 && v !== 0)
      ? v.toExponential(2)
      : v.toFixed(3);
function terrain(e: Vec) {
  if (e[0] > 1e-7) return 'the ground curves upward in every direction, like the inside of a bowl';
  if (e[1] < -1e-7) return 'the ground curves downward in every direction, like the top of a hill';
  if (e[0] < -1e-7 && e[1] > 1e-7) return 'it is a saddle here: uphill one way, downhill the other';
  return 'the ground is almost flat in at least one direction, so curvature gives little guidance';
}
/** A short, plain-language account of what the selected recorded step means. */
export function narrate(run: Run, s: Sample, e: Vec): string {
  const who = algorithms[run.algorithm].name;
  const first = run.history[0];
  const prev = run.history[Math.max(0, s.step - 1)];
  if (run.status === 'non-finite' && s === run.history.at(-1))
    return `The stride was too ambitious. The next update overflowed to a non-finite number, so ${who} stopped at the last finite point. A smaller learning rate keeps the hiker on the map.`;
  if (s.step === 0)
    return `${who} stands at (${n(s.theta[0])}, ${n(s.theta[1])}), at height f = ${n(s.loss)}. The slope here has steepness ‖∇f‖ = ${n(s.gradNorm)}, and ${terrain(e)}. Press Run or take a single step to see which way it goes.`;
  const parts: string[] = [];
  const change = s.loss - prev.loss;
  if (change < 0)
    parts.push(
      `Step ${s.step}: ${who} moved ${n(s.updateNorm)} and the height fell by ${n(-change)} to f = ${n(s.loss)}.`,
    );
  else if (change > 0)
    parts.push(
      `Step ${s.step}: the height rose by ${n(change)} to f = ${n(s.loss)}. The stride overshot the low point and landed further up the far wall.`,
    );
  else parts.push(`Step ${s.step}: the height did not change; f = ${n(s.loss)}.`);
  const ratio = first.gradNorm > 0 ? s.gradNorm / first.gradNorm : 1;
  if (s.gradNorm < 1e-4) parts.push('The slope has all but vanished, so each new step will be tiny.');
  else if (ratio < 0.05) parts.push('The slope is gentle now, a small fraction of where the walk began.');
  else if (ratio > 3)
    parts.push('The slope is much steeper than at the start, which is a warning sign for a fixed stride.');
  parts.push(`Locally, ${terrain(e)}.`);
  const g = s.oracleGradient,
    u = s.update,
    gn = Math.hypot(...g),
    un = Math.hypot(...u);
  if (gn > 0 && un > 0 && run.algorithm !== 'gd') {
    const cos = Math.max(-1, Math.min(1, -(g[0] * u[0] + g[1] * u[1]) / (gn * un)));
    const angle = (Math.acos(cos) * 180) / Math.PI;
    if (angle > 8)
      parts.push(
        run.algorithm === 'noisy'
          ? `The jittery compass pointed ${angle.toFixed(0)}° away from true downhill.`
          : `Its memory bent this step ${angle.toFixed(0)}° away from steepest descent.`,
      );
  }
  if (s === run.history.at(-1) && run.status.includes('tolerance'))
    parts.push('A stopping tolerance was met. That is evidence of a flat spot, not proof of a minimum.');
  if (s === run.history.at(-1) && run.status === 'max-iterations')
    parts.push('The step budget is spent; the walk ends here, wherever here is.');
  return parts.join(' ');
}
