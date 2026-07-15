import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from './context/AuthProvider';
import { notificationService, type NotificationItem } from './services/notification.service';

// Pages
import HomePage       from './pages/Home';
import LoginPage      from './pages/Login';
import RegisterPage   from './pages/Register';
import DashboardPage  from './pages/Dashboard';
import ProfilePage    from './pages/Profile';
import QueueJoinPage  from './pages/QueueJoin';
import QueueTrackPage from './pages/QueueTrack';
import OrgSetupPage   from './pages/org/OrgSetup';
import OrgDashboardPage from './pages/org/OrgDashboard';
import BranchDisplayPage from './pages/org/BranchDisplay';
import StaffCounterPage from './pages/StaffCounter';
import ProtectedRoute from './components/ProtectedRoute';

/* ─── Avatar initials ─── */
function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const first = parts[0] ?? '';
  const last  = parts[parts.length - 1] ?? '';
  const init  = parts.length >= 2
    ? `${first[0] ?? ''}${last[0] ?? ''}`
    : name.slice(0, 2);
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
      userSelect: 'none', cursor: 'pointer',
      boxShadow: '0 0 0 2px rgba(99,102,241,0.4)'
    }}>
      {init.toUpperCase()}
    </div>
  );
}

/* ─── User dropdown ─── */
function UserDropdown({ user, onLogout }: { user: { firstName: string; lastName: string; email: string; role: string }; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
        <Initials name={fullName} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 46, right: 0,
          width: 220,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--glass-border)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(24px)',
          overflow: 'hidden',
          animation: 'scaleIn 0.2s ease forwards',
          transformOrigin: 'top right',
          zIndex: 200
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{fullName}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
          </div>

          {/* Items */}
          {[
            { label: '🏠  Dashboard', path: '/dashboard' },
            { label: '👤  Profile',   path: '/profile' },
            { label: '🎫  My Queues', path: '/queues/join' },
            { label: '🖥️  Staff Desk', path: '/staff/counter' },
            ...(user?.role === 'ORG_ADMIN' ? [{ label: '🏢  My Organization', path: '/org/dashboard' }] : [])
          ].map(item => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setOpen(false); }}
              style={{
                display: 'block', width: '100%', padding: '10px 16px',
                background: 'none', border: 'none', textAlign: 'left',
                fontSize: 14, color: 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--glass)'; (e.target as HTMLElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'none'; (e.target as HTMLElement).style.color = 'var(--text-secondary)'; }}
            >
              {item.label}
            </button>
          ))}

          <div style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
            <button
              onClick={() => { onLogout(); setOpen(false); }}
              style={{
                display: 'block', width: '100%', padding: '10px 16px',
                background: 'none', border: 'none', textAlign: 'left',
                fontSize: 14, color: 'var(--error)', cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'none'; }}
            >
              🚪  Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Notification Bell ─── */
function NotificationBell() {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    void notificationService.requestBrowserPermission();

    let firstLoad = true;
    const unsub = notificationService.subscribeUserNotifications(user.id, (list) => {
      setNotifications(list);
      setUnread(list.filter(n => n.status === 'UNREAD').length);

      // Sound & Browser notification
      if (!firstLoad && list.length > 0) {
        const latest = list[0];
        if (latest && latest.status === 'UNREAD') {
          notificationService.showBrowserNotification(latest.title, latest.body);
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
          } catch {}
        }
      }
      firstLoad = false;
    });

    return unsub;
  }, [user]);

  const handleMarkAllRead = async () => {
    const unreadItems = notifications.filter(n => n.status === 'UNREAD');
    await Promise.all(unreadItems.map(n => notificationService.markAsRead(n.id)));
  };

  const handleMarkRead = async (id: string) => {
    await notificationService.markAsRead(id);
  };

  if (!user) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button 
        onClick={() => setOpen(o => !o)} 
        style={{ 
          background: 'var(--glass)', 
          border: '1px solid var(--glass-border)', 
          padding: '8px 10px', 
          borderRadius: 10,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.2s',
          fontSize: 16
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass)'; }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: 18, height: 18, borderRadius: '50%',
            background: 'var(--error)', color: 'white',
            fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 2px var(--bg-base)'
          }}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 46, right: 0,
          width: 320,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--glass-border)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(24px)',
          overflow: 'hidden',
          animation: 'scaleIn 0.2s ease forwards',
          transformOrigin: 'top right',
          zIndex: 200
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Notifications</p>
            {unread > 0 && (
              <button 
                onClick={handleMarkAllRead} 
                style={{ background: 'none', border: 'none', color: 'var(--accent-hover)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <p style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No notifications yet.
              </p>
            ) : (
              notifications.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => handleMarkRead(item.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    background: item.status === 'UNREAD' ? 'var(--accent-soft)' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = item.status === 'UNREAD' ? 'var(--accent-soft)' : 'none'; }}
                >
                  <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{item.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>{item.body}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                    {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Navbar ─── */
function Navbar() {
  const { isAuthenticated, loading, user, logout } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = location.pathname === '/';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(255, 253, 241, 0.85)',
      backdropFilter: 'blur(24px) saturate(2)',
      WebkitBackdropFilter: 'blur(24px) saturate(2)',
      borderBottom: '1px solid var(--border)'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: 'var(--shadow-accent)'
          }}>
            🎫
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Queue<span style={{ color: 'var(--accent-hover)' }}>Less</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="desktop-nav">
          {isAuthenticated && (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Dashboard</NavLink>
              <NavLink to="/queues/join" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Join Queue</NavLink>
              <NavLink to="/staff/counter" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Staff Desk</NavLink>
              {user?.role === 'ORG_ADMIN' && (
                <NavLink to="/org/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>My Org</NavLink>
              )}
            </>
          )}

          {!isAuthenticated && !isHome && (
            <>
              <NavLink to="/login"    className="nav-link">Login</NavLink>
              <NavLink to="/register" className={({ isActive }) => `btn btn-primary btn-sm${isActive ? '' : ''}`} style={{ marginLeft: 4 }}>Get Started</NavLink>
            </>
          )}
          {!isAuthenticated && isHome && (
            <>
              <NavLink to="/login"    className="nav-link">Login</NavLink>
              <NavLink to="/register" className="btn btn-primary btn-sm" style={{ marginLeft: 4 }}>Get Started</NavLink>
            </>
          )}

          {!loading && isAuthenticated && user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 8 }}>
              <NotificationBell />
              <UserDropdown user={user} onLogout={handleLogout} />
            </div>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileOpen(o => !o)}
          style={{
            display: 'none',
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            borderRadius: 8,
            padding: '6px 10px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: 18
          }}
          className="mobile-menu-btn"
          aria-label="Toggle menu"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          background: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border)',
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}
          className="mobile-menu"
        >
          {isAuthenticated && (
            <>
              <Link to="/dashboard"     onClick={() => setMobileOpen(false)} className="nav-link">Dashboard</Link>
              <Link to="/queues/join"   onClick={() => setMobileOpen(false)} className="nav-link">Join Queue</Link>
              <Link to="/staff/counter" onClick={() => setMobileOpen(false)} className="nav-link">Staff Desk</Link>
              {user?.role === 'ORG_ADMIN' && (
                <Link to="/org/dashboard" onClick={() => setMobileOpen(false)} className="nav-link">My Org</Link>
              )}
              <Link to="/profile"       onClick={() => setMobileOpen(false)} className="nav-link">Profile</Link>
              <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>Sign out</button>
            </>
          )}
          {!isAuthenticated && (
            <>
              <Link to="/login"    onClick={() => setMobileOpen(false)} className="nav-link">Login</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </header>
  );
}

/* ─── App ─── */
export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <Routes>
          {/* Public */}
          <Route path="/"          element={<HomePage />} />
          <Route path="/login"     element={<LoginPage />} />
          <Route path="/register"  element={<RegisterPage />} />

          {/* Protected — Customer */}
          <Route path="/dashboard"       element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/profile"         element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/queues/join"     element={<ProtectedRoute><QueueJoinPage /></ProtectedRoute>} />
          <Route path="/queues/track/:id" element={<ProtectedRoute><QueueTrackPage /></ProtectedRoute>} />
          <Route path="/staff/counter"    element={<ProtectedRoute><StaffCounterPage /></ProtectedRoute>} />

          {/* Protected — Org Admin */}
          <Route path="/org/setup"     element={<ProtectedRoute allowedRoles={['ORG_ADMIN']}><OrgSetupPage /></ProtectedRoute>} />
          <Route path="/org/dashboard" element={<ProtectedRoute allowedRoles={['ORG_ADMIN']}><OrgDashboardPage /></ProtectedRoute>} />
          <Route path="/org/display/:branchId" element={<BranchDisplayPage />} />

          {/* 404 */}
          <Route path="*" element={
            <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <div style={{ fontSize: 64 }}>🤔</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>Page not found</h1>
              <p style={{ color: 'var(--text-secondary)' }}>The page you're looking for doesn't exist.</p>
              <Link to="/" className="btn btn-primary">Go Home</Link>
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}
