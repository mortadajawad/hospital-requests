import { useEffect, useState, createContext, useContext } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { api, getToken, setToken } from './api.js';
import Login from './pages/Login.jsx';
import Requests from './pages/Requests.jsx';
import NewRequest from './pages/NewRequest.jsx';
import RequestDetail from './pages/RequestDetail.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Admin from './pages/Admin.jsx';
import Statistics from './pages/Statistics.jsx';
import { Icon, Avatar } from './ui.jsx';
import { useNotify } from './notify.jsx';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());
  const navigate = useNavigate();
  const { toast } = useNotify();

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = (token, u) => { setToken(token); setUser(u); navigate('/'); toast.success(`Welcome back, ${u.name.split(' ')[0]}`); };
  const logout = () => { setToken(null); setUser(null); navigate('/login'); toast.info('You have been signed out'); };

  if (loading) return <p className="center">Loading...</p>;

  const routes = (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={!user ? <Navigate to="/login" /> : user.role === 'REQUESTER' ? <Navigate to="/requests" /> : <Dashboard />} />
      <Route path="/requests" element={user ? <Requests /> : <Navigate to="/login" />} />
      <Route path="/statistics" element={user && user.role !== 'REQUESTER' ? <Statistics /> : <Navigate to="/" />} />
      <Route path="/admin" element={user?.role === 'ADMIN' ? <Admin /> : <Navigate to="/" />} />
      <Route path="/new" element={user ? <NewRequest /> : <Navigate to="/login" />} />
      <Route path="/requests/:id" element={user ? <RequestDetail /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {!user ? routes : (
        <div className="shell">
          <aside className="side">
            <div className="brand"><span className="brand-mark">+</span> Hospital Requests</div>
            <nav>
              {user.role !== 'REQUESTER' && <NavLink to="/" end><Icon name="grid" /> Dashboard</NavLink>}
              <NavLink to="/requests"><Icon name="list" /> Requests</NavLink>
              <NavLink to="/new"><Icon name="plus" /> New request</NavLink>
              {user.role !== 'REQUESTER' && <NavLink to="/statistics"><Icon name="chart" /> Statistics</NavLink>}
              {user.role === 'ADMIN' && <NavLink to="/admin"><Icon name="shield" /> Admin</NavLink>}
            </nav>
            <div className="me">
              <Avatar name={user.name} />
              <div>
                <div className="me-name">{user.name}</div>
                <div className="me-role">{user.role.toLowerCase()}</div>
              </div>
              <button onClick={logout}>Log out</button>
            </div>
          </aside>
          <div className="content"><main>{routes}</main></div>
        </div>
      )}
    </AuthContext.Provider>
  );
}
