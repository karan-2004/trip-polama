import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { Trip } from '@trip-polama/core';
import { addPhoto } from '@trip-polama/store';
import { PhotoPreview } from './PhotoPreview';
import { validatePhoto } from './photoInput';
import { CameraCapture } from './CameraCapture';

export function Photos({ trip, onChanged }: { trip: Trip; onChanged: () => void }) {
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [note, setNote] = useState('');

  function selectImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    useImage(file);
  }

  function useImage(file: File) {
    const problem = validatePhoto(file);
    setError(problem);
    setImage(problem ? null : file);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!image || saving) return;
    const form = e.currentTarget;
    setSaving(true);
    setError(null);
    try {
      await addPhoto({
      tripId: trip.id,
      filename: image.name,
      image,
      note: note.trim() || undefined,
      ts: Date.now(),
      });
      setImage(null);
      setNote('');
      form.reset();
      onChanged();
    } catch {
      setError('Could not save this image. Device storage may be full. Your selection is still here; try again.');
    } finally {
      setSaving(false);
    }
  }

  const photos = [...trip.photos].sort((a, b) => b.ts - a.ts);

  return (
    <div>
      <form className="panel" onSubmit={submit}>
        <div className="grid">
          <div className="field">
            <label htmlFor="photo-upload">Choose an image</label>
            <input id="photo-upload" type="file" accept="image/*" onChange={selectImage} disabled={saving} />
          </div>
          <div className="field">
            <span>Take a photo</span>
            <button type="button" className="secondary" disabled={saving || cameraOpen}
              onClick={() => setCameraOpen(true)}>Open camera</button>
            <span className="muted">Uses this device's camera. Requires camera permission on HTTPS or localhost.</span>
          </div>
          <div className="field">
            <label>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="sunrise at the ridge" />
          </div>
        </div>
        {cameraOpen && <CameraCapture onCapture={useImage} onClose={() => setCameraOpen(false)} />}
        {image && <PhotoPreview image={image} alt="Selected trip photo" />}
        {error && <p role="alert" className="photo-error">{error}</p>}
        <p className="muted">Images up to 10 MB. Saved on this device, not uploaded to a server.</p>
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <button type="submit" disabled={!image || saving || cameraOpen}>{saving ? 'Saving...' : 'Save photo'}</button>
        </div>
      </form>

      {photos.length === 0 ? (
        <div className="empty">Choose an image or take a photo to start your trip album.</div>
      ) : (
        <ul className="list">
          {photos.map((p) => (
            <li key={p.id} className="list-item">
              <div>
                {p.image && <PhotoPreview image={p.image} alt={p.note || 'Trip photo'} />}
                <div className="title">{p.note || 'Trip photo'}</div>
                {!p.image && <div className="muted">Earlier photo note: no image attached.</div>}
                <div className="sub">
                  {new Date(p.ts).toLocaleString()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
