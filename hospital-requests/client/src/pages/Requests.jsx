import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { timeAgo } from '../ui.jsx';

export const STATUSES = ['NEW', 'IN_PROGRESS', 'WAITING', 'DONE', 'CANCELLED'];
export const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
export const label = (s) => s.replace('_', ' ').toLowerCase();

export default function Requests() {
  const { user } = useAuth();
  const staff = user.role !== 'REQUESTER';
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({ status: params.get('status') || '', priority: params.get('priority') || '', departmentId: '', q: '', mine: params.get('mine') === 'true' });
  const [page, setPage] = useState(1);
  const [lookups, setLookups] = useState({ departments: [] });
  const [data, setData] = useState({ items: [], total: 0, pageSize: 20 });
  const [error, setError] = useState('');

  useEffect(() => { api('/lookups').then(setLookups).catch(() => {}); }, []);

  useEffect(() => {
    const params = new URLSearchParams({ page });
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    api('/requests?' + params).then(setData).catch((e) => setError(e.message));
  }, [filters, page]);

  const update = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const set = (k) => (e) => update({ [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const first = data.total === 0 ? 0 : (page - 1) * data.pageSize + 1;
  const last = Math.min(page * data.pageSize, data.total);

  return (
    <>
      <div className="page-head">
        <div>
          <h2>{staff ? 'Requests' : 'My requests'}</h2>
          <p className="sub">{staff ? 'All requests from every department.' : 'Requests you have sent.'}</p>
        </div>
        <Link to="/new" className="btn primary">New request</Link>
      </div>

      <div className="tabs">
        {[['', 'All'], ...STATUSES.map((s) => [s, label(s)])].map(([v, l]) => (
          <button key={v} className={filters.status === v ? 'on' : ''} onClick={() => update({ status: v })}>{l}</button>
        ))}
      </div>

      <div className="filters">
        <input placeholder="Search..." value={filters.q} onChange={set('q')} />
        <select value={filters.priority} onChange={set('priority')}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{label(p)}</option>)}
        </select>
        {staff && (
          <>
            <select value={filters.departmentId} onChange={set('departmentId')}>
              <option value="">All departments</option>
              {lookups.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <label className="inline"><input type="checkbox" checked={filters.mine} onChange={set('mine')} /> Assigned to me</label>
          </>
        )}
      </div>
      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr><th>#</th><th>Request</th><th>Department</th><th>Priority</th><th>Status</th><th>Assignee</th><th>Created</th></tr>
        </thead>
        <tbody>
          {data.items.map((r) => (
            <tr key={r.id} className={`pr-${r.priority}`}>
              <td className="muted">{r.id}</td>
              <td><Link to={`/requests/${r.id}`}>{r.title}</Link><div className="muted">{r.category.name} · {r.requester.name}</div></td>
              <td>{r.department.name}</td>
              <td><span className={`chip p-${r.priority}`}>{label(r.priority)}</span></td>
              <td><span className={`chip s-${r.status}`}>{label(r.status)}</span></td>
              <td>{r.assignee?.name || <span className="muted">Unassigned</span>}</td>
              <td className="muted" title={new Date(r.createdAt).toLocaleString()}>{timeAgo(r.createdAt)}</td>
            </tr>
          ))}
          {data.items.length === 0 && <tr><td colSpan="7" className="center">No requests match these filters. Try clearing them or create a new request.</td></tr>}
        </tbody>
      </table>

      <div className="pager">
        <span className="muted">Showing {first}-{last} of {data.total}</span>
        <span>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>{' '}
          <button disabled={last >= data.total} onClick={() => setPage(page + 1)}>Next</button>
        </span>
      </div>
    </>
  );
}
