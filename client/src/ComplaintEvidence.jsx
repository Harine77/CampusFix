import { useEffect, useState } from 'react';
import { api } from './api.js';
import './complaintEvidence.css';

export default function ComplaintEvidence({ complaintId, hasPhoto }) {
  const [src, setSrc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    if (!hasPhoto) { setSrc(''); setError(''); setLoading(false); return undefined; }

    setLoading(true);
    setError('');
    api.photo(complaintId)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setSrc(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch((photoError) => { if (active) setError(photoError.message); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [complaintId, hasPhoto]);

  if (!hasPhoto) return null;
  return <section className="complaint-evidence" aria-label="Complaint photo evidence">
    <div className="card-overline">PHOTO EVIDENCE</div>
    {loading && <p className="muted-small">Loading photo…</p>}
    {error && <p className="muted-small" role="alert">Photo could not be loaded: {error}</p>}
    {src && <a href={src} target="_blank" rel="noreferrer"><img src={src} alt="Photo evidence attached to this complaint"/></a>}
  </section>;
}
