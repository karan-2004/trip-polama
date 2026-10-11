import { useEffect, useRef, useState } from 'react';

export function CameraCapture({ onCapture, onClose }: {
  onCapture: (image: File) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const active = useRef(false);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | undefined;
    active.current = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is unavailable. Open the app on HTTPS or localhost, or choose an image instead.');
    } else {
      void navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }, audio: false,
      }).then((result) => {
        if (cancelled) {
          result.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = result;
        if (video.current) video.current.srcObject = result;
      }).catch((reason: unknown) => {
        if (cancelled) return;
        const name = reason && typeof reason === 'object' && 'name' in reason ? reason.name : '';
        setError(name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in browser settings, or choose an image.'
          : name === 'NotFoundError'
            ? 'No camera was found on this device. Choose an image instead.'
            : 'Could not open the camera. It may be in use by another app. Close it and try again.');
      });
    }
    return () => {
      cancelled = true;
      active.current = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function capture() {
    const source = video.current;
    if (!source || !source.videoWidth || !source.videoHeight || capturing) return;
    setCapturing(true);
    const canvas = document.createElement('canvas');
    canvas.width = source.videoWidth;
    canvas.height = source.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setError('This browser could not capture the image. Choose an image instead.');
      setCapturing(false);
      return;
    }
    context.drawImage(source, 0, 0);
    canvas.toBlob((blob) => {
      if (!active.current) return;
      if (!blob) {
        setError('Capture failed. Please try again.');
        setCapturing(false);
        return;
      }
      onCapture(new File([blob], `trip-photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      onClose();
    }, 'image/jpeg', 0.9);
  }

  return (
    <section className="camera-panel" aria-label="Camera capture">
      {!error && <video ref={video} className="camera-preview" autoPlay playsInline muted
        aria-label="Live camera preview" onLoadedData={() => setReady(true)}
        onError={() => setError('Camera preview unavailable. Close the camera and try again.')} />}
      {error ? <p role="alert" className="photo-error">{error}</p>
        : !ready && <p role="status">Opening camera...</p>}
      <div className="row">
        <button type="button" disabled={!ready || capturing || !!error} onClick={capture}>
          {capturing ? 'Capturing...' : 'Capture photo'}
        </button>
        <button type="button" className="secondary" onClick={onClose}>Close camera</button>
      </div>
    </section>
  );
}
