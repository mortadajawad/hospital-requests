import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Icon, Avatar, timeAgo } from '../ui.jsx';
import { label } from './Requests.jsx';

function describe(a) {
  const d = a.details || {};
  if (a.action === 'CREATED') return 'created';
  if (a.action === 'COMMENTED') return 'commented on';
  if (a.action === 'INTERNAL_NOTE') return 'added an internal note to';
  const parts = [];
  if (d.status) parts.push(`changed the status to ${label(d.status[1])} on`);
  if (d.priority) parts.push(`set the priority to ${label(d.priority[1])} on`);
  if (d.assigneeId) parts.push('changed the assignee on');
  if (d.dueDate) parts.push('changed the due date on');
  return parts.length === 1 ? parts[0] : 'updated';
}

function ActivityDrawer({ items, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Recent activity">
        <div className="drawer-head">
          <h3>Recent activity</h3>
          <button onClick={onClose} aria-label="Close">Close</button>
        </div>
        <div className="drawer-body">
          {items.length === 0 && <p className="muted">No activity yet.</p>}
          {items.map((a) => (
            <div key={a.id} className="act">
              <Avatar name={a.user.name} small />
              <div>
                <div>
                  <strong>{a.user.name}</strong> {describe(a)}{' '}
                  {a.request && <Link to={`/requests/${a.request.id}`} onClick={onClose}>#{a.request.id} {a.request.title}</Link>}
                </div>
                <div className="muted" title={new Date(a.createdAt).toLocaleString()}>{timeAgo(a.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

function TaskRows({ items, empty }) {
  if (items.length === 0) return <p className="muted">{empty}</p>;
  return items.map((r) => (
    <div key={r.id} className={`taskrow pr-${r.priority}`}>
      <Link to={`/requests/${r.id}`}>#{r.id} {r.title}</Link>
      <div className="muted">
        {r.department.name} · <span className={`chip p-${r.priority}`}>{label(r.priority)}</span>{' '}
        <span className={`chip s-${r.status}`}>{label(r.status)}</span>
        {r.dueDate && ` · due ${new Date(r.dueDate).toLocaleDateString()}`}
      </div>
    </div>
  ));
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    const load = () => api('/dashboard').then(setData).catch((e) => setError(e.message));
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="center">Loading...</p>;

  const c = data.counts;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  const tiles = [
    ['New', c.new, 'NEW', `${c.createdToday} created today`],
    ['In progress', c.inProgress, 'IN_PROGRESS', 'Being worked on'],
    ['Waiting', c.waiting, 'WAITING', 'On hold or waiting for info'],
    ['Completed today', c.closedToday, 'DONE', 'Closed since midnight'],
  ];
  const attention = [
    ['Overdue requests', c.overdue, 'alert'],
    ['Urgent and still open', c.urgent, 'alert'],
    ['Open with no assignee', c.unassigned, 'warn'],
  ];
  const allClear = attention.every(([, n]) => n === 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h2>{greeting}, {user.name.split(' ')[0]}</h2>
          <p className="sub">{today}</p>
        </div>
        <div className="page-actions">
          <button className="btn-icon" onClick={() => setShowActivity(true)}><Icon name="clock" /> Recent activity</button>
          <Link to="/new" className="btn primary">New request</Link>
        </div>
      </div>

      <div className="tiles">
        {tiles.map(([name, value, status, foot]) => (
          <Link key={name} to={`/requests?status=${status}`} className={`tile t-${status}`}>
            <div className="name">{name}</div>
            <div className="num">{value}</div>
            <div className="foot">{foot}</div>
          </Link>
        ))}
      </div>

      <div className="dash2">
        <div className="card">
          <div className="card-head"><h3>My tasks</h3><Link to="/requests?mine=true">View all</Link></div>
          <TaskRows items={data.myTasks} empty="Nothing is assigned to you right now." />
        </div>
        <div>
          <div className="card">
            <h3>Needs attention</h3>
            {allClear ? <p className="muted">Nothing needs attention right now.</p> : (
              <ul className="attn">
                {attention.map(([name, n, tone]) => (
                  <li key={name}><span className={`badge ${n > 0 ? tone : ''}`}>{n}</span> {name}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="card">
            <h3>Waiting for an assignee</h3>
            <TaskRows items={data.unassigned} empty="Every open request has an assignee." />
          </div>
        </div>
      </div>

      {showActivity && <ActivityDrawer items={data.recent} onClose={() => setShowActivity(false)} />}
    </>
  );
}
