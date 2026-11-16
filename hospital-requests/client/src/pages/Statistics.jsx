import { useEffect, useState } from 'react';
import { api, getToken } from '../api.js';
import { useNotify } from '../notify.jsx';
import { label } from './Requests.jsx';

const RANGES = [[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days'], [365, 'Last 12 months']];

function duration(hours) {
  if (hours == null) return '-';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

function BarList({ items, empty = 'No data in this period.' }) {
  if (!items.length) return <p className="muted">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="plain">
      {items.map((i) => (
        <li key={i.label} className="barrow">
          <span className="barlabel">{i.label}</span>
          <span className="bartrack"><span className="barfill" style={{ width: `${(i.value / max) * 100}%` }} /></span>
          <span className="barvalue">{i.value}</span>
        </li>
      ))}
    </ul>
  );
}

function Columns({ data, series = ['value'], tick = (l) => l, height = 130 }) {
  const max = Math.max(...data.flatMap((d) => series.map((s) => d[s])), 1);
  const every = Math.ceil(data.length / 12);
  return (
    <div className="cols" style={{ height: height + 22 }}>
      {data.map((d, i) => (
        <div key={d.label} className="col" title={`${d.label}: ${series.map((s) => d[s]).join(' / ')}`}>
          <div className="colbars" style={{ height }}>
            {series.map((s, k) => (
              <span key={s} className={`colbar c${k}`} style={{ height: `${(d[s] / max) * 100}%` }} />
            ))}
          </div>
          <span className="collabel">{i % every === 0 ? tick(d.label) : ''}</span>
        </div>
      ))}
    </div>
  );
}

export default function Statistics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const { toast } = useNotify();

  useEffect(() => {
    setData(null);
    api(`/stats?days=${days}`).then(setData).catch((e) => setError(e.message));
  }, [days]);

  async function download() {
    const res = await fetch(`/api/stats/export?days=${days}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return toast.error('Download failed');
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = `requests-last-${days}-days.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Download started');
  }

  if (error) return <p className="error">{error}</p>;

  const s = data?.summary;
  const lateRate = s && s.withDeadline ? `${Math.round((s.late / s.withDeadline) * 100)}%` : '-';
  const cards = s && [
    ['Requests created', s.total, ''],
    ['Completed', s.done, ''],
    ['Still open', s.open, ''],
    ['Cancelled', s.cancelled, ''],
    ['Average first response', duration(s.avgResponseHours), ''],
    ['Average time to complete', duration(s.avgResolutionHours), ''],
    ['Requests with a deadline', s.withDeadline, ''],
    ['Late (of those with a deadline)', lateRate, s.late > 0 ? 'alert' : ''],
  ];

  return (
    <>
      <div className="page-head">
        <h2>Statistics</h2>
        <div className="filters">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={download}>Download for Excel</button>
        </div>
      </div>

      {!data ? <p className="center">Loading...</p> : (
        <>
          <div className="stats">
            {cards.map(([name, value, tone]) => (
              <div key={name} className={`stat ${tone}`}><div className="num">{value}</div><div>{name}</div></div>
            ))}
          </div>

          <div className="card">
            <h3>Requests over time</h3>
            <p className="muted legend"><span className="key c0" /> Created <span className="key c1" /> Completed</p>
            <Columns data={data.trend} series={['created', 'closed']} tick={(l) => l.slice(data.unit === 'month' ? 0 : 5)} />
          </div>

          <div className="two-col">
            <div className="card"><h3>By department</h3><BarList items={data.byDepartment} /></div>
            <div className="card"><h3>By category</h3><BarList items={data.byCategory} /></div>
          </div>

          <div className="two-col">
            <div className="card"><h3>By status</h3><BarList items={data.byStatus.map((x) => ({ ...x, label: label(x.label) }))} /></div>
            <div className="card"><h3>By day of the week</h3><Columns data={data.byWeekday} /></div>
          </div>

          <div className="card">
            <h3>Busiest hours of the day</h3>
            <Columns data={data.byHour} tick={(l) => `${l}h`} />
          </div>
        </>
      )}
    </>
  );
}
