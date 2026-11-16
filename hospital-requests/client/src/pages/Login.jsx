import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';

const POINTS = [
  'Send a request in under a minute',
  'Reach the right team automatically',
];

const Check = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <circle cx="10" cy="10" r="9" fill="none" stroke="#4fd1c5" strokeWidth="1.5" />
    <path d="M6 10.5l2.7 2.7L14 7.8" fill="none" stroke="#4fd1c5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function savedEmail() {
  try { return localStorage.getItem('lastEmail') || ''; } catch { return ''; }
}

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(!!savedEmail());
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const d = await api('/auth/login', { method: 'POST', body: { email, password } });
      try { remember ? localStorage.setItem('lastEmail', email) : localStorage.removeItem('lastEmail'); } catch { /* storage unavailable */ }
      login(d.token, d.user);
    } catch (err) {
      setError(err.status === 401 ? 'Wrong email or password. Please try again.' : err.message);
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <section className="login-art">
        <div className="login-art-top">
          <div className="brand"><span className="brand-mark">+</span> Hospital Requests</div>
          <h1>Every department request, in one place.</h1>
          <ul className="points">
            {POINTS.map((p) => <li key={p}><Check /> {p}</li>)}
          </ul>
        </div>
        <svg className="ecg" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true">
          <path className="ecg-base" d="M0 70 H140 l10 -8 l10 8 H210 l10 16 l16 -78 l16 100 l12 -38 H350 l12 -12 l14 12 H600" />
          <path className="ecg-line" pathLength="1000" d="M0 70 H140 l10 -8 l10 8 H210 l10 16 l16 -78 l16 100 l12 -38 H350 l12 -12 l14 12 H600" />
        </svg>
        <p className="login-note">Internal system for authorized hospital staff.</p>
      </section>

      <section className="login-form">
        <form onSubmit={submit}>
          <h2>Welcome back</h2>
          <p className="sub">Sign in to the request desk.</p>

          <label>Email
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus={!email} placeholder="name@hospital.local" />
          </label>

          <label>Password
            <span className="pwfield">
              <input
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) => setCaps(e.getModifierState('CapsLock'))}
                autoFocus={!!email}
                required
              />
              <button type="button" className="showpw" onClick={() => setShow(!show)} aria-pressed={show}>{show ? 'Hide' : 'Show'}</button>
            </span>
          </label>
          {caps && <p className="caps">Caps Lock is on.</p>}

          <div className="login-row">
            <label className="inline"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember my email</label>
          </div>

          {error && <p className="error" role="alert">{error}</p>}
          <button className="primary signin" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
          <p className="help">Forgot your password or need an account?</p>
          <p className="help">Contact your system administrator.</p>
        </form>
      </section>
    </div>
  );
}
