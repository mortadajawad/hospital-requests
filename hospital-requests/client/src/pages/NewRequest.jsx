import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { useNotify } from '../notify.jsx';

const PRIORITY_OPTIONS = [
  ['LOW', 'Low', 'Can wait'],
  ['NORMAL', 'Normal', 'Handle in the usual order'],
  ['HIGH', 'High', 'Needs attention soon'],
  ['URGENT', 'Urgent', 'Affects patient care or safety'],
];
const today = new Date().toISOString().slice(0, 10);

export default function NewRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useNotify();
  const [lookups, setLookups] = useState({ departments: [], categories: [] });
  const [form, setForm] = useState({
    title: '', description: '', categoryId: '', departmentId: user.departmentId || '', priority: 'NORMAL', dueDate: '',
  });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { api('/lookups').then(setLookups).catch((e) => setError(e.message)); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: Number(form.categoryId),
        departmentId: Number(form.departmentId),
        priority: form.priority,
        ...(form.dueDate && { dueDate: new Date(form.dueDate).toISOString() }),
      };
      const d = await api('/requests', { method: 'POST', body });
      toast.success(`Request #${d.request.id} sent`);
      navigate(`/requests/${d.request.id}`);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  return (
    <>
      <Link to="/requests" className="back">Back to requests</Link>
      <div className="page-head">
        <div>
          <h2>New request</h2>
          <p className="sub">Describe what you need and the right team will pick it up.</p>
        </div>
      </div>

      <div className="newreq">
        <form className="card formcard" onSubmit={submit}>
          <section>
            <h3>What do you need?</h3>
            <label>Title
              <input value={form.title} onChange={set('title')} required minLength={3} maxLength={200} placeholder="For example: Ventilator alarm not working in room 12" />
            </label>
            <label>Details
              <textarea rows="6" value={form.description} onChange={set('description')} required minLength={3} maxLength={5000} placeholder="What is happening, where, and since when? Include anything that helps the team act without calling you." />
            </label>
            <div className="counter">{form.description.length} / 5000</div>
          </section>

          <section>
            <h3>Where and what type?</h3>
            <div className="grid2">
              <label>Your department
                <select value={form.departmentId} onChange={set('departmentId')} required>
                  <option value="">Select a department</option>
                  {lookups.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <label>Category
                <select value={form.categoryId} onChange={set('categoryId')} required>
                  <option value="">Select a category</option>
                  {lookups.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section>
            <h3>How urgent is it?</h3>
            <div className="prio" role="group" aria-label="Priority">
              {PRIORITY_OPTIONS.map(([value, name, hint]) => (
                <button type="button" key={value} aria-pressed={form.priority === value}
                  className={`${form.priority === value ? 'on' : ''} ${value === 'URGENT' ? 'urgent' : ''}`}
                  onClick={() => setForm({ ...form, priority: value })}>
                  <strong>{name}</strong><span>{hint}</span>
                </button>
              ))}
            </div>
            <label className="datefield">Needed by (optional)
              <input type="date" min={today} value={form.dueDate} onChange={set('dueDate')} />
            </label>
          </section>

          {error && <p className="error">{error}</p>}
          <div className="actions">
            <Link to="/requests" className="btn">Cancel</Link>
            <button className="primary" disabled={sending}>{sending ? 'Sending...' : 'Send request'}</button>
          </div>
        </form>

        <aside className="card help">
          <h3>For a faster response</h3>
          <ul>
            <li>Use a short title that says what and where.</li>
            <li>Add the room, ward or equipment number.</li>
            <li>Choose Urgent only when patient care or safety is affected.</li>
            <li>Do not write patient names or ID numbers. Use the room or ticket number instead.</li>
          </ul>
        </aside>
      </div>
    </>
  );
}
