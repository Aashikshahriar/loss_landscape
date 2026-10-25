import { ArrowRight, BookOpen, Lightbulb } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useLab } from '../stores/lab';
import { algorithms } from '../math/engine';
import { objectives } from '../math/objectives';
import { Prose, Tex } from '../components/Tex';
import { BasinWidget, CompassWidget, SaddleWidget, StrideWidget, ValleyWidget } from './widgets';
import type { Algorithm, Vec } from '../types';
const r = String.raw;
interface Chapter {
  id: string;
  title: string;
  question: string;
  story: string[];
  equation?: string;
  widget?: ReactNode;
  takeaway: string;
  objective: string;
  rate: number;
  initial: Vec;
  algorithms: Algorithm[];
}
const chapters: Chapter[] = [
  {
    id: 'fog',
    title: 'Lost in the fog',
    question: 'Why does the negative gradient point downhill?',
    story: [
      r`Imagine you are standing on a hillside at night, wrapped in fog. You cannot see the valley, only the ground under your boots. Your position is a pair of numbers $\theta = (x, y)$ and the height of the ground is $f(\theta)$.`,
      r`Pick a direction to walk, a unit vector $u$. How fast does the ground drop if you go that way? Calculus answers with the **directional derivative**, and it turns out to be a dot product with the gradient:`,
      r`$$D_u f(\theta) = \nabla f(\theta)\cdot u = \lVert \nabla f(\theta)\rVert \cos\varphi$$`,
      r`Here $\varphi$ is the angle between your direction and the gradient. The cosine is smallest, $-1$, when you face exactly away from $\nabla f$. So the steepest way down is $u = -\nabla f / \lVert\nabla f\rVert$. Turn the compass below and watch the slope change.`,
    ],
    widget: <CompassWidget />,
    takeaway:
      'The gradient is a local compass. It tells you which way is steepest right here, not where the valley is. A long stride can still land you higher than you started.',
    objective: 'quadratic',
    rate: 0.08,
    initial: [-3, 2.5],
    algorithms: ['gd'],
  },
  {
    id: 'stride',
    title: 'How long should a stride be?',
    question: 'What happens when the learning rate is too large?',
    story: [
      r`Knowing the direction is half the story; the other half is how far to walk before checking the compass again. That distance is set by the **learning rate** $\eta$.`,
      r`Take the simplest valley there is, $f(x) = x^2$. Its slope is $f'(x) = 2x$, so one step of gradient descent is $x_{t+1} = x_t - \eta\cdot 2x_t = (1-2\eta)\,x_t$. Every step multiplies your position by the same number.`,
      r`If $|1-2\eta| < 1$, the multiplier shrinks you toward zero. At $\eta = 1$ it is exactly $-1$: you bounce between the walls forever. Beyond that, every bounce is bigger than the last. Slide $\eta$ past $0.5$, then past $1$, and watch the story change.`,
    ],
    widget: <StrideWidget />,
    takeaway:
      'Too small and the walk takes forever; too large and it never arrives. On a bowl, the safe range depends on how sharply the ground curves.',
    objective: 'quadratic',
    rate: 0.8,
    initial: [-2, 2],
    algorithms: ['gd'],
  },
  {
    id: 'canyon',
    title: 'The canyon that fights back',
    question: 'Why does gradient descent zig-zag?',
    story: [
      r`Real landscapes are rarely round bowls. Consider $f(x,y) = x^2 + \kappa y^2$: a canyon whose walls (the $y$ direction) are $\kappa$ times steeper than its floor (the $x$ direction).`,
      r`The steep walls force a small stride: stability needs $\eta < 1/\kappa$. But along the gentle floor, that same tiny stride barely makes progress. The hiker ricochets from wall to wall while creeping along the canyon. The ratio of the steepest to the gentlest curvature, the **condition number**, is exactly $\kappa$ here.`,
      r`$$H = \begin{pmatrix} 2 & 0 \\ 0 & 2\kappa \end{pmatrix}, \qquad \frac{\lambda_{\max}}{\lambda_{\min}} = \kappa$$`,
    ],
    widget: <ValleyWidget />,
    takeaway:
      'Curvature sets the speed limit. When curvatures disagree strongly across directions, one stride size cannot suit them all.',
    objective: 'elliptical',
    rate: 0.045,
    initial: [-3, 2.5],
    algorithms: ['gd'],
  },
  {
    id: 'momentum',
    title: 'Borrowing speed from the past',
    question: 'Can remembering old gradients help?',
    story: [
      r`What if our hiker were a heavy ball instead? A ball does not forget which way it was rolling. Heavy-ball **momentum** keeps a running velocity $v$:`,
      r`$$v_{t+1} = \beta\,v_t + \nabla f(\theta_t), \qquad \theta_{t+1} = \theta_t - \eta\,v_{t+1}$$`,
      r`In the canyon, the side-to-side pushes alternate in sign and partly cancel inside $v$, while the push along the floor always points the same way and keeps accumulating. With $\beta = 0.9$, a steady gradient builds a velocity up to $1/(1-\beta) = 10$ times larger.`,
      r`Push $\beta$ toward $1$ and the ball starts to overshoot and orbit. Memory helps, until it does not.`,
    ],
    widget: <ValleyWidget momentum />,
    takeaway:
      'Momentum averages out oscillation and accelerates consistent directions, but it adds inertia that can overshoot. This convention has no (1 − β) factor in the velocity.',
    objective: 'elliptical',
    rate: 0.035,
    initial: [-3, 2.5],
    algorithms: ['gd', 'momentum'],
  },
  {
    id: 'saddle',
    title: 'Flat ground that lies',
    question: 'Does a zero gradient mean you have arrived?',
    story: [
      r`At the centre of a mountain pass the ground is perfectly level: $\nabla f = 0$. Yet it is not a valley. For $f(x,y) = x^2 - y^2$ the land rises along $x$ and falls along $y$. The Hessian has one positive and one negative eigenvalue, $+2$ and $-2$, which is the signature of a **saddle point**.`,
      r`Gradient descent shrinks $x$ by $(1-2\eta)$ each step and grows $y$ by $(1+2\eta)$. Start exactly on the line $y=0$ and you slide straight into the pass and stop. Start a hair away and that hair grows exponentially until you tumble off.`,
    ],
    widget: <SaddleWidget />,
    takeaway:
      'A stationary point can be a trap. Curvature, the signs of the Hessian eigenvalues, tells minima, maxima and saddles apart, when it is not degenerate.',
    objective: 'saddle',
    rate: 0.04,
    initial: [1.6, 0.01],
    algorithms: ['gd'],
  },
  {
    id: 'basins',
    title: 'Where you start is where you end',
    question: 'Which of four valleys will you find?',
    story: [
      r`Himmelblau's function has four valleys, all exactly as deep as one another: $f = 0$ at each. Drop a hiker and gradient descent will deliver them to one of the four. Which one depends only on where they started.`,
      r`The set of starting points that flow to the same valley is its **basin of attraction**. The map below was computed by running gradient descent from every pixel and colouring it by its destination. Look at how the borders twist: two nearly identical starts can end worlds apart.`,
    ],
    widget: <BasinWidget />,
    takeaway:
      'A single run describes one path, not the whole landscape. To understand a terrain, try many starts.',
    objective: 'himmelblau',
    rate: 0.005,
    initial: [-3.6, 0],
    algorithms: ['gd'],
  },
  {
    id: 'adaptive',
    title: 'A stride for every direction',
    question: 'Why do Adam and gradient descent take different paths?',
    story: [
      r`Back in the canyon, the real problem was that one stride length had to serve two very different directions. **RMSProp** gives each coordinate its own stride by dividing by a running average of recent squared slopes:`,
      r`$$s_{t+1} = \rho\, s_t + (1-\rho)\, g_t^2, \qquad \theta_{t+1} = \theta_t - \frac{\eta\, g_t}{\sqrt{s_{t+1}} + \varepsilon}$$`,
      r`Where the walls are steep, $s$ is large and the stride shrinks; along the gentle floor, $s$ is small and the stride grows. **Adam** combines this with momentum, and corrects both averages for starting at zero, dividing by $1-\beta^t$.`,
      r`One consequence surprises people: the update no longer points along $-\nabla f$. Equal learning rates do not mean equal step lengths. Open the lab and the narrator will tell you how many degrees each step bends.`,
    ],
    equation: algorithms.adam.tex,
    takeaway:
      'Adaptive methods rescale each coordinate separately. That often helps in badly scaled valleys, but it changes the geometry of the path.',
    objective: 'elliptical',
    rate: 0.035,
    initial: [-3, 2.5],
    algorithms: ['gd', 'adam', 'rmsprop'],
  },
  {
    id: 'noise',
    title: 'Walking with a shaky compass',
    question: 'What does noise do, and can you reproduce it?',
    story: [
      r`In practice the compass is rarely exact. Here we simulate that honestly: every gradient coordinate gets a seeded, zero-mean random kick with standard deviation $\sigma$.`,
      r`$$\theta_{t+1} = \theta_t - \eta\big[\nabla f(\theta_t) + \sigma\,\xi_t\big], \qquad \xi_i \sim \mathcal{U}(-\sqrt{3},\sqrt{3})$$`,
      r`Far from the minimum, the true slope dominates and the walk looks purposeful. Near the bottom, the slope fades but the noise does not, so the hiker jitters around the minimum instead of settling. Because the noise is seeded, resetting the same configuration replays exactly the same wobble.`,
    ],
    takeaway:
      'This is a noise simulation, not minibatch SGD: there are no data samples. But the qualitative story is the same.',
    objective: 'noisy-quadratic',
    rate: 0.08,
    initial: [-3, 2.5],
    algorithms: ['gd', 'noisy'],
  },
  {
    id: 'summit',
    title: 'A gentle slope is not a summit',
    question: 'Have you found the global minimum?',
    story: [
      r`Rastrigin's function is an egg crate: a gentle bowl $x^2 + y^2$ with ripples $-10\cos(2\pi x)$ carved into it. There are dozens of little dimples, and only one at the origin is the true bottom.`,
      r`Gradient descent will happily settle in the nearest dimple and report a tiny gradient. That is a true statement about where it stopped, and nothing more. A small $\lVert\nabla f\rVert$ does not certify even a local minimum by itself, and it says nothing about the global one.`,
    ],
    takeaway:
      'Stopping rules are evidence, not proof. The lab labels every stop with its reason for exactly this reason.',
    objective: 'rastrigin',
    rate: 0.003,
    initial: [-3.2, 2.8],
    algorithms: ['gd'],
  },
  {
    id: 'slices',
    title: 'What a flat map cannot show',
    question: 'Could these landscapes be a neural network?',
    story: [
      r`Every landscape here has two inputs so that we can draw it. A neural network has millions. People often visualize one by slicing it: pick a trained point $w^\ast$ and two directions $d_1, d_2$, then plot`,
      r`$$L(\alpha, \beta) = L\big(w^\ast + \alpha\, d_1 + \beta\, d_2\big)$$`,
      r`That picture is real, but it is one plane through an enormous space. A training trajectory almost never stays inside it. The built-in surfaces here are honest two-variable functions, not neural losses; neural slices are on the roadmap.`,
    ],
    takeaway: 'Two-dimensional intuition is a starting point. Treat it as a sketch of a much larger country.',
    objective: 'rosenbrock',
    rate: 0.002,
    initial: [-1.4, 1.6],
    algorithms: ['gd'],
  },
];
function useActiveChapter() {
  const [active, setActive] = useState(chapters[0].id);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.replace('chapter-', ''));
      },
      { rootMargin: '-20% 0px -60% 0px' },
    );
    chapters.forEach((c) => {
      const el = document.getElementById('chapter-' + c.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  return active;
}
export function Lessons() {
  const active = useActiveChapter();
  const load = (c: Chapter) => {
    useLab.getState().setObjective(c.objective);
    useLab.getState().configure({ initial: c.initial, algorithms: c.algorithms, learningRate: c.rate });
    location.hash = '/lab';
  };
  return (
    <main className="content-page story-page">
      <header className="story-hero">
        <div className="eyebrow">
          <BookOpen size={14} /> The story behind the math
        </div>
        <h1>
          Ten short chapters on <em>finding your way down.</em>
        </h1>
        <p className="page-description">
          Each chapter is a small idea, an equation that says it precisely, and a toy you can play with. When
          you are curious for more, open the same scene in the full lab.
        </p>
      </header>
      <div className="story-layout">
        <nav className="story-nav" aria-label="Chapters">
          {chapters.map((c, i) => (
            <button
              key={c.id}
              className={active === c.id ? 'active' : ''}
              aria-current={active === c.id ? 'true' : undefined}
              onClick={() =>
                document
                  .getElementById('chapter-' + c.id)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              {c.title}
            </button>
          ))}
        </nav>
        <div className="chapters">
          {chapters.map((c, i) => (
            <section key={c.id} id={'chapter-' + c.id} className="chapter" aria-labelledby={'title-' + c.id}>
              <div className="chapter-number">Chapter {String(i + 1).padStart(2, '0')}</div>
              <h2 id={'title-' + c.id}>{c.title}</h2>
              <p className="chapter-question">{c.question}</p>
              <div className="chapter-prose">
                {c.story.map((paragraph, k) => (
                  <Prose key={k}>{paragraph}</Prose>
                ))}
                {c.equation && <Tex block>{c.equation}</Tex>}
              </div>
              {c.widget}
              <aside className="takeaway">
                <Lightbulb size={16} />
                <p>{c.takeaway}</p>
              </aside>
              <div className="chapter-footer">
                <span>
                  {objectives.find((o) => o.id === c.objective)?.name} · <Tex>{r`\eta = ${c.rate}`}</Tex> ·
                  start ({c.initial.join(', ')})
                </span>
                <button className="button secondary" onClick={() => load(c)}>
                  Open this scene in the lab <ArrowRight size={15} />
                </button>
              </div>
            </section>
          ))}
          <section className="math-reference">
            <h2>The rules behind the paths</h2>
            <Prose>
              {r`The gradient $g_t = \nabla f(\theta_t)$ is evaluated at the current point. Step $0$ is the starting state; the first update produces $\theta_1$. RMSProp and Adam apply squares, square roots and divisions coordinate by coordinate, and $\varepsilon$ sits outside the square root.`}
            </Prose>
            <div className="reference-grid">
              {Object.entries(algorithms).map(([id, a]) => (
                <div key={id} className="reference-card">
                  <h3>
                    <i className="legend-dot" style={{ background: a.color }} />
                    {a.name}
                  </h3>
                  <Tex block>{a.tex}</Tex>
                  {id === 'adam' && (
                    <Tex
                      block
                    >{r`m_{t+1} = \beta_1 m_t + (1-\beta_1)\,g_t, \quad v_{t+1} = \beta_2 v_t + (1-\beta_2)\,g_t^2, \quad m_0 = v_0 = 0`}</Tex>
                  )}
                </div>
              ))}
            </div>
            <p className="references">
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
        </div>
      </div>
    </main>
  );
}
