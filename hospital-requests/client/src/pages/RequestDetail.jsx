import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { useNotify } from '../notify.jsx';
import { Avatar, timeAgo } from '../ui.jsx';
import { STATUSES, PRIORITIES, label } from './Requests.jsx';

const Field = ({ k, children }) => <div className="field"><dt>{k}</dt><dd>{children}</dd></div>;
const toDraft = (r) => ({ status: r.status, priority: r.priority, assigneeId: r.assigneeId ?? '' });

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useNotify();
  const staff = user.role !== 'REQUESTER';
  const [req, setReq] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api(`/requests/${id}`).then((d) => { setReq(d.request); setDraft(toDraft(d.request)); }).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (staff) api('/lookups').then((d) => setStaffList(d.staff)); }, [staff]);

  const dirty = req && draft && (draft.status !== req.status || draft.priority !== req.priority || String(draft.assigneeId) !== String(req.assigneeId ?? ''));

  async function save() {
    const changes = {};
    if (draft.status !== req.status) changes.status = draft.status;
    if (draft.priority !== req.priority) changes.priority = draft.priority;
    if (String(draft.assigneeId) !== String(req.assigneeId ?? '')) changes.assigneeId = draft.assigneeId === '' ? null : Number(draft.assigneeId);
    setSaving(true);
    try {
      await api(`/requests/${id}`, { method: 'PATCH', body: changes });
      toast.success('Changes saved');
      load();
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  }

  async function addComment(e) {
    e.preventDefault();
    try {
      await api(`/requests/${id}/comments`, { method: 'POST', body: { text, internal } });
      toast.success(internal ? 'Internal note added' : 'Comment added');
      setText(''); setInternal(false); load();
    } catch (err) { toast.error(err.message); }
  }

  if (error && !req) return <p className="error">{error}</p>;
  if (!req) return <p className="center">Loading...</p>;

  return (
    <>
      <Link to="/requests" className="back">Back to requests</Link>
      <div className="page-head">
        <div>
          <h2>{req.title}</h2>
          <p className="sub">Request #{req.id} · created {timeAgo(req.createdAt)} by {req.requester.name}</p>
        </div>
        <div>
          <span className={`chip s-${req.status}`}>{label(req.status)}</span>{' '}
          <span className={`chip p-${req.priority}`}>{label(req.priority)}</span>
        </div>
      </div>

      <div className="detail">
        <div>
          <div className="card">
            <h3>Description</h3>
            <p className="prewrap">{req.description}</p>
          </div>

          <h3>Comments</h3>
          {req.comments.length === 0 && <p className="muted">No comments yet.</p>}
          {req.comments.map((c) => (
            <div key={c.id} className={`comment ${c.internal ? 'internal' : ''}`}>
              <Avatar name={c.author.name} small />
              <div>
                <strong>{c.author.name}</strong>{' '}
                <span className="muted" title={new Date(c.createdAt).toLocaleString()}>{timeAgo(c.createdAt)}</span>
                {c.internal && <span className="chip note">internal note</span>}
                <p>{c.text}</p>
              </div>
            </div>
          ))}
          <form onSubmit={addComment} className="card">
            <textarea rows="3" placeholder="Write a comment..." value={text} onChange={(e) => setText(e.target.value)} required />
            <div className="formrow">
              {staff ? <label className="inline"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note (hidden from requester)</label> : <span />}
              <button className="primary">Add comment</button>
            </div>
          </form>
        </div>

        <aside>
          <div className="card">
            <h3>Details</h3>
            <dl>
              {staff && draft ? (
                <>
                  <label>Status
                    <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                      {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                    </select>
                  </label>
                  <label>Priority
                    <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{label(p)}</option>)}
                    </select>
                  </label>
                  <label>Assignee
                    <select value={draft.assigneeId} onChange={(e) => setDraft({ ...draft, assigneeId: e.target.value })}>
                      <option value="">Unassigned</option>
                      {staffList.filter((s) => s.role === 'ADMIN' || s.categoryIds.includes(req.categoryId)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </label>
                  <div className="savebar">
                    <button className="primary" disabled={!dirty || saving} onClick={save}>{saving ? 'Saving...' : 'Save changes'}</button>
                    <button disabled={!dirty || saving} onClick={() => setDraft(toDraft(req))}>Discard</button>
                  </div>
                  {dirty && <p className="unsaved">You have unsaved changes.</p>}
                </>
              ) : (
                <Field k="Assignee">{req.assignee?.name || 'Not assigned yet'}</Field>
              )}
              <Field k="Department">{req.department.name}</Field>
              <Field k="Category">{req.category.name}</Field>
              <Field k="Due date">{req.dueDate ? new Date(req.dueDate).toLocaleDateString() : 'None'}</Field>
              <Field k="Closed">{req.closedAt ? new Date(req.closedAt).toLocaleString() : '-'}</Field>
            </dl>
          </div>
          <div className="card">
            <h3>History</h3>
            <ul className="timeline">
              {req.activity.map((a) => (
                <li key={a.id}>
                  <span>{a.user.name} {label(a.action)}</span>
                  <span className="muted" title={new Date(a.createdAt).toLocaleString()}>{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
