import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthProvider';
import { queueService, type QueueEntry } from '../services/queue.service';
import { organizationService, type Organization } from '../services/organization.service';
import LoadingSpinner from '../components/LoadingSpinner';

/* ─── Stat card ─── */
function StatCard({ icon, label, value, sub, color = 'var(--accent)' }: {
  icon: string; label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${color}22`,
          border: `1px solid ${color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
        }}>{icon}</div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--glass)', padding: '3px 8px', borderRadius: 20 }}>Today</span>
      </div>
      <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{label}</p>
      {sub && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

/* ─── Queue entry row ─── */
function QueueRow({ entry }: { entry: QueueEntry }) {
  const statusConfig: Record<string, { label: string; cls: string }> = {
    WAITING:   { label: '⏳ Waiting',   cls: 'badge-warning' },
    CALLED:    { label: '📢 Called!',   cls: 'badge-success' },
    COMPLETED: { label: '✅ Completed', cls: 'badge-muted' },
    CANCELLED: { label: '❌ Cancelled', cls: 'badge-error' },
    SKIPPED:   { label: '⏭ Skipped',   cls: 'badge-muted' }
  };
  const sc = statusConfig[entry.status] ?? statusConfig['WAITING']!;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px',
      background: entry.status === 'CALLED' ? 'rgba(16,185,129,0.06)' : 'var(--glass)',
      border: `1px solid ${entry.status === 'CALLED' ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
      borderRadius: 12, marginBottom: 8, transition: 'all 0.2s',
      gap: 12, flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          fontWeight: 900, fontSize: 20, color: entry.status === 'CALLED' ? 'var(--success)' : 'var(--accent-hover)',
          fontFamily: 'monospace', minWidth: 70
        }}>
          {entry.tokenCode}
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{entry.serviceName}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {entry.organizationName} · {entry.branchName}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {entry.status === 'WAITING' && entry.estimatedWaitMins !== undefined && (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>~{entry.estimatedWaitMins} min</span>
        )}
        <span className={`badge ${sc.cls}`}>{sc.label}</span>
        {(entry.status === 'WAITING' || entry.status === 'CALLED') && (
          <Link
            to={`/queues/track/${entry.id}`}
            className="btn btn-secondary btn-sm"
            style={{ padding: '5px 12px' }}
          >
            Track →
          </Link>
        )}
      </div>
    </div>
  );
}

/* ─── Dashboard ─── */
export default function DashboardPage() {
  const { user } = useAuthContext();
  const [activeQueues,  setActiveQueues]  = useState<QueueEntry[]>([]);
  const [recentQueues,  setRecentQueues]  = useState<QueueEntry[]>([]);
  const [myOrgs,        setMyOrgs]        = useState<Organization[]>([]);
  const [allOrgs,       setAllOrgs]       = useState<Organization[]>([]);
  const [dataReady,     setDataReady]     = useState(false);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    // 1. Load all data immediately via getDocs (resolves from cache first)
    const loadAll = async () => {
      try {
        const [active, recent, orgs, list] = await Promise.all([
          queueService.getCustomerActiveQueues(user.id),
          queueService.getCustomerQueueHistory(user.id, 5),
          organizationService.getByOwner(user.id),
          organizationService.getAll()
        ]);
        if (!cancelled) {
          setActiveQueues(active);
          setRecentQueues(recent);
          setMyOrgs(orgs);
          setAllOrgs(list);
        }
      } catch (err) {
        console.error('Dashboard data load failed:', err);
      } finally {
        if (!cancelled) setDataReady(true);
      }
    };

    void loadAll();

    // 2. Background: subscribe for live updates (keeps active queues in sync)
    const unsubActive = queueService.subscribeCustomerActiveQueues(user.id, (active) => {
      if (!cancelled) {
        setActiveQueues(active);
        setDataReady(true);
      }
    });

    return () => {
      cancelled = true;
      unsubActive();
    };
  }, [user]);

  return (
    <div className="bg-mesh" style={{ minHeight: 'calc(100vh - 64px)', padding: '40px 0 80px' }}>
      <div className="container">
        {/* ── Header ── */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {greeting}, {user?.firstName} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
            Here's what's happening with your queues today.
          </p>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 40 }}>
          <StatCard icon="🎫" label="Active queues"   value={activeQueues.length}  color="#6366f1" />
          <StatCard icon="✅" label="Completed today" value={recentQueues.filter(q => q.status === 'COMPLETED').length} color="#10b981" />
          <StatCard icon="🏢" label="Organizations"   value={myOrgs.length}         color="#8b5cf6" />
          <StatCard icon="⏱️" label="Avg wait saved"  value="18 min" sub="vs physical queue" color="#06b6d4" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }} className="dashboard-grid">
          {/* ── Main column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Active queues */}
            <div className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>Active Queues</h2>
                <Link to="/queues/join" className="btn btn-primary btn-sm">+ Join Queue</Link>
              </div>

              {!dataReady ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                  <LoadingSpinner size="sm" label="Loading queues…" />
                </div>
              ) : activeQueues.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🎫</div>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No active queues</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>Join a queue to get started</p>
                  <Link to="/queues/join" className="btn btn-primary">Find a Queue</Link>
                </div>
              ) : (
                activeQueues.map(q => <QueueRow key={q.id} entry={q} />)
              )}
            </div>

            {/* Available Organizations to Join */}
            <div className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>Available Organizations to Join</h2>
                <Link to="/queues/join" style={{ fontSize: 13, color: 'var(--accent-hover)', textDecoration: 'none', fontWeight: 600 }}>See All →</Link>
              </div>

              {allOrgs.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 14 }}>
                  No active organizations available right now.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                  {allOrgs.slice(0, 4).map(org => {
                    // Category icons helper
                    const icons: Record<string, string> = {
                      hospital: '🏥', bank: '🏦', government: '🏛️', restaurant: '🍽️',
                      college: '🎓', 'auto service': '🚗', salon: '💇', retail: '🏪'
                    };
                    const icon = icons[org.category.toLowerCase()] ?? '🏢';

                    return (
                      <div 
                        key={org.id} 
                        style={{
                          background: 'var(--glass)',
                          border: '1px solid var(--border)',
                          borderRadius: 14,
                          padding: 18,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 12
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 20 }}>{icon}</span>
                            <span className="badge badge-primary" style={{ fontSize: 10, padding: '2px 6px' }}>{org.category}</span>
                          </div>
                          <h4 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {org.name}
                          </h4>
                          {org.tagline && (
                            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {org.tagline}
                            </p>
                          )}
                        </div>
                        <Link 
                          to={`/queues/join?orgId=${org.id}`}
                          className="btn btn-primary btn-sm"
                          style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '6px 0' }}
                        >
                          Join Queue →
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent history */}
            {recentQueues.length > 0 && (
              <div className="glass-card" style={{ padding: 24 }}>
                <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 20 }}>Recent History</h2>
                {recentQueues.map(q => <QueueRow key={q.id} entry={q} />)}
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Quick actions */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 16 }}>Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link to="/queues/join" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                  🎫 Join a Queue
                </Link>
                {user?.role === 'ORG_ADMIN' && myOrgs.length === 0 && (
                  <Link to="/org/setup" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                    🏢 Create Organization
                  </Link>
                )}
                {user?.role === 'ORG_ADMIN' && myOrgs.length > 0 && (
                  <Link to="/org/dashboard" className="btn btn-ghost" style={{ justifyContent: 'center' }}>
                    📊 View Org Dashboard
                  </Link>
                )}
              </div>
            </div>

            {/* My organizations */}
            {myOrgs.length > 0 && (
              <div className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>My Organizations</h3>
                  <Link to="/org/setup" style={{ fontSize: 13, color: 'var(--accent-hover)', textDecoration: 'none' }}>+ New</Link>
                </div>
                {myOrgs.slice(0, 3).map(org => (
                  <div key={org.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 10,
                    background: 'var(--glass)', marginBottom: 8,
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: 'var(--accent-soft)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                    }}>🏢</div>
                    <div style={{ overflow: 'hidden' }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{org.category}</p>
                    </div>
                    <span className={`badge ${org.status === 'ACTIVE' ? 'badge-success' : 'badge-muted'}`} style={{ marginLeft: 'auto', flexShrink: 0 }}>
                      {org.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Tips */}
            <div style={{
              padding: 20, borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
              border: '1px solid rgba(99,102,241,0.2)'
            }}>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, fontSize: 14 }}>💡 Pro Tip</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                You can track your live queue position in real-time. The tracker updates automatically — no need to refresh.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
