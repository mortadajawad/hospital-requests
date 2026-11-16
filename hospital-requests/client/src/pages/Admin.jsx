import { Fragment, useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { useNotify } from '../notify.jsx';

const ROLES = ['REQUESTER', 'STAFF', 'ADMIN'];
const sameIds = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

function NameList({ title, singular, path, items, reload }) {
  const { toast, confirm, prompt } = useNotify();
  const [name, setName] = useState('');

  async function run(action, message) {
    try { await action(); toast.success(message); reload(); } catch (e) { toast.error(e.message); }
  }

  async function rename(i) {
    const n = await prompt({ title: `Rename ${singular.toLowerCase()}`, label: 'New name', initial: i.name, confirmLabel: 'Save' });
    if (n && n !== i.name) run(() => api(`/admin/${path}/${i.id}`, { method: 'PATCH', body: { name: n } }), `Renamed to "${n}"`);
  }

  async function remove(i) {
    const ok = await confirm({ title: `Delete ${singular.toLowerCase()} "${i.name}"?`, message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (ok) run(() => api(`/admin/${path}/${i.id}`, { method: 'DELETE' }), `"${i.name}" deleted`);
  }

  return (
    <div className="card">
      <h3>{title}</h3>
      <form className="filters" onSubmit={(e) => { e.preventDefault(); run(async () => { await api(`/admin/${path}`, { method: 'POST', body: { name } }); setName(''); }, `${singular} "${name}" added`); }}>
        <input placeholder={`New ${singular.toLowerCase()} name`} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        <button className="primary">Add</button>
      </form>
      <ul className="plain">
        {items.map((i) => (
          <li key={i.id} className="row">
            <span>{i.name}</span>
            <span>
              <button className="btn-sm" onClick={() => rename(i)}>Rename</button>{' '}
              <button className="btn-sm" onClick={() => remove(i)}>Delete</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Admin() {
  const { user: me } = useAuth();
  const { toast, confirm, prompt } = useNotify();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [lookups, setLookups] = useState({ departments: [], categories: [] });
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'REQUESTER', departmentId: '' });

  const load = useCallback(() => {
    api('/admin/users').then((d) => setUsers(d.users)).catch((e) => setError(e.message));
    api('/lookups').then(setLookups).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Edits to a user are kept as a draft until the Save button is pressed
  const base = (u) => ({ role: u.role, departmentId: u.departmentId, categoryIds: u.handledCategories.map((c) => c.id) });
  const current = (u) => ({ ...base(u), ...drafts[u.id] });
  const isDirty = (u) => { const b = base(u); const c = current(u); return b.role !== c.role || b.departmentId !== c.departmentId || !sameIds(b.categoryIds, c.categoryIds); };
  const edit = (u, patch) => setDrafts((d) => ({ ...d, [u.id]: { ...base(u), ...d[u.id], ...patch } }));
  const discard = (u) => setDrafts((d) => { const rest = { ...d }; delete rest[u.id]; return rest; });

  async function patchUser(u, body, message) {
    try {
      await api(`/admin/users/${u.id}`, { method: 'PATCH', body });
      toast.success(message);
      discard(u);
      load();
    } catch (e) { toast.error(e.message); }
  }

  function save(u) {
    const c = current(u);
    patchUser(u, { role: c.role, departmentId: c.departmentId, ...(c.role === 'STAFF' && { categoryIds: c.categoryIds }) }, `Changes saved for ${u.name}`);
  }

  async function toggleActive(u) {
    if (u.active) {
      const ok = await confirm({ title: `Deactivate ${u.name}?`, message: 'They will no longer be able to sign in. You can activate them again later.', confirmLabel: 'Deactivate', danger: true });
      if (!ok) return;
    }
    patchUser(u, { active: !u.active }, `${u.name} ${u.active ? 'deactivated' : 'activated'}`);
  }

  async function resetPassword(u) {
    const p = await prompt({ title: `New password for ${u.name}`, label: 'At least 8 characters', type: 'password', confirmLabel: 'Reset password' });
    if (!p) return;
    if (p.length < 8) return toast.error('The password must have at least 8 characters.');
    patchUser(u, { password: p }, `Password changed for ${u.name}`);
  }

  async function createUser(e) {
    e.preventDefault();
    try {
      await api('/auth/users', { method: 'POST', body: { ...form, departmentId: form.departmentId ? Number(form.departmentId) : undefined } });
      toast.success(`User ${form.name} created`);
      setForm({ name: '', email: '', password: '', role: 'REQUESTER', departmentId: '' });
      load();
    } catch (err) { toast.error(err.message); }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <h2>Administration</h2>
      <div className="filters">
        {['users', 'departments', 'categories'].map((t) => (
          <button key={t} className={tab === t ? 'primary' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}

      {tab === 'users' && (
        <>
          <form className="card" onSubmit={createUser}>
            <h3>Add user</h3>
            <div className="filters">
              <input placeholder="Full name" value={form.name} onChange={set('name')} required minLength={2} />
              <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
              <input type="password" placeholder="Password (8+ chars)" value={form.password} onChange={set('password')} required minLength={8} />
              <select value={form.role} onChange={set('role')}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
              <select value={form.departmentId} onChange={set('departmentId')}>
                <option value="">No department</option>
                {lookups.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button className="primary">Create</button>
            </div>
          </form>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Handles requests for</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => {
                const c = current(u);
                const dirty = isDirty(u);
                return (
                  <Fragment key={u.id}>
                    <tr className={dirty ? 'dirty' : ''} style={u.active ? {} : { opacity: 0.55 }}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <select value={c.role} disabled={u.id === me.id} onChange={(e) => edit(u, { role: e.target.value })}>
                          {ROLES.map((r) => <option key={r}>{r}</option>)}
                        </select>
                      </td>
                      <td>
                        <select value={c.departmentId ?? ''} onChange={(e) => edit(u, { departmentId: e.target.value ? Number(e.target.value) : null })}>
                          <option value="">None</option>
                          {lookups.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </td>
                      <td>
                        {c.role === 'ADMIN' ? <span className="muted">Everything</span>
                          : c.role === 'REQUESTER' ? <span className="muted">-</span>
                          : <>
                              {c.categoryIds.length === 0
                                ? <span className="warn-text">None yet (sees no requests)</span>
                                : lookups.categories.filter((x) => c.categoryIds.includes(x.id)).map((x) => <span key={x.id} className="chip">{x.name}</span>)}{' '}
                              <button className="btn-sm" onClick={() => setOpen(open === u.id ? null : u.id)}>Edit</button>
                            </>}
                      </td>
                      <td>{u.active ? 'Active' : 'Deactivated'}</td>
                      <td>
                        <div className="row-actions">
                          {dirty && (
                            <>
                              <button className="primary btn-sm" onClick={() => save(u)}>Save</button>
                              <button className="btn-sm" onClick={() => discard(u)}>Discard</button>
                            </>
                          )}
                          <button className="btn-sm" disabled={u.id === me.id} onClick={() => toggleActive(u)}>{u.active ? 'Deactivate' : 'Activate'}</button>
                          <button className="btn-sm" onClick={() => resetPassword(u)}>Reset password</button>
                        </div>
                      </td>
                    </tr>
                    {open === u.id && c.role === 'STAFF' && (
                      <tr>
                        <td colSpan="7">
                          <div className="filters">
                            <strong>{u.name} receives requests for:</strong>
                            {lookups.categories.map((cat) => {
                              const has = c.categoryIds.includes(cat.id);
                              return (
                                <label key={cat.id} className="inline">
                                  <input type="checkbox" checked={has} onChange={() => edit(u, { categoryIds: has ? c.categoryIds.filter((x) => x !== cat.id) : [...c.categoryIds, cat.id] })} /> {cat.name}
                                </label>
                              );
                            })}
                            <span className="muted">Press Save in the row to apply.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {tab === 'departments' && <NameList title="Departments" singular="Department" path="departments" items={lookups.departments} reload={load} />}
      {tab === 'categories' && <NameList title="Categories" singular="Category" path="categories" items={lookups.categories} reload={load} />}
    </>
  );
}
