import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthProvider';
import { organizationService, type Branch, type Counter } from '../services/organization.service';
import { queueService, type QueueEntry } from '../services/queue.service';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';

export default function StaffCounterPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const toast = useToast();

  const [branches,      setBranches]      = useState<Branch[]>([]);
  const [counters,      setCounters]      = useState<Counter[]>([]);
  const [liveQueues,     setLiveQueues]     = useState<QueueEntry[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedCounter, setSelectedCounter] = useState<Counter | null>(null);
  const [activeQueue,    setActiveQueue]    = useState<QueueEntry | null>(null);

  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState<Counter['status']>('OFFLINE');
  
  // Timer for active call duration
  const [duration, setDuration] = useState(0);

  // Load branches on mount
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    organizationService.getByOwnerOrStaff(user.id)
      .then(async (orgs) => {
        if (orgs.length > 0 && orgs[0]) {
          const data = await organizationService.getBranches(orgs[0].id);
          setBranches(data);
          if (data.length > 0 && data[0]) {
            setSelectedBranch(data[0].id);
          } else {
            toast.warning('No branches set up for your organization yet.');
          }
        } else {
          toast.error('No organization found. Please set up your organization first.');
          navigate('/org/setup');
        }
      })
      .catch(() => toast.error('Failed to load branches'))
      .finally(() => setLoading(false));
  }, [user, toast, navigate]);

  // Load counters when branch selection changes
  useEffect(() => {
    if (!selectedBranch) return;
    organizationService.getCounters(selectedBranch)
      .then(setCounters)
      .catch(() => toast.error('Failed to load counters'));
  }, [selectedBranch, toast]);

  // Subscribe to live branch queues once branch is selected
  useEffect(() => {
    if (!selectedBranch) return;
    const unsub = queueService.subscribeToBranchQueue(selectedBranch, (data) => {
      setLiveQueues(data);
      
      // If we have an active counter, find if there is a currently called item on this counter
      if (selectedCounter) {
        const active = data.find(q => q.status === 'CALLED' && q.counterId === selectedCounter.id);
        setActiveQueue(active || null);
      }
    });
    return unsub;
  }, [selectedBranch, selectedCounter]);

  // Duration Timer
  const activeQueueId = activeQueue?.id;
  const activeQueueCalledAt = activeQueue?.calledAt?.getTime();
  useEffect(() => {
    if (!activeQueueId || !activeQueueCalledAt) {
      setDuration(0);
      return;
    }
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - activeQueueCalledAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeQueueId, activeQueueCalledAt]);

  const handleSelectCounter = async (cId: string) => {
    const counter = counters.find(c => c.id === cId) || null;
    setSelectedCounter(counter);
    if (counter && user) {
      setStatus(counter.status);
      try {
        await organizationService.assignStaffToCounter(counter.id, user.id);
        if (counter.status === 'OFFLINE') {
          await organizationService.updateCounterStatus(counter.id, 'AVAILABLE');
          setStatus('AVAILABLE');
        }
      } catch (err) {
        console.error('Failed to assign staff to counter:', err);
        toast.error('Failed to register at this counter.');
      }
      // Sync active queue on this counter if any
      const active = liveQueues.find(q => q.status === 'CALLED' && q.counterId === counter.id);
      setActiveQueue(active || null);
    }
  };

  const handleStatusChange = async (newStatus: Counter['status']) => {
    if (!selectedCounter) return;
    try {
      await organizationService.updateCounterStatus(selectedCounter.id, newStatus);
      setStatus(newStatus);
      toast.success(`Counter status updated to ${newStatus}`);
    } catch (e) {
      toast.error('Failed to update counter status');
    }
  };

  const handleCallNext = async () => {
    if (!selectedCounter) return;
    const nextQueue = liveQueues.find(q => q.status === 'WAITING');
    if (!nextQueue) {
      toast.warning('No customers waiting in the queue.');
      return;
    }
    try {
      // Call token and assign counter details
      await queueService.callQueue(nextQueue.id, selectedCounter.id, selectedCounter.name);
      await organizationService.updateCounterStatus(selectedCounter.id, 'BUSY');
      setStatus('BUSY');
      toast.success(`Called token ${nextQueue.tokenCode}`);
    } catch (e) {
      toast.error('Failed to call next customer');
    }
  };

  const handleComplete = async () => {
    if (!activeQueue || !selectedCounter) return;
    try {
      await queueService.completeQueue(activeQueue.id);
      await organizationService.updateCounterStatus(selectedCounter.id, 'AVAILABLE');
      setStatus('AVAILABLE');
      setActiveQueue(null);
      toast.success('Service marked as completed.');
    } catch (e) {
      toast.error('Failed to complete queue');
    }
  };

  const handleSkip = async () => {
    if (!activeQueue || !selectedCounter) return;
    try {
      await queueService.skipQueue(activeQueue.id);
      await organizationService.updateCounterStatus(selectedCounter.id, 'AVAILABLE');
      setStatus('AVAILABLE');
      setActiveQueue(null);
      toast.success('Customer marked as skipped.');
    } catch (e) {
      toast.error('Failed to skip queue');
    }
  };

  const handleRecall = async () => {
    if (!activeQueue || !selectedCounter) return;
    try {
      // Re-trigger call in database to update timestamps and re-chime on TV display
      await queueService.callQueue(activeQueue.id, selectedCounter.id, selectedCounter.name);
      toast.info(`Recalled token ${activeQueue.tokenCode}`);
    } catch (e) {
      toast.error('Failed to recall token');
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingSpinner size="lg" label="Loading staff console…" />
    </div>
  );

  const waitingList = liveQueues.filter(q => q.status === 'WAITING');

  return (
    <div className="bg-mesh" style={{ minHeight: 'calc(100vh - 64px)', padding: '40px 0 80px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <span className="section-tag" style={{ marginBottom: 8 }}>Staff Workspace</span>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Counter Desk
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Select your assigned branch & counter to manage waiting lines.</p>
        </div>

        {/* Setup Config Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>
          {/* Branch Select */}
          <div className="glass-card" style={{ padding: 20 }}>
            <label className="input-label">Select Branch</label>
            <select
              value={selectedBranch}
              onChange={e => { setSelectedBranch(e.target.value); setSelectedCounter(null); setActiveQueue(null); }}
              className="input-field"
              style={{ cursor: 'pointer' }}
            >
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Counter Select */}
          <div className="glass-card" style={{ padding: 20 }}>
            <label className="input-label">Assigned Counter</label>
            <select
              value={selectedCounter?.id || ''}
              onChange={e => handleSelectCounter(e.target.value)}
              className="input-field"
              style={{ cursor: 'pointer' }}
            >
              <option value="" disabled>Choose a counter…</option>
              {counters.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>

          {/* Status Toggle */}
          <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <label className="input-label">Counter Status</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {[
                { label: 'Available', key: 'AVAILABLE', cls: 'badge-success' },
                { label: 'Busy',      key: 'BUSY',      cls: 'badge-primary' },
                { label: 'Paused',    key: 'PAUSED',    cls: 'badge-warning' }
              ].map(st => (
                <button
                  key={st.key}
                  onClick={() => handleStatusChange(st.key as Counter['status'])}
                  disabled={!selectedCounter}
                  className={`btn btn-sm ${status === st.key ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Work Area */}
        {!selectedCounter ? (
          <div className="glass-card" style={{ padding: 64, textAlign: 'center' }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>🖥️</p>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Choose a counter to begin</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>You need to configure which counter desk you are serving from before calling tokens.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 24 }} className="staff-work-grid">
            {/* Left: Active Call Action Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="glass-card" style={{ padding: 32, textAlign: 'center', position: 'relative' }}>
                <span className="badge badge-success badge-dot" style={{ position: 'absolute', top: 24, right: 24 }}>
                  {status}
                </span>

                {activeQueue ? (
                  <div className="animate-scaleIn">
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                      NOW SERVING CUSTOMER
                    </p>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                      {activeQueue.customerName}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                      {activeQueue.serviceName} · Priority: <b>{activeQueue.priority}</b>
                    </p>

                    {/* Token code banner */}
                    <div style={{
                      padding: '24px 40px', background: 'var(--accent-soft)',
                      borderRadius: 20, border: '1px solid rgba(99, 102, 241, 0.2)',
                      display: 'inline-block', marginBottom: 28, boxShadow: 'var(--shadow-accent)'
                    }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>TOKEN</span>
                      <span className="token-display">{activeQueue.tokenCode}</span>
                    </div>

                    {/* Session timer */}
                    <div style={{ marginBottom: 36 }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>SESSION TIME</p>
                      <p style={{ fontSize: 28, fontWeight: 900, fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: 4 }}>
                        {formatTimer(duration)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button onClick={handleComplete} className="btn btn-success btn-lg" style={{ minWidth: 150 }}>
                        ✓ Complete
                      </button>
                      <button onClick={handleRecall} className="btn btn-secondary btn-lg" style={{ minWidth: 120 }}>
                        📢 Recall
                      </button>
                      <button onClick={handleSkip} className="btn btn-danger btn-lg" style={{ minWidth: 120 }}>
                        ⏭ Skip
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '48px 0' }} className="animate-fadeIn">
                    <p style={{ fontSize: 48, marginBottom: 16 }}>🎯</p>
                    <h2 style={{ color: 'var(--text-primary)', fontWeight: 800 }}>Ready for next customer</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 6, marginBottom: 32 }}>
                      {waitingList.length} customer{waitingList.length !== 1 ? 's' : ''} currently waiting in line.
                    </p>
                    <button
                      onClick={handleCallNext}
                      disabled={waitingList.length === 0}
                      className="btn btn-primary btn-lg"
                      style={{ padding: '16px 40px', fontSize: 16 }}
                    >
                      📢 Call Next Ticket
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Waiting List Queue */}
            <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>Waiting List</h3>
                <span className="badge badge-primary">{waitingList.length} Waiting</span>
              </div>

              {waitingList.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <span style={{ fontSize: 28 }}>😊</span>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No customers waiting right now.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1, paddingRight: 4 }}>
                  {waitingList.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 14px', background: 'var(--glass)',
                        border: '1px solid var(--border)', borderRadius: 10
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 800, fontSize: 15, fontFamily: 'monospace', color: 'var(--accent-hover)', marginRight: 10 }}>{item.tokenCode}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.customerName}</span>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.serviceName}</p>
                      </div>
                      <span className="badge badge-muted" style={{ fontSize: 11 }}>#{idx + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 800px) {
          .staff-work-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
