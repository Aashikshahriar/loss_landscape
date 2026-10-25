import {
  ChevronDown,
  Crosshair,
  Dices,
  FlaskConical,
  Gauge,
  RotateCcw,
  Route,
  SlidersHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { useLab } from '../stores/lab';
import { algorithms, defaultConfig } from '../math/engine';
import { objectives, objectiveById } from '../math/objectives';
import type { Algorithm } from '../types';
import { NumberField } from './NumberField';
import { Tex } from './Tex';
export function Controls() {
  const { config: c, configure, setObjective, notify } = useLab();
  const [advanced, setAdvanced] = useState(false);
  const objective = objectiveById(c.objective);
  const toggle = (a: Algorithm) => {
    const has = c.algorithms.includes(a);
    if (has && c.algorithms.length === 1) return;
    if (!has && c.algorithms.length === 4) {
      notify('Compare up to four optimizers at a time.');
      return;
    }
    configure({ algorithms: has ? c.algorithms.filter((x) => x !== a) : [...c.algorithms, a] });
  };
  return (
    <aside className="controls panel" aria-label="Experiment controls">
      <div className="panel-label">
        <SlidersHorizontal size={15} /> Experiment setup
      </div>
      <section className="control-section">
        <div className="section-title">
          <span>
            <FlaskConical size={15} />
            Landscape
          </span>
          <span className="section-index">01</span>
        </div>
        <label className="field">
          <span>Objective function</span>
          <div className="select-wrap">
            <select value={c.objective} onChange={(e) => setObjective(e.target.value)}>
              {objectives.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
        </label>
        <div className="formula-mini">
          <Tex>{objective.tex}</Tex>
        </div>
        <p className="control-description">{objective.description}</p>
        <div className="domain-line">
          Domain <code>x [{objective.domain.x.join(', ')}]</code>
          <code>y [{objective.domain.y.join(', ')}]</code>
        </div>
      </section>
      <section className="control-section">
        <div className="section-title">
          <span>
            <Route size={15} />
            Optimizers
          </span>
          <span className="section-index">02</span>
        </div>
        <p className="microcopy">Select up to 4 to compare.</p>
        <div className="optimizer-options">
          {Object.entries(algorithms).map(([key, a]) => (
            <button
              key={key}
              className={'optimizer-option ' + (c.algorithms.includes(key as Algorithm) ? 'selected' : '')}
              onClick={() => toggle(key as Algorithm)}
              title={a.persona}
              aria-pressed={c.algorithms.includes(key as Algorithm)}
            >
              <span className="check-box">{c.algorithms.includes(key as Algorithm) ? '✓' : ''}</span>
              <i style={{ background: a.color }} />
              {a.name}
              {key === 'gd' && <span className="tag">GD</span>}
              {key === 'noisy' && <span className="tag">SIM</span>}
            </button>
          ))}
        </div>
      </section>
      <section className="control-section">
        <div className="section-title">
          <span>
            <Crosshair size={15} />
            Starting point
          </span>
          <span className="section-index">03</span>
        </div>
        <div className="two-fields">
          <NumberField
            label="x coordinate"
            min={-1e6}
            max={1e6}
            value={c.initial[0]}
            onChange={(x) => configure({ initial: [x, c.initial[1]] })}
          />
          <NumberField
            label="y coordinate"
            min={-1e6}
            max={1e6}
            value={c.initial[1]}
            onChange={(y) => configure({ initial: [c.initial[0], y] })}
          />
        </div>
        <button
          className="text-button random-button"
          onClick={() => {
            let n = (Math.imul(c.seed, 1664525) + 1013904223) >>> 0;
            const u = n / 4294967296;
            n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
            const v = n / 4294967296;
            configure({
              seed: n,
              initial: [
                objective.domain.x[0] + u * (objective.domain.x[1] - objective.domain.x[0]),
                objective.domain.y[0] + v * (objective.domain.y[1] - objective.domain.y[0]),
              ],
            });
          }}
        >
          <Dices size={14} />
          Seeded random point
        </button>
        <p className="microcopy">Or click anywhere on the landscape.</p>
      </section>
      <section className="control-section">
        <div className="section-title">
          <span>
            <Gauge size={15} />
            Hyperparameters
          </span>
          <span className="section-index">04</span>
        </div>
        <div className="two-fields">
          <NumberField
            label="Learning rate"
            hint="η"
            value={c.learningRate}
            min={1e-10}
            max={10}
            onChange={(learningRate) => configure({ learningRate })}
          />
          <NumberField
            label="Step budget"
            value={c.maxIterations}
            min={1}
            max={10000}
            step={100}
            onChange={(maxIterations) => configure({ maxIterations: Math.round(maxIterations) })}
          />
        </div>
        <label className="rate-slider">
          <span>
            <Tex>{String.raw`\log_{10}\eta`}</Tex>
            <b>{c.learningRate.toPrecision(3)}</b>
          </span>
          <input
            type="range"
            aria-label="Learning rate slider"
            min={-5}
            max={0.3}
            step={0.01}
            value={Math.log10(c.learningRate)}
            onChange={(e) =>
              configure({ learningRate: Number((10 ** Number(e.target.value)).toPrecision(3)) })
            }
          />
          <small>
            <span>gentle</span>
            <span>bold</span>
          </small>
        </label>
        <label className="field">
          <span>Learning rate schedule</span>
          <div className="select-wrap">
            <select
              value={c.schedule}
              onChange={(e) => configure({ schedule: e.target.value as typeof c.schedule })}
            >
              <option value="constant">Constant</option>
              <option value="exponential">Exponential decay</option>
              <option value="cosine">Cosine decay</option>
            </select>
            <ChevronDown size={14} />
          </div>
        </label>
        <button className="advanced-toggle" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}>
          Advanced parameters <ChevronDown size={14} className={advanced ? 'rotated' : ''} />
        </button>
        {advanced && (
          <div className="advanced-fields">
            <NumberField
              label="Momentum β"
              value={c.momentum}
              min={0}
              max={0.9999}
              onChange={(momentum) => configure({ momentum })}
            />
            <NumberField
              label="Adam β₁"
              value={c.beta1}
              min={0}
              max={0.9999}
              onChange={(beta1) => configure({ beta1 })}
            />
            <NumberField
              label="Adam β₂"
              value={c.beta2}
              min={0}
              max={0.99999}
              onChange={(beta2) => configure({ beta2 })}
            />
            <NumberField
              label="RMSProp ρ"
              value={c.rho}
              min={0}
              max={0.9999}
              onChange={(rho) => configure({ rho })}
            />
            <NumberField
              label="Epsilon ε"
              value={c.epsilon}
              min={1e-15}
              max={1}
              onChange={(epsilon) => configure({ epsilon })}
            />
            <NumberField
              label="Random seed"
              value={c.seed}
              min={0}
              max={4294967295}
              step={1}
              onChange={(seed) => configure({ seed: Math.floor(seed) })}
            />
            <NumberField
              label="Noise σ"
              value={c.noise}
              min={0}
              max={100}
              onChange={(noise) => configure({ noise })}
            />
            <NumberField
              label="Gradient tolerance"
              value={c.gradientTolerance}
              min={0}
              max={1}
              onChange={(gradientTolerance) => configure({ gradientTolerance })}
            />
            <NumberField
              label="Step tolerance"
              value={c.stepTolerance}
              min={0}
              max={1}
              onChange={(stepTolerance) => configure({ stepTolerance })}
            />
            <NumberField
              label="Loss-change tolerance (0 = off)"
              value={c.lossTolerance}
              min={0}
              max={1}
              onChange={(lossTolerance) => configure({ lossTolerance })}
            />
            <NumberField
              label="Clip gradient norm (0 = off)"
              value={c.clip}
              min={0}
              onChange={(clip) => configure({ clip })}
            />
            <NumberField
              label="Exponential decay γ"
              value={c.decay}
              min={0.0001}
              max={1}
              onChange={(decay) => configure({ decay })}
            />
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={c.stopAtDomain}
                onChange={(e) => configure({ stopAtDomain: e.target.checked })}
              />
              Stop on domain exit
            </label>
            <button
              className="text-button"
              onClick={() =>
                configure({
                  ...defaultConfig,
                  objective: c.objective,
                  initial: c.initial,
                  algorithms: c.algorithms,
                  learningRate: objective.rate,
                })
              }
            >
              <RotateCcw size={13} />
              Reset parameters
            </button>
          </div>
        )}
      </section>
      <div className="local-note">
        <span className="status-dot" />
        Computed locally. Yours to explore.
      </div>
    </aside>
  );
}
