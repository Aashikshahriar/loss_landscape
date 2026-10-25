import { Component, useEffect, useState, type ReactNode } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Beaker,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  FlaskConical,
  FolderOpen,
  Github,
  Mountain,
  Save,
  Share2,
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
function Workspace() {
  const [save, setSave] = useState(false),
    [mobile, setMobile] = useState('landscape'),
    [exportOpen, setExportOpen] = useState(false);
  const state = useLab();
  return (
    <main className="lab-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <span className="live-dot" />
            THE INTERACTIVE PLAYGROUND
          </div>
          <h1>Every landscape has a story.</h1>
          <p>Choose your terrain. Follow the gradient. Find your own way down.</p>
        </div>
        <div className="experiment-toolbar">
          <button
            className="button secondary share-button"
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
          Wondering what’s happening? Read the field notes <ArrowUpRight size={13} />
        </a>
      </div>
      {save && <SaveDialog onClose={() => setSave(false)} />}
    </main>
  );
}
function Shell() {
  const [route, setRoute] = useState(location.hash.split('?')[0] || '#/'),
    [contrast, setContrast] = useState(false);
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
  return (
    <div className={contrast ? 'app high-contrast' : 'app'}>
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
            <Mountain size={23} strokeWidth={1.7} />
          </span>
          <span>
            Optimization<span>Land</span>
            <small>EXPLORE THE GEOMETRY</small>
          </span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a className={route === '#/lab' ? 'active' : ''} href="#/lab">
            <FlaskConical size={15} />
            Playground
          </a>
          <a className={route === '#/experiments' ? 'active' : ''} href="#/experiments">
            <FolderOpen size={15} />
            Experiments
          </a>
          <a className={route === '#/learn' ? 'active' : ''} href="#/learn">
            <BookOpen size={15} />
            Learn the math
          </a>
        </nav>
        <div className="header-right">
          <span className="version">
            v0.1 <span>BETA</span>
          </span>
          <button
            className="contrast-toggle"
            onClick={() => setContrast(!contrast)}
            aria-label="Toggle high contrast"
            aria-pressed={contrast}
          >
            ◐
          </button>
          <a
            className="github-link"
            href={source}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub source repository"
          >
            <Github size={18} />
            <span>GitHub</span>
            <ArrowUpRight size={12} />
          </a>
        </div>
      </header>
      <div id="main-content" tabIndex={-1}>
        {route === '#/lab' ? (
          <Workspace />
        ) : route === '#/experiments' ? (
          <Experiments />
        ) : route === '#/learn' ? (
          <Lessons />
        ) : (
          <Landing />
        )}
      </div>
      <footer className="site-footer">
        <span>
          <Mountain size={14} />
          OptimizationLand <span className="footer-tagline">/ A little intuition, one step at a time.</span>
        </span>
        <div>
          <span className="local-status">
            <span className="status-dot" />
            All systems local
          </span>
          <a href={source + '/blob/main/docs/limitations.md'} target="_blank" rel="noreferrer">
            Scientific limitations <ArrowUpRight size={11} />
          </a>
          <span>Made for curious minds.</span>
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
