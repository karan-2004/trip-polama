import { useEffect, useState } from 'react';

export function PhotoPreview({ image, alt }: { image: Blob; alt: string }) {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(image);
    setUrl(objectUrl);
    setFailed(false);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  if (failed) return <p className="muted">Image selected, but this browser cannot preview its format.</p>;
  return url ? <img className="photo-preview" src={url} alt={alt} onError={() => setFailed(true)} /> : null;
}
