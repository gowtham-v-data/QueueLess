import React, { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthProvider';
import { organizationService, type Organization, type Service, type Branch } from '../services/organization.service';
import { queueService } from '../services/queue.service';
import LoadingSpinner from '../components/LoadingSpinner';

const CATEGORIES = ['All', 'Hospital', 'Bank', 'Government', 'Restaurant', 'College', 'Auto Service', 'Salon', 'Retail'];

const CATEGORY_ICONS: Record<string, string> = {
  hospital: '🏥', bank: '🏦', government: '🏛️', restaurant: '🍽️',
  college: '🎓', 'auto service': '🚗', salon: '💇', retail: '🏪', other: '🏢'
};

function OrgCard({ org, onJoin }: { org: Organization; onJoin: (org: Organization) => void }) {
  const icon = CATEGORY_ICONS[org.category.toLowerCase()] ?? '🏢';
  return (
    <div
      className="glass-card"
      style={{ padding: 24, cursor: 'pointer' }}
      onClick={() => onJoin(org)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: 'var(--accent-soft)',
          border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
        }}>{icon}</div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</h3>
          {org.tagline && <p style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.tagline}</p>}
        </div>
        <span className="badge badge-success" style={{ flexShrink: 0 }}>Open</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="badge badge-primary">{org.category}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          🏢 by {org.ownerName ?? 'Admin'}
        </span>
      </div>
      <button
        className="btn btn-primary"
        style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
        onClick={e => { e.stopPropagation(); onJoin(org); }}
      >
        View Services →
      </button>
    </div>
  );
}

/* ─── Service selection modal ─── */
function ServiceModal({
  org,
  branchId,
  onClose,
  onJoined
}: {
  org: Organization;
  branchId?: string;
  onClose: () => void;
  onJoined: (tokenCode: string, queueId: string) => void;
}) {
  const { user } = useAuthContext();
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState(branchId || '');
  const [loading, setLoading]   = useState(true);
  const [joining, setJoining]   = useState<string | null>(null);
  const [error, setError]       = useState('');
  const [branchName, setBranchName] = useState('Main Branch');

  // Load branches
  useEffect(() => {
    let active = true;
    const loadBranches = async () => {
      try {
        const list = await organizationService.getBranches(org.id);
        if (!active) return;
        setBranches(list);

        if (branchId) {
          const found = list.find(b => b.id === branchId);
          if (found) {
            setBranchName(found.name);
            setSelectedBranchId(found.id);
          } else {
            const b = await organizationService.getBranchById(branchId);
            if (b && active) {
              setBranchName(b.name);
              setSelectedBranchId(b.id);
            }
          }
        } else if (list.length > 0 && list[0]) {
          setSelectedBranchId(list[0].id);
          setBranchName(list[0].name);
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      }
    };
    loadBranches();
    return () => { active = false; };
  }, [org.id, branchId]);

  // Load services for the selected branch
  useEffect(() => {
    setLoading(true);
    organizationService.getServices(org.id, selectedBranchId || undefined)
      .then(s => { setServices(s.filter(sv => sv.status === 'ACTIVE')); })
      .catch(() => setError('Failed to load services.'))
      .finally(() => setLoading(false));
  }, [org.id, selectedBranchId]);

  const handleJoin = async (svc: Service) => {
    if (!user) return;
    setJoining(svc.id);
    setError('');
    try {
      const entry = await queueService.joinQueue({
        organizationId:   org.id,
        organizationName: org.name,
        branchId:         selectedBranchId || svc.branchId || org.id,
        branchName:       branchName,
        serviceId:        svc.id,
        serviceName:      svc.name,
        tokenPrefix:      svc.tokenPrefix,
        customerId:       user.id,
        customerName:     `${user.firstName} ${user.lastName}`,
        averageDurationMins: svc.averageDurationMins
      });
      onJoined(entry.tokenCode, entry.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join queue. Please try again.');
    } finally {
      setJoining(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
          borderRadius: 20, padding: 28, width: '100%', maxWidth: 480,
          animation: 'scaleIn 0.25s ease forwards',
          maxHeight: '80vh', overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-primary)' }}>{org.name}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select a service to join the queue</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16 }}
          >✕</button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'var(--error-soft)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: 'var(--error)', fontSize: 14, marginBottom: 16 }}>
            ⚠ {error}
          </div>
        )}

        {/* Branch dropdown selector when URL doesn't specify a branch */}
        {!branchId && branches.length > 1 && (
          <div style={{ marginBottom: 20 }}>
            <label className="input-label" htmlFor="select-branch">Select Branch Location</label>
            <select
              id="select-branch"
              value={selectedBranchId}
              onChange={e => {
                const bId = e.target.value;
                setSelectedBranchId(bId);
                const found = branches.find(b => b.id === bId);
                if (found) setBranchName(found.name);
              }}
              className="input-field"
              style={{ cursor: 'pointer', height: 44 }}
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <LoadingSpinner size="md" label="Loading services…" className="py-8" />
        ) : services.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>No active services available right now.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {services.map(svc => (
              <div key={svc.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 18px', background: 'var(--glass)',
                border: '1px solid var(--border)', borderRadius: 12,
                gap: 12, flexWrap: 'wrap'
              }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{svc.name}</p>
                  {svc.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{svc.description}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🎫 Token: <b style={{ color: 'var(--accent-hover)' }}>{svc.tokenPrefix}</b></span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⏱ ~{svc.averageDurationMins} min/person</span>
                  </div>
                </div>
                <button
                  onClick={() => void handleJoin(svc)}
                  disabled={joining === svc.id}
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  {joining === svc.id ? <><span className="spinner" /> Joining…</> : 'Join Queue'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Success modal ─── */
function SuccessModal({ tokenCode, queueId, onClose }: { tokenCode: string; queueId: string; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }}>
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: 20, padding: 40, maxWidth: 380, width: '100%',
        textAlign: 'center', animation: 'scaleIn 0.3s ease forwards',
        boxShadow: '0 0 60px rgba(16,185,129,0.15)'
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>You're in the queue!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Your token has been assigned</p>

        <div style={{
          padding: '20px 32px', marginBottom: 28,
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 14
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Your Token</p>
          <p style={{ fontSize: 48, fontWeight: 900, color: 'var(--success)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{tokenCode}</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to={`/queues/track/${queueId}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            Track Live →
          </Link>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Done</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function QueueJoinPage() {
  const [orgs,     setOrgs]     = useState<Organization[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<Organization | null>(null);
  const [joined,   setJoined]   = useState<{ tokenCode: string; queueId: string } | null>(null);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const urlOrgId = searchParams.get('orgId');
  const urlBranchId = searchParams.get('branchId') || undefined;

  useEffect(() => {
    organizationService.getAll()
      .then(async (allOrgs) => {
        setOrgs(allOrgs);
        if (urlOrgId) {
          let found: Organization | null | undefined = allOrgs.find(o => o.id === urlOrgId);
          if (!found) {
            found = await organizationService.getById(urlOrgId);
          }
          if (found) {
            setSelected(found);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [urlOrgId]);

  const filtered = orgs.filter(o => {
    const matchSearch = o.name.toLowerCase().includes(search.toLowerCase()) || (o.tagline ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat    = category === 'All' || o.category.toLowerCase() === category.toLowerCase();
    return matchSearch && matchCat;
  });

  const handleJoined = useCallback((tokenCode: string, queueId: string) => {
    setSelected(null);
    setJoined({ tokenCode, queueId });
  }, []);

  return (
    <div className="bg-mesh" style={{ minHeight: 'calc(100vh - 64px)', padding: '48px 0 80px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 12 }}>
            Find & Join a Queue
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto' }}>
            Search for your organization, pick a service, and get your digital token instantly.
          </p>
        </div>

        {/* Search */}
        <div style={{ maxWidth: 600, margin: '0 auto 32px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18, pointerEvents: 'none' }}>🔍</span>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search hospitals, banks, restaurants…"
              className="input-field"
              style={{ paddingLeft: 48, height: 52, fontSize: 16, borderRadius: 14 }}
            />
          </div>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`btn ${category === cat ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div style={{ paddingTop: 64, paddingBottom: 64 }}>
            <LoadingSpinner size="lg" label="Loading organizations…" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
            <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>No organizations found</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              {search ? `No results for "${search}"` : 'No organizations in this category yet.'}
            </p>
            <Link to="/org/setup" className="btn btn-primary">Create an Organization</Link>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              Showing {filtered.length} organization{filtered.length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {filtered.map(org => (
                <OrgCard key={org.id} org={org} onJoin={setSelected} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {selected && (
        <ServiceModal org={selected} branchId={urlBranchId} onClose={() => setSelected(null)} onJoined={handleJoined} />
      )}
      {joined && (
        <SuccessModal tokenCode={joined.tokenCode} queueId={joined.queueId} onClose={() => setJoined(null)} />
      )}
    </div>
  );
}
