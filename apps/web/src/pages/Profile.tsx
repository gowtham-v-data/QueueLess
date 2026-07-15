import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthProvider';
import { db, firebaseAuth } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useToast } from '../components/Toast';

export default function ProfilePage() {
  const { user, logout, refresh } = useAuthContext();
  const navigate = useNavigate();
  const toast = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('CUSTOMER');

  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Initialize fields
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setRole(user.role || 'CUSTOMER');
    }
  }, [user]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } catch {
      toast.error('Failed to log out.');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First name and last name are required.');
      return;
    }

    setSaving(true);
    try {
      // 1. Update Firebase Auth displayName
      if (firebaseAuth?.currentUser) {
        await updateProfile(firebaseAuth.currentUser, {
          displayName: `${firstName.trim()} ${lastName.trim()}`
        });
      }

      // 2. Save metadata to Firestore
      if (db) {
        await setDoc(doc(db, 'users', user.id), {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          role: role,
          updatedAt: new Date()
        }, { merge: true });
      }

      // 3. Refresh Auth context
      await refresh();
      toast.success('Profile settings updated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile settings.');
    } finally {
      setSaving(false);
    }
  };

  const initials = user ? `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() : '?';

  return (
    <div className="bg-mesh" style={{ minHeight: 'calc(100vh - 64px)', padding: '48px 0 80px' }}>
      <div className="container-sm" style={{ maxWidth: 540 }}>
        {/* Header */}
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 32, letterSpacing: '-0.02em' }}>
          My Profile Settings
        </h1>

        {/* Profile Card */}
        <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 800, color: 'white',
              boxShadow: '0 0 0 4px var(--accent-soft), var(--shadow-accent)'
            }}>
              {initials || '?'}
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                {firstName} {lastName}
              </p>
              <span className="badge badge-primary" style={{ marginTop: 4 }}>
                {role}
              </span>
            </div>
          </div>

          <div className="divider" style={{ margin: '20px 0' }} />

          {/* Form */}
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="input-label">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="input-label">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="input-label">Email Address (Read-only)</label>
              <input
                type="email"
                value={user?.email || ''}
                className="input-field"
                style={{ background: 'var(--border)', cursor: 'not-allowed' }}
                disabled
              />
            </div>

            <div>
              <label className="input-label">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="input-field"
              />
            </div>

            <div>
              <label className="input-label">System Role (Developer Sandbox Mode)</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="input-field"
                style={{ cursor: 'pointer' }}
              >
                <option value="CUSTOMER">Customer (Join Queues)</option>
                <option value="STAFF">Counter Staff (Serve Customers)</option>
                <option value="ORG_ADMIN">Organization Admin (Manage Services & Branches)</option>
              </select>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                * Change role to easily test different dashboard workspaces in this client sandbox!
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ marginTop: 8, justifyContent: 'center' }}
            >
              {saving ? <><span className="spinner" /> Saving…</> : '💾 Save Settings'}
            </button>
          </form>
        </div>

        {/* Quick Actions */}
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 16 }}>Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              📊 Go to Dashboard
            </button>
            <button onClick={() => navigate('/queues/join')} className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              🎫 Join a Queue
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div style={{
          padding: 24, borderRadius: 16,
          border: '1px solid rgba(239,68,68,0.2)',
          background: 'rgba(239,68,68,0.04)'
        }}>
          <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--error)', marginBottom: 8 }}>⚠ Session Control</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Signing out will end your current session. All settings and tokens are stored securely in Firestore.
          </p>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="btn btn-danger"
          >
            {loggingOut ? <><span className="spinner" /> Signing out…</> : '🚪 Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
}
