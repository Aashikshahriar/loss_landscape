import { ArrowRight, BookOpen, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useLab } from '../stores/lab';
import { algorithms } from '../math/engine';
import { objectives } from '../math/objectives';
import type { Algorithm, Vec } from '../types';
const lessons: {
  title: string;
  question: string;
  text: string;
  objective: string;
  rate: number;
  initial: Vec;
  algorithms: Algorithm[];
}[] = [
  {
    title: 'The local direction of descent',
    question: 'Why does −∇f point downhill?',
    text: 'The directional derivative along a unit vector u is ∇f · u. Its smallest value is −‖∇f‖, attained at u = −∇f/‖∇f‖. This is a local statement in Euclidean geometry; a large finite step can still increase loss.',
    objective: 'quadratic',
    rate: 0.08,
    initial: [-3, 2.5],
    algorithms: ['gd'],
  },
  {
    title: 'A learning rate has consequences',
    question: 'What happens when the step is too large?',
    text: 'For f = x² + y², GD multiplies both coordinates by (1 − 2η). When 0 < η < 1 the iterates converge to zero. At η = 1 they oscillate, and for η > 1 they grow. Try η = 0.05, 0.8, then 1.01.',
    objective: 'quadratic',
    rate: 0.8,
    initial: [-2, 2],
    algorithms: ['gd'],
  },
  {
    title: 'The narrow valley problem',
    question: 'Why does the trajectory zig-zag?',
    text: 'In the elliptical quadratic, the y curvature is 20 times the x curvature. A rate conservative enough for the steep direction makes slow progress along the shallow direction. The Hessian eigenvalues describe this local scaling.',
    objective: 'elliptical',
    rate: 0.045,
    initial: [-3, 2.5],
    algorithms: ['gd'],
  },
  {
    title: 'Momentum remembers',
    question: 'Can past gradients help in a valley?',
    text: 'Heavy-ball momentum accumulates vₜ₊₁ = βvₜ + gₜ, then updates θ by −ηvₜ₊₁. This convention has no (1 − β) factor in the velocity. It can accelerate progress, overshoot, or destabilize a run; the learning rate still matters.',
    objective: 'elliptical',
    rate: 0.035,
    initial: [-3, 2.5],
    algorithms: ['gd', 'momentum'],
  },
  {
    title: 'A stationary point can be a trap',
    question: 'Does zero gradient imply a minimum?',
    text: 'At the origin of x² − y², the gradient is zero but the Hessian has eigenvalues −2 and 2. It is a saddle. Starting exactly there stops deterministic first-order updates. Try y = 0.01 to see the unstable direction.',
    objective: 'saddle',
    rate: 0.04,
    initial: [0, 0],
    algorithms: ['gd'],
  },
  {
    title: 'The starting point changes the story',
    question: 'Which of four minima will you find?',
    text: 'Himmelblau has four global minima of equal value. Descent may settle in different basins as initialization and parameters change. Click a new starting point and reset; a single run does not characterize the whole landscape.',
    objective: 'himmelblau',
    rate: 0.005,
    initial: [-3.6, 0],
    algorithms: ['gd'],
  },
  {
    title: 'Adaptive scaling, coordinate by coordinate',
    question: 'Why do Adam and GD move differently?',
    text: 'Adam bias-corrects exponential averages of gradients and squared gradients. RMSProp scales by a running second moment. The resulting update need not align with the negative gradient. Equal numerical learning rates do not mean equal step lengths.',
    objective: 'elliptical',
    rate: 0.035,
    initial: [-3, 2.5],
    algorithms: ['gd', 'adam', 'rmsprop'],
  },
  {
    title: 'An honest experiment with noise',
    question: 'Can you reproduce a noisy trajectory?',
    text: 'Noisy gradient adds independent, seeded, zero-mean uniform perturbations with standard deviation σ to each gradient coordinate. Resetting the same configuration replays the same path. This is a noise simulation; there are no samples or minibatches.',
    objective: 'noisy-quadratic',
    rate: 0.08,
    initial: [-3, 2.5],
    algorithms: ['gd', 'noisy'],
  },
  {
    title: 'A small gradient is finite evidence',
    question: 'Have you found the global minimum?',
    text: 'Rastrigin has many local minima. A gradient-tolerance stop only reports a small analytic gradient at the final point. It does not certify even a local minimum without more information, and certainly does not prove global optimality.',
    objective: 'rastrigin',
    rate: 0.003,
    initial: [-3.2, 2.8],
    algorithms: ['gd'],
  },
  {
    title: 'What a 2D slice cannot show',
    question: 'Could this represent a neural network?',
    text: 'These built-in surfaces are analytic two-variable objectives, not neural-network losses. A true neural slice evaluates L(w* + αd₁ + βd₂) in a parameter space with many dimensions. A projected training trajectory generally leaves that plane. Neural-network training and slices are planned, not implemented.',
    objective: 'rosenbrock',
    rate: 0.002,
    initial: [-1.4, 1.6],
    algorithms: ['gd'],
  },
];
export function Lessons() {
  const [selected, setSelected] = useState(0);
  const lesson = lessons[selected];
  const load = () => {
    useLab.getState().setObjective(lesson.objective);
    useLab
      .getState()
      .configure({ initial: lesson.initial, algorithms: lesson.algorithms, learningRate: lesson.rate });
    location.hash = '/lab';
  };
  return (
    <main className="content-page">
      <div className="eyebrow">
        <BookOpen size={14} /> FIELD NOTES
      </div>
      <h1>A little intuition goes a long way.</h1>
      <p className="page-description">Ten small experiments. A closer look at how optimization works.</p>
      <div className="lesson-layout">
        <nav aria-label="Lessons">
          {lessons.map((l, i) => (
            <button key={l.title} className={i === selected ? 'active' : ''} onClick={() => setSelected(i)}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              {l.title}
            </button>
          ))}
        </nav>
        <article className="lesson-card panel">
          <div className="eyebrow">EXPERIMENT {String(selected + 1).padStart(2, '0')}</div>
          <h2>{lesson.title}</h2>
          <h3>{lesson.question}</h3>
          <p>{lesson.text}</p>
          <div className="lesson-config">
            <span>
              LANDSCAPE <b>{objectives.find((o) => o.id === lesson.objective)?.name}</b>
            </span>
            <span>
              LEARNING RATE <b>{lesson.rate}</b>
            </span>
            <span>
              START <b>({lesson.initial.join(', ')})</b>
            </span>
          </div>
          <button className="button primary" onClick={load}>
            Open this experiment <ArrowRight size={15} />
          </button>
          <button className="text-button lesson-reset" onClick={load}>
            <RotateCcw size={13} />
            Reset scenario in lab
          </button>
        </article>
      </div>
      <section className="math-reference panel">
        <h2>The rules behind the paths</h2>
        <p>
          gₜ is evaluated at θₜ. Step 0 is the initial state; the first update produces θ₁. RMSProp and Adam
          apply all squares, square roots, and divisions elementwise. Epsilon is outside the square root.
        </p>
        {Object.entries(algorithms).map(([id, a]) => (
          <div key={id}>
            <h3>
              <i className="legend-dot" style={{ background: a.color }} />
              {a.name}
            </h3>
            <code>{a.equation}</code>
            {id === 'adam' && <p>mₜ₊₁ = β₁mₜ + (1 − β₁)gₜ; vₜ₊₁ = β₂vₜ + (1 − β₂)gₜ². Both start at zero.</p>}
          </div>
        ))}
        <p>
          References:{' '}
          <a href="https://arxiv.org/abs/1412.6980" target="_blank" rel="noreferrer">
            Kingma & Ba, Adam (2014)
          </a>{' '}
          ·{' '}
          <a href="https://www.sfu.ca/~ssurjano/optimization.html" target="_blank" rel="noreferrer">
            SFU optimization test functions
          </a>
        </p>
      </section>
    </main>
  );
}
