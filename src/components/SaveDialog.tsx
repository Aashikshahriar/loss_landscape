import { useEffect, useRef, useState } from 'react';
import { Bookmark, X } from 'lucide-react';
import { experiments } from '../services/experiments';
import { useLab } from '../stores/lab';
export function SaveDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    [name, setName] = useState('My landscape exploration'),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog ref={dialog} className="save-dialog" onClose={onClose} aria-labelledby="save-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setSaving(true);
          void experiments
            .save(useLab.getState().snapshot(name.trim()))
            .then(() => {
              useLab.getState().notify('Experiment saved on this device.');
              onClose();
            })
            .catch(() => {
              setError('Unable to save locally. Export JSON to keep this experiment.');
              setSaving(false);
            });
        }}
      >
        <div className="dialog-header">
          <Bookmark size={20} />
          <button type="button" className="icon-button" aria-label="Close save dialog" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <h2 id="save-title">Keep this exploration.</h2>
        <p>Save the configuration, seed, and recorded trajectories to your browser.</p>
        <label className="field">
          <span>Experiment name</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
        </label>
        {error && (
          <p role="alert" className="warning-note">
            {error}
          </p>
        )}
        <button className="button primary" disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : 'Save experiment'}
        </button>
      </form>
    </dialog>
  );
}
