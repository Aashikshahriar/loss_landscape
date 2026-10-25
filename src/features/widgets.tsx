import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Tex } from '../components/Tex';
import { algorithms } from '../math/engine';
import { objectiveById } from '../math/objectives';
import type { Vec } from '../types';
const GD = algorithms.gd.color,
  MOM = algorithms.momentum.color;
const f3 = (n: number) =>
  Number.isFinite(n) ? (Math.abs(n) >= 1e4 ? n.toExponential(2) : n.toFixed(3)) : '∞';
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  display: React.ReactNode;
}) {
  return (
    <label className="w-slider">
      <span>
        {display}
        <b>{value}</b>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
/** Chapter 1: the directional derivative as a compass needle. */
export function CompassWidget() {
  const [angle, setAngle] = useState(135);
  const g: Vec = [1.5, 0.9],
    gn = Math.hypot(...g),
    rad = (angle * Math.PI) / 180,
    u: Vec = [Math.cos(rad), Math.sin(rad)],
    slope = g[0] * u[0] + g[1] * u[1];
  const c = 130,
    R = 86;
  const steepest = (Math.atan2(-g[1], -g[0]) * 180) / Math.PI;
  const tone = slope < -1e-9 ? 'down' : slope > 1e-9 ? 'up' : 'flat';
  return (
    <div className="widget">
      <div className="widget-body">
        <svg
          viewBox="0 0 260 260"
          className="w-svg compass"
          role="img"
          aria-label="Compass showing a walking direction and the gradient"
        >
          <circle cx={c} cy={c} r={R} className="w-ring" />
          <line
            x1={c - (g[1] / gn) * 110}
            y1={c - (g[0] / gn) * 110}
            x2={c + (g[1] / gn) * 110}
            y2={c + (g[0] / gn) * 110}
            className="w-level"
          />
          <text x={c + (g[1] / gn) * 96 + 4} y={c + (g[0] / gn) * 96 + 14} className="w-label">
            level line
          </text>
          <line x1={c} y1={c} x2={c + (g[0] / gn) * R} y2={c - (g[1] / gn) * R} className="w-grad" />
          <text x={c + (g[0] / gn) * R + 6} y={c - (g[1] / gn) * R - 4} className="w-label strong">
            ∇f
          </text>
          <line
            x1={c}
            y1={c}
            x2={c + u[0] * R}
            y2={c - u[1] * R}
            className={'w-dir ' + tone}
            strokeWidth="3.5"
          />
          <circle cx={c + u[0] * R} cy={c - u[1] * R} r="6" className={'w-dir-dot ' + tone} />
          <circle cx={c} cy={c} r="5" className="w-hiker" />
        </svg>
        <div className="widget-side">
          <Slider
            label="Walking direction in degrees"
            value={angle}
            min={0}
            max={359}
            step={1}
            onChange={setAngle}
            display={<span>Walking direction (degrees)</span>}
          />
          <div className={'w-readout ' + tone}>
            <Tex>{String.raw`D_u f = \nabla f \cdot u = ${slope.toFixed(3)}`}</Tex>
            <p>
              {tone === 'down'
                ? `Walking this way, the ground falls at ${(-slope).toFixed(2)} per unit step.`
                : tone === 'up'
                  ? `This way is uphill: the ground rises at ${slope.toFixed(2)} per unit step.`
                  : 'You are walking along the level line: neither up nor down.'}
            </p>
          </div>
          <div className="w-meter" aria-hidden="true">
            <i style={{ left: `${50 + (slope / gn) * 50}%` }} />
            <span>−‖∇f‖ = {(-gn).toFixed(2)}</span>
            <span>+‖∇f‖</span>
          </div>
          <button className="text-button" onClick={() => setAngle(Math.round((steepest + 360) % 360))}>
            Point straight downhill
          </button>
        </div>
      </div>
    </div>
  );
}
/** Chapter 2: gradient descent on f(x) = x², where each step multiplies x by (1 − 2η). */
export function StrideWidget() {
  const [eta, setEta] = useState(0.15);
  const r = 1 - 2 * eta,
    x0 = 2.4;
  const xs = Array.from({ length: 14 }, (_, t) => x0 * r ** t);
  const W = 520,
    H = 230,
    X = (x: number) => W / 2 + (x / 3.2) * (W / 2 - 16),
    Y = (x: number) => H - 22 - (Math.min(x * x, 11) / 11) * (H - 40);
  const curve = Array.from({ length: 101 }, (_, i) => {
    const x = -3.2 + (i / 100) * 6.4;
    return (i ? 'L' : 'M') + X(x) + ',' + Y(x);
  }).join('');
  const visible = xs.filter((x) => Math.abs(x) <= 3.2);
  const verdict =
    Math.abs(r) < 1 - 1e-9
      ? r < 0
        ? 'It converges, but by hopping from wall to wall.'
        : 'It converges smoothly toward the bottom.'
      : Math.abs(Math.abs(r) - 1) < 1e-9
        ? r === 1
          ? 'No movement at all.'
          : 'A perfect bounce: it oscillates forever between ±x₀.'
        : 'Every stride lands higher than the last. It diverges.';
  return (
    <div className="widget">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-svg"
        role="img"
        aria-label="Iterates of gradient descent on a parabola"
      >
        <line x1="10" x2={W - 10} y1={H - 22} y2={H - 22} className="w-axis" />
        <path d={curve} className="w-curve" />
        <path
          d={visible.map((x, i) => (i ? 'L' : 'M') + X(x) + ',' + Y(x)).join('')}
          className="w-path"
          style={{ stroke: GD }}
        />
        {visible.map((x, i) => (
          <circle key={i} cx={X(x)} cy={Y(x)} r={i ? 4 : 6} style={{ fill: GD, opacity: 1 - i * 0.05 }} />
        ))}
        <text x={X(x0)} y={Y(x0) - 12} className="w-label strong" textAnchor="middle">
          x₀
        </text>
      </svg>
      <div className="widget-controls">
        <Slider
          label="Learning rate eta"
          value={eta}
          min={0.01}
          max={1.1}
          step={0.01}
          onChange={setEta}
          display={<Tex>\eta</Tex>}
        />
        <div className={'w-readout ' + (Math.abs(r) < 1 ? 'down' : 'up')}>
          <Tex>{String.raw`x_t = (1-2\eta)^t\,x_0 = (${r.toFixed(2)})^t\,x_0`}</Tex>
          <p>{verdict}</p>
        </div>
      </div>
    </div>
  );
}
function valleyPath(kappa: number, eta: number, beta: number | null, start: Vec, n = 400) {
  let [x, y] = start,
    vx = 0,
    vy = 0;
  const pts: Vec[] = [[x, y]];
  let reached = -1;
  for (let t = 1; t <= n; t++) {
    const gx = 2 * x,
      gy = 2 * kappa * y;
    if (beta === null) {
      x -= eta * gx;
      y -= eta * gy;
    } else {
      vx = beta * vx + gx;
      vy = beta * vy + gy;
      x -= eta * vx;
      y -= eta * vy;
    }
    if (!Number.isFinite(x + y) || Math.abs(x) + Math.abs(y) > 1e6) break;
    pts.push([x, y]);
    if (reached < 0 && x * x + kappa * y * y < 1e-3) reached = t;
  }
  return { pts, reached };
}
/** Chapters 3 and 4: an elongated bowl f = x² + κy², optionally with heavy-ball momentum. */
export function ValleyWidget({ momentum = false }: { momentum?: boolean }) {
  const [kappa, setKappa] = useState(20),
    [eta, setEta] = useState(0.045),
    [beta, setBeta] = useState(0.8);
  const start: Vec = [-3.6, 1.5];
  const gd = useMemo(() => valleyPath(kappa, eta, null, start), [kappa, eta]);
  const mom = useMemo(
    () => (momentum ? valleyPath(kappa, eta, beta, start) : null),
    [kappa, eta, beta, momentum],
  );
  const W = 520,
    H = 260,
    X = (x: number) => W / 2 + (x / 4) * (W / 2 - 10),
    Y = (y: number) => H / 2 - (y / 2) * (H / 2 - 10);
  const levels = [0.3, 1, 2.5, 5, 9, 14, 20];
  const path = (pts: Vec[]) =>
    pts
      .slice(0, 120)
      .filter((p) => Math.abs(p[0]) < 6 && Math.abs(p[1]) < 4)
      .map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1))
      .join('');
  const say = (r: number) => (r < 0 ? 'not within 400 steps' : `${r} steps`);
  return (
    <div className="widget">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-svg valley"
        role="img"
        aria-label="Contour lines of an elongated bowl with optimizer paths"
      >
        <defs>
          <clipPath id={'valley-clip' + (momentum ? 'm' : '')}>
            <rect x="0" y="0" width={W} height={H} rx="10" />
          </clipPath>
        </defs>
        <g clipPath={`url(#valley-clip${momentum ? 'm' : ''})`}>
          {levels.map((c) => (
            <ellipse
              key={c}
              cx={X(0)}
              cy={Y(0)}
              rx={(Math.sqrt(c) / 4) * (W / 2 - 10)}
              ry={(Math.sqrt(c / kappa) / 2) * (H / 2 - 10)}
              className="w-level"
            />
          ))}
          <path d={path(gd.pts)} className="w-path" style={{ stroke: GD }} />
          {mom && <path d={path(mom.pts)} className="w-path" style={{ stroke: MOM }} />}
          <circle cx={X(start[0])} cy={Y(start[1])} r="5" className="w-hiker" />
          <circle cx={X(0)} cy={Y(0)} r="3.5" className="w-goal" />
        </g>
      </svg>
      <div className="widget-controls">
        <Slider
          label="Curvature ratio kappa"
          value={kappa}
          min={1}
          max={40}
          step={1}
          onChange={setKappa}
          display={<Tex>\kappa</Tex>}
        />
        <Slider
          label="Learning rate eta"
          value={eta}
          min={0.005}
          max={0.12}
          step={0.001}
          onChange={setEta}
          display={<Tex>\eta</Tex>}
        />
        {momentum && (
          <Slider
            label="Momentum beta"
            value={beta}
            min={0}
            max={0.98}
            step={0.01}
            onChange={setBeta}
            display={<Tex>\beta</Tex>}
          />
        )}
        <div className={'w-readout ' + (eta < 1 / kappa ? 'down' : 'up')}>
          <Tex>{String.raw`\text{GD is stable when } \eta < \tfrac{1}{\kappa} = ${(1 / kappa).toFixed(3)}`}</Tex>
          <p>
            <i className="dot" style={{ background: GD }} /> Gradient descent reaches the bottom in{' '}
            {say(gd.reached)}.
            {mom && (
              <>
                <br />
                <i className="dot" style={{ background: MOM }} /> Momentum reaches it in {say(mom.reached)}.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
/** Chapter 5: escaping the saddle of f = x² − y². */
export function SaddleWidget() {
  const [y0, setY0] = useState(0.01);
  const eta = 0.1,
    W = 520,
    H = 260,
    S = 5,
    k = (H / 2 - 10) / 2.2,
    X = (x: number) => W / 2 + x * k,
    Y = (y: number) => H / 2 - y * k;
  const pts: Vec[] = [];
  let x = 2.2,
    y = y0,
    escape = -1;
  for (let t = 0; t < 80; t++) {
    pts.push([x, y]);
    if (escape < 0 && Math.abs(y) > 2) escape = t;
    x *= 1 - 2 * eta;
    y *= 1 + 2 * eta;
  }
  const levels = [-3, -1.5, -0.5, 0.5, 1.5, 3];
  const hyperbola = (c: number) => {
    const out: string[] = [];
    for (const sign of [-1, 1]) {
      const seg = Array.from({ length: 61 }, (_, i) => {
        const s = -S + (i / 60) * 2 * S;
        const p: Vec = c > 0 ? [sign * Math.sqrt(c + s * s), s] : [s, sign * Math.sqrt(s * s - c)];
        return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1);
      });
      out.push(seg.join(''));
    }
    return out.join('');
  };
  return (
    <div className="widget">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-svg"
        role="img"
        aria-label="Contour lines of a saddle with a gradient descent path"
      >
        <defs>
          <clipPath id="saddle-clip">
            <rect x="0" y="0" width={W} height={H} rx="10" />
          </clipPath>
        </defs>
        <g clipPath="url(#saddle-clip)">
          {levels.map((c) => (
            <path key={c} d={hyperbola(c)} className={'w-level ' + (c < 0 ? 'neg' : '')} />
          ))}
          <path
            d={pts
              .filter((p) => Math.abs(p[1]) < 3)
              .map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1))
              .join('')}
            className="w-path"
            style={{ stroke: GD }}
          />
          <circle cx={X(2.2)} cy={Y(y0)} r="5" className="w-hiker" />
          <circle cx={X(0)} cy={Y(0)} r="4" className="w-saddle" />
          <text x={X(0) + 8} y={Y(0) - 8} className="w-label">
            saddle
          </text>
        </g>
      </svg>
      <div className="widget-controls">
        <Slider
          label="Starting y offset"
          value={y0}
          min={0}
          max={0.3}
          step={0.001}
          onChange={setY0}
          display={<Tex>y_0</Tex>}
        />
        <div className={'w-readout ' + (escape >= 0 ? 'down' : 'up')}>
          <Tex>{String.raw`y_t = (1+2\eta)^t\,y_0 = 1.2^t \cdot ${y0}`}</Tex>
          <p>
            {y0 === 0
              ? 'Exactly on the ridge line, y stays zero forever. The hiker slides into the saddle and stops: zero gradient, but no minimum.'
              : escape >= 0
                ? `The tiny offset grows by 20% each step. After ${escape} steps the hiker has slipped off the pass and is still falling.`
                : 'The offset is growing, but has not escaped within 80 steps.'}
          </p>
        </div>
      </div>
    </div>
  );
}
const basinColors = ['#7c6cf2', '#0fa896', '#e8892b', '#2f86e8'];
/** Chapter 6: a basin-of-attraction map for gradient descent on Himmelblau's function. */
export function BasinWidget() {
  const o = objectiveById('himmelblau'),
    minima = o.knownCriticalPoints,
    canvas = useRef<HTMLCanvasElement>(null),
    [start, setStart] = useState<Vec>([-0.6, -0.4]);
  const eta = 0.01,
    N = 120;
  const run = (p: Vec, steps: number) => {
    const t = new Float64Array(p),
      pts: Vec[] = [[t[0], t[1]]];
    for (let k = 0; k < steps; k++) {
      const g = o.gradient(t);
      t[0] -= eta * g[0];
      t[1] -= eta * g[1];
      if (!Number.isFinite(t[0] + t[1]) || Math.abs(t[0]) > 50 || Math.abs(t[1]) > 50)
        return { pts, basin: -1 };
      pts.push([t[0], t[1]]);
      if (g[0] * g[0] + g[1] * g[1] < 1e-8) break;
    }
    const end = pts.at(-1)!;
    const basin = minima.findIndex((m) => Math.hypot(m.x - end[0], m.y - end[1]) < 0.15);
    return { pts, basin };
  };
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    const image = ctx.createImageData(N, N),
      rgb = basinColors.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const { basin } = run([-5 + ((i + 0.5) / N) * 10, 5 - ((j + 0.5) / N) * 10], 300);
        const c = basin < 0 ? [128, 128, 128] : rgb[basin],
          k = (j * N + i) * 4;
        image.data.set([c[0], c[1], c[2], 255], k);
      }
    ctx.putImageData(image, 0, 0);
  }, []);
  const trace = useMemo(() => run(start, 600), [start]);
  const P = (p: Vec) => [((p[0] + 5) / 10) * 300, ((5 - p[1]) / 10) * 300];
  return (
    <div className="widget">
      <div className="widget-body">
        <div className="basin-stage">
          <canvas ref={canvas} width={N} height={N} aria-hidden="true" />
          <svg
            viewBox="0 0 300 300"
            className="w-svg basin"
            role="img"
            aria-label="Basin map. Click to start gradient descent from a point."
            onClick={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              setStart([
                -5 + ((e.clientX - box.left) / box.width) * 10,
                5 - ((e.clientY - box.top) / box.height) * 10,
              ]);
            }}
          >
            <path
              d={trace.pts
                .filter((p) => Math.abs(p[0]) <= 5 && Math.abs(p[1]) <= 5)
                .map(
                  (p, i) =>
                    (i ? 'L' : 'M') +
                    P(p)
                      .map((v) => v.toFixed(1))
                      .join(','),
                )
                .join('')}
              className="w-path on-map"
            />
            {minima.map((m, i) => (
              <circle key={i} cx={P([m.x, m.y])[0]} cy={P([m.x, m.y])[1]} r="5" className="w-min" />
            ))}
            <circle cx={P(start)[0]} cy={P(start)[1]} r="5.5" className="w-hiker on-map" />
          </svg>
        </div>
        <div className="widget-side">
          <p className="w-hint">Click anywhere on the map to drop a hiker there.</p>
          <div className={'w-readout ' + (trace.basin >= 0 ? 'down' : 'up')}>
            <Tex>{String.raw`\theta_0 = (${start[0].toFixed(2)},\ ${start[1].toFixed(2)})`}</Tex>
            <p>
              {trace.basin >= 0 ? (
                <>
                  <i className="dot" style={{ background: basinColors[trace.basin] }} /> It settles in the
                  valley at ({f3(minima[trace.basin].x)}, {f3(minima[trace.basin].y)}). Every point of this
                  color ends there too.
                </>
              ) : (
                'From here the walk does not settle in a minimum within the step budget.'
              )}
            </p>
          </div>
          <button className="text-button" onClick={() => setStart([-0.6, -0.4])}>
            <RotateCcw size={13} /> Back to the centre
          </button>
        </div>
      </div>
    </div>
  );
}
