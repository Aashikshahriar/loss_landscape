import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Beaker,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Contrast,
  FlaskConical,
  FolderOpen,
  Github,
  Keyboard,
  Monitor,
  Moon,
  Mountain,
  Save,
  Share2,
  Sun,
  X,
} from 'lucide-react';
import { Controls } from '../components/Controls';
import { Viewport } from '../components/Viewport';
import { Charts, Comparison } from '../components/Charts';
import { Inspector } from '../components/Inspector';
import { SaveDialog } from '../components/SaveDialog';
import { Landing } from '../features/Landing';
import { Lessons } from '../features/Lessons';
import { Experiments } from '../features/Experiments';
import { useLab } from '../stores/lab';
import { useTheme } from '../stores/theme';
import { exportCSV, exportJSON, readSharedConfig, shareConfig } from '../services/experiments';
const source = 'https://github.com/Aashikshahriar/loss_landscape';
class AppBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="app-error">
        <h1>The workspace encountered an error.</h1>
        <p>Your saved experiments remain in local browser storage.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload workspace
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
const shortcuts: [string, string][] = [
  ['Space', 'Run or pause'],
  ['→', 'Take a single step'],
  ['← / Shift + →', 'Scrub back / forward through history'],
  ['R', 'Reset the experiment'],
  ['V', 'Switch 3D surface / 2D contours'],
  ['1 – 9, 0', 'Jump to a landscape'],
  ['?', 'Show these shortcuts'],
];
const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName));
function useShortcuts(onHelp: () => void) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || document.querySelector('dialog[open]'))
        return;
      const lab = useLab.getState(),
        steps = Math.max(...lab.runs.map((r) => r.history.length - 1)),
        at = lab.cursor ?? steps;
      if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        if (lab.running) lab.pause();
        else lab.play();
      } else if (e.key === 'ArrowRight' && e.shiftKey) lab.setCursor(Math.min(steps, at + 1));
      else if (e.key === 'ArrowRight') {
        lab.pause();
        lab.advance(1);
      } else if (e.key === 'ArrowLeft') lab.setCursor(Math.max(0, at - 1));
      else if (e.key === 'r' || e.key === 'R') lab.reset();
      else if (e.key === 'v' || e.key === 'V') lab.setView(lab.view === '3d' ? '2d' : '3d');
      else if (e.key === '?') onHelp();
      else if (/^[0-9]$/.test(e.key)) {
        const ids = [
          'rosenbrock',
          'quadratic',
          'elliptical',
          'himmelblau',
          'rastrigin',
          'beale',
          'saddle',
          'monkey',
          'doublewell',
          'noisy-quadratic',
        ];
        lab.setObjective(ids[(Number(e.key) + 9) % 10]);
      } else return;
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [onHelp]);
}
function ShortcutDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => dialog.current?.showModal(), []);
  return (
    <dialog ref={dialog} className="save-dialog" onClose={onClose} aria-labelledby="keys-title">
      <div className="dialog-header">
        <Keyboard size={20} />
        <button type="button" className="icon-button" aria-label="Close shortcuts" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <h2 id="keys-title">Move faster with the keyboard.</h2>
      <dl className="shortcut-list">
        {shortcuts.map(([k, v]) => (
          <div key={k}>
            <dt>
              <kbd>{k}</kbd>
            </dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </dialog>
  );
}
function Workspace() {
  const [save, setSave] = useState(false),
    [help, setHelp] = useState(false),
    [mobile, setMobile] = useState('landscape'),
    [exportOpen, setExportOpen] = useState(false);
  const state = useLab();
  const openHelp = useRef(() => setHelp(true)).current;
  useShortcuts(openHelp);
  return (
    <main className="lab-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <span className="live-dot" />
            The interactive playground
          </div>
          <h1>
            Every landscape has a <em>story.</em>
          </h1>
          <p>Choose your terrain. Drop a hiker. Watch how each optimizer finds its way down.</p>
        </div>
        <div className="experiment-toolbar">
          <button
            className="button subtle icon-only"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
            onClick={() => setHelp(true)}
          >
            <Keyboard size={16} />
          </button>
          <button
            className="button subtle icon-only share-button"
            title="Copy configuration link"
            aria-label="Copy configuration link"
            onClick={() => {
              void navigator.clipboard
                .writeText(shareConfig(state.config))
                .then(() => state.notify('Configuration link copied. It contains no trajectory or dataset.'))
                .catch(() =>
                  state.notify('Clipboard access is unavailable. Export JSON to share the experiment.'),
                );
            }}
          >
            <Share2 size={15} />
          </button>
          <button className="button secondary" onClick={() => setSave(true)}>
            <Save size={15} />
            Save experiment
          </button>
          <div className="export-dropdown">
            <button
              className="button subtle"
              onClick={() => setExportOpen(!exportOpen)}
              aria-expanded={exportOpen}
            >
              <ArrowDownToLine size={15} />
              Export
              <ChevronDown size={12} />
            </button>
            {exportOpen && (
              <div className="export-menu">
                <button
                  onClick={() => {
                    exportCSV(state.snapshot());
                    setExportOpen(false);
                  }}
                >
                  Trajectory CSV
                </button>
                <button
                  onClick={() => {
                    exportJSON(state.snapshot());
                    setExportOpen(false);
                  }}
                >
                  Experiment JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mobile-tabs" role="group" aria-label="Workspace panel">
        {['setup', 'landscape', 'inspector'].map((v) => (
          <button key={v} className={mobile === v ? 'active' : ''} onClick={() => setMobile(v)}>
            {v === 'setup' ? (
              <FlaskConical size={14} />
            ) : v === 'landscape' ? (
              <Mountain size={14} />
            ) : (
              <Beaker size={14} />
            )}{' '}
            {v}
          </button>
        ))}
      </div>
      <div className={'workspace-grid mobile-' + mobile}>
        <Controls />
        <Viewport />
        <Inspector />
        <Charts />
      </div>
      <Comparison />
      <div className="below-lab">
        <span>
          <Check size={13} />
          Analytic derivatives <i />
          Seeded replay <i />
          Float64 computations
        </span>
        <a href="#/learn">
          <CircleHelp size={14} />
          Wondering what’s happening? Read the story behind the math <ArrowUpRight size={13} />
        </a>
      </div>
      {save && <SaveDialog onClose={() => setSave(false)} />}
      {help && <ShortcutDialog onClose={() => setHelp(false)} />}
    </main>
  );
}
function ThemeButtons() {
  const { mode, cycle, contrast, setContrast } = useTheme();
  const Icon = mode === 'system' ? Monitor : mode === 'light' ? Sun : Moon;
  const label = { system: 'Theme: match system', light: 'Theme: light', dark: 'Theme: dark' }[mode];
  return (
    <>
      <button className="header-icon" onClick={cycle} title={label + ' (click to change)'} aria-label={label}>
        <Icon size={17} />
      </button>
      <button
        className="header-icon"
        onClick={() => setContrast(!contrast)}
        title="High contrast"
        aria-label="Toggle high contrast"
        aria-pressed={contrast}
      >
        <Contrast size={17} />
      </button>
    </>
  );
}
function Shell() {
  const [route, setRoute] = useState(location.hash.split('?')[0] || '#/');
  const { init, running, busy, speed, advance, notice, notify } = useLab();
  useEffect(() => {
    if (route !== '#/lab') useLab.getState().pause();
  }, [route]);
  useEffect(() => {
    init();
    try {
      const shared = readSharedConfig();
      if (shared) useLab.getState().configure(shared);
    } catch {
      notify('This shared configuration is invalid. The default experiment has been loaded.');
    }
    const hash = () => {
      setRoute(location.hash.split('?')[0] || '#/');
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    addEventListener('hashchange', hash);
    return () => removeEventListener('hashchange', hash);
  }, [init, notify]);
  useEffect(() => {
    if (!running || busy) return;
    const id = setTimeout(() => {
      if (!document.hidden) advance(speed);
    }, 45);
    return () => clearTimeout(id);
  }, [running, busy, speed, advance]);
  useEffect(() => {
    const resume = () => {
      if (!document.hidden && useLab.getState().running && !useLab.getState().busy)
        useLab.getState().advance(useLab.getState().speed);
    };
    document.addEventListener('visibilitychange', resume);
    return () => document.removeEventListener('visibilitychange', resume);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => notify(''), 7000);
    return () => clearTimeout(timer);
  }, [notice, notify]);
  const page = route;
  return (
    <div className="app">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <a className="brand" href="#/" aria-label="OptimizationLand home">
          <span className="brand-mark">
            <Mountain size={20} strokeWidth={1.8} />
          </span>
          <span className="brand-name">
            Optimization<span>Land</span>
          </span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a className={page === '#/lab' ? 'active' : ''} href="#/lab">
            <FlaskConical size={15} />
            Playground
          </a>
          <a className={page === '#/learn' ? 'active' : ''} href="#/learn">
            <BookOpen size={15} />
            The story
          </a>
          <a className={page === '#/experiments' ? 'active' : ''} href="#/experiments">
            <FolderOpen size={15} />
            Experiments
          </a>
        </nav>
        <div className="header-right">
          <ThemeButtons />
          <a
            className="header-icon github-link"
            href={source}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub source repository"
          >
            <Github size={17} />
          </a>
        </div>
      </header>
      <div id="main-content" tabIndex={-1}>
        {page === '#/lab' ? (
          <Workspace />
        ) : page === '#/experiments' ? (
          <Experiments />
        ) : page === '#/learn' ? (
          <Lessons />
        ) : (
          <Landing />
        )}
      </div>
      <footer className="site-footer">
        <span>
          <Mountain size={14} />
          OptimizationLand <span className="footer-tagline">· a little intuition, one step at a time</span>
        </span>
        <div>
          <span className="local-status">
            <span className="status-dot" />
            Runs entirely in your browser
          </span>
          <a href={source + '/blob/main/docs/limitations.md'} target="_blank" rel="noreferrer">
            Scientific limitations <ArrowUpRight size={11} />
          </a>
        </div>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          <span>{notice}</span>
          <button className="icon-button" aria-label="Dismiss notification" onClick={() => notify('')}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
export default function App() {
  return (
    <AppBoundary>
      <Shell />
    </AppBoundary>
  );
}
