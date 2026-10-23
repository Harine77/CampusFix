import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from './api.js';
import './complaintEvidence.css';

const categories = ['Electrical', 'Plumbing', 'Furniture', 'IT & Wi-Fi', 'Classroom Equipment', 'Cleanliness', 'Safety', 'Other'];
const maxPhotoSize = 5 * 1024 * 1024;
const acceptedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];

function FormField({ label, children, hint }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export default function NewComplaint() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const photoInputRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [viewedDuplicate, setViewedDuplicate] = useState(null);

  useEffect(() => {
    if (!photo) { setPreviewUrl(''); return undefined; }
    const objectUrl = URL.createObjectURL(photo);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photo]);

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    setPhotoError('');
    if (!file) return;
    if (!acceptedPhotoTypes.includes(file.type)) {
      setPhotoError('Choose a JPEG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > maxPhotoSize) {
      setPhotoError('Photo evidence must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }
    setPhoto(file);
    setDuplicates([]);
    setViewedDuplicate(null);
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoError('');
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  async function sendComplaint(confirmDuplicates = false) {
    if (!formRef.current || busy) return;
    setBusy(true);
    setError('');
    const formData = new FormData(formRef.current);
    formData.delete('photo');
    if (photo) formData.append('photo', photo);
    if (confirmDuplicates) formData.set('confirmDuplicates', 'true');

    try {
      const result = await api.create(formData);
      if (result.duplicates?.length) {
        setDuplicates(result.duplicates);
        setViewedDuplicate(null);
        return;
      }
      navigate(`/complaints/${result.complaint.id}`, { state: { created: true } });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    setDuplicates([]);
    setViewedDuplicate(null);
    sendComplaint(false);
  }

  function clearDuplicateWarning() {
    setDuplicates([]);
    setViewedDuplicate(null);
  }

  return <>
    <div className="backline"><Link to="/complaints">← Back to my complaints</Link></div>
    <div className="form-layout">
      <div className="form-intro">
        <p className="eyebrow">NEW MAINTENANCE REQUEST</p>
        <h1>Let’s get this<br/><em>taken care of.</em></h1>
        <p>Tell us what’s going on and where. The facilities team will pick it up from there.</p>
        <div className="form-tip"><span>✳</span><div><b>A little detail goes a long way</b><p>Include what happened, when you noticed it, and any helpful context.</p></div></div>
        <div className="privacy-tip">Visible to you and the campus team handling the request.</div>
      </div>

      <form ref={formRef} className="complaint-form" onSubmit={submit} onChange={clearDuplicateWarning}>
        <div className="form-card">
          <div className="form-section-heading"><span>01</span><div><b>What needs attention?</b><small>Give your request a clear, helpful title.</small></div></div>
          <FormField label="Request title"><input name="title" placeholder="e.g. Projector lamp not working in room 204" minLength="5" maxLength="140" required/></FormField>
          <FormField label="Description" hint="The more specific you can be, the easier it is to help."><textarea name="description" placeholder="What happened? When did you first notice it? Include details that may help the team." rows="5" minLength="15" maxLength="5000" required/></FormField>
          <div className="form-grid">
            <FormField label="Category"><select name="category" required defaultValue=""><option value="" disabled>Select a category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></FormField>
            <FormField label="Building & location"><input name="location" placeholder="e.g. Main Block, Room 204" minLength="2" maxLength="140" required/></FormField>
          </div>
          <FormField label="Photo evidence (optional)" hint="JPEG, PNG, or WebP. Maximum size: 5 MB."><input ref={photoInputRef} type="file" name="photo" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange}/></FormField>
          {photoError && <div className="alert error" role="alert">{photoError}</div>}
          {previewUrl && <div className="photo-preview"><img src={previewUrl} alt="Selected complaint evidence preview"/><div><span>{photo.name}</span><button type="button" className="text-link" onClick={removePhoto}>Remove photo</button></div></div>}
        </div>

        {error && <div className="alert error" role="alert">{error}</div>}

        {duplicates.length > 0 && <section className="duplicate-warning" role="alert" aria-labelledby="duplicate-warning-title">
          <span className="eyebrow">POSSIBLE MATCH</span>
          <h3 id="duplicate-warning-title">Similar requests already exist</h3>
          <p>Check whether one of these reports covers the same issue. If it is marked resolved but the problem has returned, you can still submit a new complaint.</p>
          <div className="duplicate-list">{duplicates.map((item) => <article className="duplicate-item" key={item.id}>
            <div><b>#{String(item.id).padStart(4, '0')} · {item.title}</b><span>{item.location} · {item.status}</span>{item.status === 'Resolved' && <small>This issue was marked resolved. If it has returned or is still happening, choose continue to report it again.</small>}</div>
            <button type="button" className="button secondary" onClick={() => setViewedDuplicate(item)}>View report</button>
          </article>)}</div>
          <div className="duplicate-actions"><button type="button" className="button secondary" disabled={busy} onClick={clearDuplicateWarning}>Review my report</button><button type="button" className="button primary" disabled={busy} onClick={() => sendComplaint(true)}>{busy ? 'Submitting…' : 'Continue with new complaint'}</button></div>
        </section>}

        <div className="form-actions"><Link className="button secondary" to="/complaints">Cancel</Link>{duplicates.length === 0 && <button className="button primary" disabled={busy}>{busy ? 'Checking…' : 'Check and submit'} <span>↗</span></button>}</div>
      </form>
    </div>

    {viewedDuplicate && <div className="preview-backdrop" role="presentation" onClick={() => setViewedDuplicate(null)}>
      <section className="duplicate-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="duplicate-preview-title" onClick={(event) => event.stopPropagation()}>
        <span className="eyebrow">EXISTING REQUEST #{String(viewedDuplicate.id).padStart(4, '0')}</span>
        <h3 id="duplicate-preview-title">{viewedDuplicate.title}</h3>
        <dl><dt>Location</dt><dd>{viewedDuplicate.location}</dd><dt>Status</dt><dd>{viewedDuplicate.status}</dd></dl>
        <p>This privacy-limited preview omits the reporter and description.</p>
        <div className="duplicate-actions"><button type="button" className="button secondary" onClick={() => setViewedDuplicate(null)}>Back to my report</button><button type="button" className="button primary" disabled={busy} onClick={() => { setViewedDuplicate(null); sendComplaint(true); }}>Continue anyway</button></div>
      </section>
    </div>}
  </>;
}
