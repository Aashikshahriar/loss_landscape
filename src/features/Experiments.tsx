import { useEffect, useState } from 'react';
import { ArrowRight, Copy, Download, FolderOpen, Trash2, Upload } from 'lucide-react';
import { experiments, exportJSON, importLimit, parseExperiment } from '../services/experiments';
import { useLab } from '../stores/lab';
import { objectiveById } from '../math/objectives';
import type { Experiment } from '../types';
export function Experiments() {
  const [items, setItems] = useState<Experiment[]>([]),
    [error, setError] = useState('');
  const refresh = () =>
    experiments
      .list()
      .then(setItems)
      .catch(() =>
        setError('Local storage could not be opened. JSON import and export are still available.'),
      );
  useEffect(() => {
    void refresh();
  }, []);
  const notify = useLab((s) => s.notify);
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > importLimit) throw new Error('File exceeds the 32 MB import limit.');
      const e = parseExperiment(await file.text());
      await experiments.save(e);
      await refresh();
      notify('Experiment imported and schema validated. Replay to verify its numerical results.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    }
  };
  return (
    <main className="content-page">
      <div className="eyebrow">
        <FolderOpen size={14} /> YOUR EXPLORATIONS
      </div>
      <div className="content-heading">
        <div>
          <h1>Good experiments are worth keeping.</h1>
          <p className="page-description">Saved on this device. Reproducible wherever curiosity takes you.</p>
        </div>
        <label className="button secondary upload-label">
          <Upload size={15} />
          Import JSON
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {error && (
        <p className="warning-note" role="alert">
          {error.slice(0, 250)}
        </p>
      )}
      {items.length === 0 ? (
        <div className="empty-experiments panel">
          <FolderOpen size={38} />
          <h2>A fresh notebook.</h2>
          <p>
            Run an experiment in the lab, then save it here with its complete configuration and trajectory.
          </p>
          <a className="button primary" href="#/lab">
            Explore the lab <ArrowRight size={15} />
          </a>
        </div>
      ) : (
        <div className="experiment-grid">
          {items.map((e) => (
            <article className="experiment-card panel" key={e.id}>
              <div className="eyebrow">{new Date(e.createdAt).toLocaleDateString()}</div>
              <h2>{e.name}</h2>
              <p>{objectiveById(e.config.objective).name}</p>
              <div className="experiment-tags">
                {e.config.algorithms.map((a) => (
                  <span key={a}>{a}</span>
                ))}
                <span>{Math.max(...e.runs.map((r) => r.history.length - 1))} steps</span>
              </div>
              <p className="microcopy">
                Seed {e.config.seed} · schema {e.schemaVersion} · algorithm v{e.algorithmVersion}
              </p>
              <div className="experiment-actions">
                <button
                  className="button secondary"
                  onClick={() => {
                    useLab.getState().restore(e);
                    location.hash = '/lab';
                  }}
                >
                  Restore <ArrowRight size={14} />
                </button>
                <button className="icon-button" aria-label={`Export ${e.name}`} onClick={() => exportJSON(e)}>
                  <Download size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Duplicate ${e.name}`}
                  onClick={() => {
                    void experiments
                      .save({
                        ...e,
                        id: crypto.randomUUID(),
                        name: (e.name + ' (copy)').slice(0, 120),
                        createdAt: new Date().toISOString(),
                      })
                      .then(refresh)
                      .catch(() => setError('Unable to duplicate this experiment.'));
                  }}
                >
                  <Copy size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${e.name}`}
                  onClick={() => {
                    void experiments
                      .remove(e.id)
                      .then(refresh)
                      .catch(() => setError('Unable to delete this experiment.'));
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="privacy-note">
        No account, analytics, or remote storage. Browser data can be cleared by your device; export JSON to
        keep a portable copy. Share links contain configuration only.
      </div>
    </main>
  );
}
