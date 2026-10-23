import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api.js';
import './escalatedComplaints.css';

const formatDate = (value) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));

export default function EscalatedComplaints() {
  const [filters, setFilters] = useState({ priority: '', status: '', sort: 'age_desc' });
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.escalatedComplaints(Object.fromEntries(Object.entries(filters).filter(([, value]) => value)))
      .then((result) => { if (active) setComplaints(result.complaints); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  return <section className="escalated-panel" aria-labelledby="escalated-title">
    <div className="escalated-heading">
      <div><p className="eyebrow">ADMIN ATTENTION</p><h2 id="escalated-title">Escalated complaints <span>{loading ? '…' : complaints.length}</span></h2><p>Unresolved requests that have been open longer than the configured threshold.</p></div>
      <div className="escalated-filters" aria-label="Filter escalated complaints">
        <label><span>Priority</span><select value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)}><option value="">All priorities</option>{['Low', 'Medium', 'High', 'Critical'].map((priority) => <option key={priority}>{priority}</option>)}</select></label>
        <label><span>Status</span><select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}><option value="">All active statuses</option>{['Submitted', 'Assigned', 'In Progress'].map((status) => <option key={status}>{status}</option>)}</select></label>
        <label><span>Age</span><select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}><option value="age_desc">Oldest first</option><option value="age_asc">Newest first</option></select></label>
      </div>
    </div>
    {error ? <div className="alert error" role="alert">{error}<button className="text-link" onClick={() => setFilters((current) => ({ ...current }))}>Try again</button></div>
      : loading ? <div className="escalated-empty" role="status">Loading escalated complaints…</div>
        : complaints.length === 0 ? <div className="escalated-empty">No active escalated complaints match these filters.</div>
          : <div className="escalated-table-wrap"><table className="escalated-table"><thead><tr><th>REQUEST</th><th>CATEGORY</th><th>PRIORITY</th><th>LOCATION</th><th>STATUS</th><th>CREATED</th><th>AGE</th><th>ASSIGNED TO</th><th>ESCALATED</th></tr></thead><tbody>
            {complaints.map((complaint) => <tr key={complaint.id}>
              <td><Link to={`/complaints/${complaint.id}`}>#{String(complaint.id).padStart(4, '0')} · {complaint.title}</Link><span className="escalation-flag">Overdue</span></td>
              <td>{complaint.category}</td><td><span className={`escalation-priority priority-${complaint.priority.toLowerCase()}`}>{complaint.priority}</span></td>
              <td>{complaint.location}</td><td>{complaint.status}</td><td>{formatDate(complaint.created_at)}</td>
              <td><strong>{complaint.days_pending} days</strong></td><td>{complaint.staff_name || 'Unassigned'}</td><td>{formatDate(complaint.escalated_at)}</td>
            </tr>)}
          </tbody></table></div>}
  </section>;
}
