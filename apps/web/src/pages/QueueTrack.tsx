import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { queueService, type QueueEntry } from '../services/queue.service';
import { useAuthContext } from '../context/AuthProvider';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  WAITING:   { label: 'Waiting',   color: 'var(--warning)',    bg: 'rgba(245,158,11,0.08)',   icon: '⏳' },
  CALLED:    { label: 'It\'s your turn!', color: 'var(--success)', bg: 'rgba(16,185,129,0.1)', icon: '📢' },
  COMPLETED: { label: 'Completed', color: 'var(--text-muted)', bg: 'var(--glass)',             icon: '✅' },
  CANCELLED: { label: 'Cancelled', color: 'var(--error)',      bg: 'var(--error-soft)',        icon: '❌' },
  SKIPPED:   { label: 'Skipped',   color: 'var(--text-muted)', bg: 'var(--glass)',             icon: '⏭' }
};

function PositionRing({ position }: { position: number }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer pulse ring */}
      <div style={{
        position: 'absolute', inset: -8, borderRadius: '50%',
        border: '2px solid rgba(99,102,241,0.3)',
        animation: 'pulse-ring 2.5s ease-out infinite'
      }} />
      <div style={{
        width: 120, height: 120, borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--accent-soft), rgba(139,92,246,0.1))',
        border: '2px solid rgba(99,102,241,0.3)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        <p style={{ fontSize: 40, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{position}</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ahead</p>
      </div>
    </div>
  );
}

export default function QueueTrackPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [entry,     setEntry]     = useState<QueueEntry | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled,  setCancelled]  = useState(false);

  useEffect(() => {
    if (!id) return;

    // Live subscription
    const unsub = queueService.subscribeToQueue(id, (data) => {
      setEntry(data);
      setLoading(false);
    });

    return unsub;
  }, [id]);

  const handleCancel = async () => {
    if (!id || !user) return;
    if (!confirm('Are you sure you want to cancel your queue position?')) return;
    setCancelling(true);
    try {
      await queueService.cancelQueue(id);
      setCancelled(true);
    } catch (err) {
      console.error(err);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingSpinner size="lg" label="Connecting to live queue…" />
    </div>
  );

  if (!entry) return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🤔</div>
      <h2 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Queue not found</h2>
      <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
    </div>
  );

  const sc = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG['WAITING']!;
  const isCalled    = entry.status === 'CALLED';
  const isTerminal  = ['COMPLETED', 'CANCELLED', 'SKIPPED'].includes(entry.status);

  return (
    <div className="bg-mesh" style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        {/* Live indicator */}
        {!isTerminal && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span className="badge badge-success badge-dot">Live Tracking</span>
          </div>
        )}

        {/* Called alert */}
        {isCalled && (
          <div
            className="animate-fadeIn"
            style={{
              padding: '16px 24px', borderRadius: 14, marginBottom: 24,
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.3)',
              textAlign: 'center',
              animation: 'glow-pulse 2s ease infinite'
            }}
          >
            <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>📢 Your turn is now!</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Please proceed to the counter.</p>
          </div>
        )}

        {/* Main card */}
        <div
          className="glass-card"
          style={{
            padding: '36px 28px', textAlign: 'center',
            borderColor: isCalled ? 'rgba(16,185,129,0.3)' : 'var(--glass-border)',
            boxShadow: isCalled ? '0 0 40px rgba(16,185,129,0.12), var(--shadow-lg)' : 'var(--shadow-lg)'
          }}
        >
          {/* Org info */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              {entry.organizationName} · {entry.branchName}
            </p>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{entry.serviceName}</p>
          </div>

          {/* Token */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Your Token</p>
            <p className="token-display">{entry.tokenCode}</p>
          </div>

          {/* Status badge */}
          <div style={{ marginBottom: 32 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 20px', borderRadius: 40,
              background: sc.bg, color: sc.color,
              fontWeight: 700, fontSize: 16,
              border: `1px solid ${sc.color}44`
            }}>
              {sc.icon} {sc.label}
            </span>
          </div>

          {/* Live stats */}
          {entry.status === 'WAITING' && (
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 32 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <PositionRing position={entry.positionInQueue ?? 1} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>ahead of you</p>
              </div>

              {entry.estimatedWaitMins !== undefined && (
                <>
                  <div style={{ width: 1, background: 'var(--border)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: 40, fontWeight: 800, color: 'var(--success)' }}>~{entry.estimatedWaitMins}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>min estimated</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Progress bar (for position) */}
          {entry.status === 'WAITING' && entry.positionInQueue !== undefined && entry.tokenNumber > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.max(5, Math.min(95, ((entry.tokenNumber - (entry.positionInQueue ?? 0)) / entry.tokenNumber) * 100))}%` }}
                />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Token #{entry.tokenNumber} · Updated live
              </p>
            </div>
          )}

          {/* Terminal state messages */}
          {entry.status === 'COMPLETED' && (
            <div style={{ padding: '16px', background: 'var(--success-soft)', borderRadius: 10, marginBottom: 24 }}>
              <p style={{ color: 'var(--success)', fontWeight: 600 }}>✅ Service completed!</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Thank you for using QueueLess.</p>
            </div>
          )}
          {(entry.status === 'CANCELLED' || cancelled) && (
            <div style={{ padding: '16px', background: 'var(--error-soft)', borderRadius: 10, marginBottom: 24 }}>
              <p style={{ color: 'var(--error)', fontWeight: 600 }}>Queue cancelled.</p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {isTerminal || cancelled ? (
              <>
                <Link to="/queues/join" className="btn btn-primary">Join Another Queue</Link>
                <Link to="/dashboard"  className="btn btn-secondary">Dashboard</Link>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="btn btn-danger"
                >
                  {cancelling ? <><span className="spinner" /> Cancelling…</> : '✕ Cancel Queue'}
                </button>
                <Link to="/dashboard" className="btn btn-secondary">Dashboard</Link>
              </>
            )}
          </div>
        </div>

        {/* Info note */}
        {!isTerminal && !cancelled && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 20 }}>
            🔄 This page updates automatically in real-time. No need to refresh.
          </p>
        )}
      </div>
    </div>
  );
}
