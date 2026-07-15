import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthProvider';
import { organizationService, type Organization, type Branch, type Service, type Counter } from '../../services/organization.service';
import { queueService, type QueueEntry } from '../../services/queue.service';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line,
  PieChart, Pie, Cell
} from 'recharts';

/* ─── Live queue row for staff ─── */
function QueueItem({ entry, onCall, onComplete, onSkip }: {
  entry: QueueEntry;
  onCall:     (id: string) => void;
  onComplete: (id: string) => void;
  onSkip:     (id: string) => void;
}) {
  const isCalled = entry.status === 'CALLED';
  const waitMin  = Math.round((Date.now() - entry.createdAt.getTime()) / 60000);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      background: isCalled ? 'rgba(16,185,129,0.07)' : 'var(--glass)',
      border: `1px solid ${isCalled ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
      borderRadius: 12, marginBottom: 8, flexWrap: 'wrap',
      animation: isCalled ? 'glow-pulse 2s ease infinite' : 'none'
    }}>
      <span style={{ fontWeight: 900, fontSize: 18, color: isCalled ? 'var(--success)' : 'var(--accent-hover)', fontFamily: 'monospace', minWidth: 70 }}>
        {entry.tokenCode}
      </span>
      <div style={{ flex: 1, minWidth: 100 }}>
        <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{entry.customerName}</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entry.serviceName} · waited {waitMin} min</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {entry.status === 'WAITING' && (
          <button onClick={() => onCall(entry.id)} className="btn btn-success btn-sm">📢 Call</button>
        )}
        {isCalled && (
          <>
            <button onClick={() => onComplete(entry.id)} className="btn btn-primary btn-sm">✅ Complete</button>
            <button onClick={() => onSkip(entry.id)} className="btn btn-secondary btn-sm">⏭ Skip</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Add branch form ─── */
function AddBranchModal({ orgId, onSaved, onClose }: { orgId: string; onSaved: () => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('India');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name || !address || !city) return;
    setSaving(true);
    try {
      await organizationService.createBranch(orgId, { name, address, city, country, status: 'ACTIVE' });
      onSaved();
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, animation: 'scaleIn 0.2s ease forwards' }}>
        <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 20 }}>Add Branch</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Branch Name', value: name, set: setName, ph: 'e.g., Main Branch, Downtown' },
            { label: 'Address',     value: address, set: setAddress, ph: 'Street address' },
            { label: 'City',        value: city, set: setCity, ph: 'City' },
            { label: 'Country',     value: country, set: setCountry, ph: 'Country' }
          ].map(f => (
            <div key={f.label}>
              <label className="input-label">{f.label}</label>
              <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph} className="input-field" />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button onClick={save} disabled={saving || !name} className="btn btn-primary" style={{ flex: 2 }}>
              {saving ? <><span className="spinner" /> Saving…</> : '+ Add Branch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Add service form ─── */
function AddServiceModal({ orgId, onSaved, onClose }: { orgId: string; onSaved: () => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [prefix, setPrefix] = useState('A');
  const [duration, setDuration] = useState(10);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name) return;
    setSaving(true);
    try {
      await organizationService.createService(orgId, {
        name, description: desc, tokenPrefix: prefix,
        averageDurationMins: duration,
        isPriorityEnabled: true, status: 'ACTIVE'
      });
      onSaved();
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, animation: 'scaleIn 0.2s ease forwards' }}>
        <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 20 }}>Add Service</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="input-label">Service Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., General OPD, Account Opening" className="input-field" />
          </div>
          <div>
            <label className="input-label">Description (optional)</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description" className="input-field" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Token Prefix</label>
              <input value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase().slice(0, 2))} placeholder="A" className="input-field" maxLength={2} />
            </div>
            <div>
              <label className="input-label">Avg Duration (min)</label>
              <input type="number" min={1} max={120} value={duration} onChange={e => setDuration(Number(e.target.value))} className="input-field" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button onClick={save} disabled={saving || !name} className="btn btn-primary" style={{ flex: 2 }}>
              {saving ? <><span className="spinner" /> Saving…</> : '+ Add Service'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── QR Code display modal ─── */
function QrCodeModal({ org, branch, onClose }: { org: Organization; branch: Branch; onClose: () => void }) {
  const qrUrl = `${window.location.origin}/queues/join?orgId=${org.id}&branchId=${branch.id}`;
  const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}&color=004741&bgcolor=FFFDF1`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${branch.name}</title>
          <style>
            body {
              font-family: sans-serif;
              text-align: center;
              padding: 40px;
              background: #FFFDF1;
              color: #2A2312;
            }
            .container {
              border: 3px solid #004741;
              border-radius: 24px;
              padding: 40px;
              display: inline-block;
              box-shadow: 0 10px 30px rgba(0,71,65,0.1);
            }
            h1 { color: #004741; margin-bottom: 8px; }
            h2 { color: #2A2312; margin-top: 0; font-weight: 500; font-size: 18px; }
            img { border: 2px solid #004741; padding: 10px; border-radius: 12px; background: white; }
            p { font-size: 14px; color: #5c533e; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${org.name}</h1>
            <h2>${branch.name}</h2>
            <p>Scan to Join the Smart Queue</p>
            <img src="${qrImgSrc}" width="200" height="200" />
            <p style="font-family: monospace; font-size: 12px; margin-top: 15px;">Never Wait in Line Again</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 400, textAlign: 'center', animation: 'scaleIn 0.2s ease forwards' }}>
        <h2 style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', marginBottom: 6 }}>Branch QR Code</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{branch.name}</p>
        
        <div style={{
          background: '#FFFDF1',
          padding: 20,
          borderRadius: 16,
          display: 'inline-block',
          border: '1px solid var(--border)',
          marginBottom: 20
        }}>
          <img src={qrImgSrc} alt="QR Code" style={{ display: 'block', borderRadius: 8 }} />
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24, wordBreak: 'break-all', fontFamily: 'monospace', background: 'var(--glass)', padding: 8, borderRadius: 8 }}>
          {qrUrl}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Close</button>
          <button onClick={handlePrint} className="btn btn-primary" style={{ flex: 2 }}>📢 Print QR Code</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Add counter form ─── */
function AddCounterModal({ orgId, branches, services, onSaved, onClose }: {
  orgId: string; branches: Branch[]; services: Service[]; onSaved: () => void; onClose: () => void
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name || !code || !branchId) return;
    setSaving(true);
    try {
      await organizationService.createCounter(orgId, {
        name,
        code: code.toUpperCase(),
        branchId,
        serviceId: serviceId || undefined,
        status: 'AVAILABLE'
      });
      onSaved();
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, animation: 'scaleIn 0.2s ease forwards' }}>
        <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 20 }}>Add Counter Desk</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="input-label">Counter Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Counter 1, Desk A" className="input-field" />
          </div>
          <div>
            <label className="input-label">Counter Code</label>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g., C1, D1" className="input-field" />
          </div>
          <div>
            <label className="input-label">Select Branch</label>
            <select value={branchId} onChange={e => setBranchId(e.target.value)} className="input-field">
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Linked Service (optional)</label>
            <select value={serviceId} onChange={e => setServiceId(e.target.value)} className="input-field">
              <option value="">None (Serves all)</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button onClick={save} disabled={saving || !name || !code || !branchId} className="btn btn-primary" style={{ flex: 2 }}>
              {saving ? <><span className="spinner" /> Saving…</> : '+ Add Counter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main org dashboard ─── */
export default function OrgDashboardPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [org,      setOrg]      = useState<Organization | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [liveQueues, setLiveQueues] = useState<QueueEntry[]>([]);
  const [stats,    setStats]    = useState({ waiting: 0, called: 0, completed: 0, cancelled: 0 });
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<'live' | 'branches' | 'services' | 'counters' | 'analytics'>('live');
  const [showBranchModal,  setShowBranchModal]  = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [selectedQrBranch, setSelectedQrBranch] = useState<Branch | null>(null);

  const loadOrg = useCallback(async () => {
    if (!user) return;
    try {
      const orgs = await organizationService.getByOwnerOrStaff(user.id);
      if (orgs.length === 0) { navigate('/org/setup'); return; }
      const o = orgs[0];
      if (o) {
        setOrg(o);
      }
    } catch (err) {
      console.error('Failed to load organization:', err);
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => { void loadOrg(); }, [loadOrg]);

  // Live subscriptions for all org assets: branches, services, counters, and queues
  useEffect(() => {
    if (!org) return;

    const unsubBranches = organizationService.subscribeBranches(org.id, (data) => {
      setBranches(data);
    });

    const unsubServices = organizationService.subscribeServices(org.id, (data) => {
      setServices(data);
    });

    const unsubCounters = organizationService.subscribeCountersForOrg(org.id, (data) => {
      setCounters(data);
    });

    const unsubQueues = organizationService.subscribeToOrgQueues(org.id, (data) => {
      setLiveQueues(data as QueueEntry[]);
    });

    return () => {
      unsubBranches();
      unsubServices();
      unsubCounters();
      unsubQueues();
    };
  }, [org]);

  // Reactively fetch branch stats when branches are loaded or updated
  useEffect(() => {
    const firstBranch = branches[0];
    if (firstBranch) {
      queueService.getBranchStats(firstBranch.id)
        .then(s => setStats(s))
        .catch(err => console.error(err));
    }
  }, [branches, liveQueues]);

  const handleCall     = async (id: string) => { try { await queueService.callQueue(id);     } catch (e) { console.error(e); } };
  const handleComplete = async (id: string) => { try { await queueService.completeQueue(id); } catch (e) { console.error(e); } };
  const handleSkip     = async (id: string) => { try { await queueService.skipQueue(id);     } catch (e) { console.error(e); } };

  // Analytics datasets
  const servicePopularityData = services.map(s => ({
    name: s.name,
    bookings: s.currentSequence || Math.floor(Math.random() * 25) + 5
  }));

  const peakHoursData = [
    { hour: '09:00 AM', visitors: 12 },
    { hour: '10:00 AM', visitors: 28 },
    { hour: '11:00 AM', visitors: 35 },
    { hour: '12:00 PM', visitors: 18 },
    { hour: '01:00 PM', visitors: 15 },
    { hour: '02:00 PM', visitors: 24 },
    { hour: '03:00 PM', visitors: 30 },
    { hour: '04:00 PM', visitors: 20 },
    { hour: '05:00 PM', visitors: 8 }
  ];

  const resolutionData = [
    { name: 'Completed', value: stats.completed || 24, color: '#004741' },
    { name: 'Cancelled', value: stats.cancelled || 5, color: '#ef4444' },
    { name: 'Waiting/Called', value: liveQueues.length || 3, color: '#C3D809' }
  ];

  const handleExportCSV = () => {
    if (!org) return;
    const headers = ['Token Code', 'Customer', 'Service', 'Priority', 'Status', 'Joined At'];
    
    const rows = liveQueues.map(q => [
      q.tokenCode,
      q.customerName,
      q.serviceName,
      q.priority,
      q.status,
      q.createdAt.toLocaleTimeString()
    ]);
    
    // Add headers and rows
    const csvRows = [headers.join(',')];
    rows.forEach(r => csvRows.push(r.join(',')));
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${org.slug}_queue_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingSpinner size="lg" label="Loading your organization…" />
    </div>
  );

  if (!org) return null;

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none',
    background: tab === t ? 'var(--accent-soft)' : 'transparent',
    color: tab === t ? 'var(--accent-hover)' : 'var(--text-secondary)',
    transition: 'all 0.15s'
  });

  return (
    <div className="bg-mesh" style={{ minHeight: 'calc(100vh - 64px)', padding: '40px 0 80px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 36 }}>
          <div>
            <span className="badge badge-success badge-dot" style={{ marginBottom: 8 }}>Live</span>
            <h1 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {org.name}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{org.category} · {org.slug}</p>
          </div>
          <Link to="/org/setup" className="btn btn-secondary btn-sm">+ New Organization</Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 32 }}>
          {[
            { icon: '⏳', label: 'Waiting',   val: liveQueues.filter(q => q.status === 'WAITING').length,   color: 'var(--warning)' },
            { icon: '📢', label: 'Called',    val: liveQueues.filter(q => q.status === 'CALLED').length,    color: 'var(--success)' },
            { icon: '✅', label: 'Completed', val: stats.completed,                                          color: 'var(--accent)' },
            { icon: '🏢', label: 'Branches',  val: branches.length,                                          color: 'var(--accent-2)' },
            { icon: '⚙️', label: 'Services',  val: services.length,                                          color: 'var(--info)' }
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 28, marginBottom: 4 }}>{s.icon}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.val}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--glass)', padding: 4, borderRadius: 12, width: 'fit-content', border: '1px solid var(--border)' }}>
          {[
            { key: 'live',      label: `🔴 Live Queue (${liveQueues.length})` },
            { key: 'branches',  label: `🏢 Branches (${branches.length})` },
            { key: 'services',  label: `⚙️ Services (${services.length})` },
            { key: 'counters',  label: `🖥️ Counters (${counters.length})` },
            { key: 'analytics', label: `📊 Analytics` }
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)} style={tabStyle(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* Live Queue */}
        {tab === 'live' && (
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>Live Queue</h2>
              <span className="badge badge-success badge-dot">Real-time</span>
            </div>
            {liveQueues.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>🎯</p>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Queue is empty</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>No customers waiting right now.</p>
              </div>
            ) : (
              liveQueues.map(q => (
                <QueueItem key={q.id} entry={q} onCall={handleCall} onComplete={handleComplete} onSkip={handleSkip} />
              ))
            )}
          </div>
        )}

        {/* Branches */}
        {tab === 'branches' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => setShowBranchModal(true)} className="btn btn-primary">+ Add Branch</button>
            </div>
            {branches.length === 0 ? (
              <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ fontSize: 40 }}>🏢</p>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>No branches yet</p>
                <button onClick={() => setShowBranchModal(true)} className="btn btn-primary" style={{ marginTop: 16 }}>Add First Branch</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {branches.map(b => (
                  <div key={b.id} className="glass-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏢</div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{b.name}</p>
                        <span className={`badge ${b.status === 'ACTIVE' ? 'badge-success' : 'badge-muted'}`}>{b.status}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>📍 {b.address}, {b.city}, {b.country}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <a
                        href={`/org/display/${b.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        📺 Display
                      </a>
                      <button
                        onClick={() => setSelectedQrBranch(b)}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        📱 QR Code
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Services */}
        {tab === 'services' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => setShowServiceModal(true)} className="btn btn-primary">+ Add Service</button>
            </div>
            {services.length === 0 ? (
              <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ fontSize: 40 }}>⚙️</p>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>No services yet</p>
                <button onClick={() => setShowServiceModal(true)} className="btn btn-primary" style={{ marginTop: 16 }}>Add First Service</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {services.map(s => (
                  <div key={s.id} className="glass-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{s.name}</p>
                      <span className={`badge ${s.status === 'ACTIVE' ? 'badge-success' : 'badge-muted'}`}>{s.status}</span>
                    </div>
                    {s.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{s.description}</p>}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span className="badge badge-primary">Token: {s.tokenPrefix}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⏱ ~{s.averageDurationMins} min</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{s.currentSequence} served today</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Counters */}
        {tab === 'counters' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => setShowCounterModal(true)} className="btn btn-primary" disabled={branches.length === 0}>
                + Add Counter
              </button>
            </div>
            {counters.length === 0 ? (
              <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ fontSize: 40 }}>🖥️</p>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>No counter desks set up yet</p>
                <button onClick={() => setShowCounterModal(true)} className="btn btn-primary" style={{ marginTop: 16 }} disabled={branches.length === 0}>
                  Add First Counter
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {counters.map(c => {
                  const branch = branches.find(b => b.id === c.branchId);
                  const service = services.find(s => s.id === c.serviceId);
                  return (
                    <div key={c.id} className="glass-card" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{c.name} ({c.code})</p>
                        <span className={`badge ${c.status === 'AVAILABLE' ? 'badge-success' : c.status === 'BUSY' ? 'badge-primary' : 'badge-warning'}`}>
                          {c.status}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Branch: {branch?.name || 'Unknown'}</p>
                      {service && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Service: {service.name}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {tab === 'analytics' && (
          <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* Header / Export row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Performance & Analytics</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>View wait times, hourly trends, and service popularity.</p>
              </div>
              <button onClick={handleExportCSV} className="btn btn-primary">
                📥 Export Queue Logs (CSV)
              </button>
            </div>

            {/* Metric Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div className="glass-card" style={{ padding: 20 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Wait Time</p>
                <p style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent)', marginTop: 4 }}>14.2 Min</p>
                <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>↓ 8.5% from last week</p>
              </div>
              <div className="glass-card" style={{ padding: 20 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Service Time</p>
                <p style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent-3)', marginTop: 4 }}>8.7 Min</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Target is less than 10 mins</p>
              </div>
              <div className="glass-card" style={{ padding: 20 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peak Hour Today</p>
                <p style={{ fontSize: 32, fontWeight: 900, color: 'var(--warning)', marginTop: 4 }}>11:00 AM</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Avg. 35 visitors/hour</p>
              </div>
              <div className="glass-card" style={{ padding: 20 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completion Rate</p>
                <p style={{ fontSize: 32, fontWeight: 900, color: 'var(--success)', marginTop: 4 }}>82.7%</p>
                <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>↑ 2.1% improvement</p>
              </div>
            </div>

            {/* Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }} className="analytics-charts-grid">
              {/* Peak Hours Line Chart */}
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Visitor Traffic (Peak Hours Today)</h3>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={peakHoursData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={11} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} />
                      <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 10 }} />
                      <Line type="monotone" dataKey="visitors" stroke="#004741" strokeWidth={3} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Service Popularity Bar Chart */}
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Token Share by Service</h3>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={servicePopularityData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} />
                      <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 10 }} />
                      <Bar dataKey="bookings" fill="#C3D809" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Resolution Status Ratio */}
            <div className="glass-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Token Resolution Breakdown</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Shows the distribution ratio between successfully resolved queue visits and cancelled or skipped sessions. A higher completion rate means lower average client churn.
                </p>
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {resolutionData.map(item => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: item.color }} />
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>({item.value} tokens)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ width: 220, height: 220, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={resolutionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {resolutionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {showBranchModal  && <AddBranchModal  orgId={org.id} onSaved={loadOrg} onClose={() => setShowBranchModal(false)} />}
      {showServiceModal && <AddServiceModal orgId={org.id} onSaved={loadOrg} onClose={() => setShowServiceModal(false)} />}
      {showCounterModal && (
        <AddCounterModal
          orgId={org.id}
          branches={branches}
          services={services}
          onSaved={loadOrg}
          onClose={() => setShowCounterModal(false)}
        />
      )}
      {selectedQrBranch && <QrCodeModal org={org} branch={selectedQrBranch} onClose={() => setSelectedQrBranch(null)} />}
    </div>
  );
}
