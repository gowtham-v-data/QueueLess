import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthContext } from '../context/AuthProvider';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  email:     z.string().email('Please enter a valid email'),
  password:  z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  role:      z.enum(['CUSTOMER', 'ORG_ADMIN']),
  agree: z.boolean().refine(v => v, 'You must accept the terms')
});

type FormData = z.infer<typeof schema>;

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { test: password.length >= 8, label: '8+ chars' },
    { test: /[A-Z]/.test(password), label: 'Uppercase' },
    { test: /[0-9]/.test(password), label: 'Number' },
    { test: /[^A-Za-z0-9]/.test(password), label: 'Symbol' }
  ];
  const score = checks.filter(c => c.test).length;
  const colors = ['', '#ef4444', '#f59e0b', '#10b981', '#6366f1'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? colors[score] : 'var(--glass-border)',
            transition: 'background 0.3s ease'
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {checks.map(c => (
          <span key={c.label} style={{
            fontSize: 11, padding: '2px 6px', borderRadius: 4,
            background: c.test ? 'rgba(16,185,129,0.15)' : 'var(--glass)',
            color: c.test ? '#10b981' : 'var(--text-muted)',
            transition: 'all 0.2s'
          }}>{c.label}</span>
        ))}
        <span style={{ fontSize: 11, color: colors[score], marginLeft: 'auto', fontWeight: 600 }}>{labels[score]}</span>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuthContext();
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pwValue, setPwValue] = useState('');

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: 'CUSTOMER'
    }
  });

  const password = watch('password', '');

  const onSubmit = async (data: FormData) => {
    setServerError('');
    setIsLoading(true);
    try {
      await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        role: data.role
      });
      if (data.role === 'ORG_ADMIN') {
        navigate('/org/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('email-already-in-use')) {
        setServerError('An account with this email already exists. Try signing in.');
      } else if (msg.includes('weak-password')) {
        setServerError('Please choose a stronger password.');
      } else {
        setServerError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'grid', gridTemplateColumns: '1fr 1fr' }} className="auth-grid">
      {/* Left panel */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(6,182,212,0.06) 100%)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 48, position: 'relative', overflow: 'hidden'
        }}
        className="auth-left"
      >
        <div style={{
          position: 'absolute', top: '15%', right: '15%', width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          animation: 'float 7s ease-in-out infinite'
        }} />

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 40 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, boxShadow: 'var(--shadow-accent)'
            }}>🎫</div>
            <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>QueueLess</span>
          </div>

          <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.02em' }}>
            Join thousands of<br />happy users
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 40 }}>
            Create your free account and start managing queues like a pro.
          </p>

          {/* Benefits */}
          {[
            { icon: '✓', text: 'Free forever for individual use' },
            { icon: '✓', text: 'No credit card required' },
            { icon: '✓', text: 'Real-time queue tracking' },
            { icon: '✓', text: 'Multi-branch support for businesses' }
          ].map(b => (
            <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, textAlign: 'left' }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: 'var(--success-soft)', border: '1px solid rgba(16,185,129,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: 'var(--success)', fontWeight: 700
              }}>{b.icon}</span>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — Form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 420 }} className="animate-fadeIn">
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>
            Create your account
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 28 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent-hover)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </p>

          {serverError && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--error-soft)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10, fontSize: 14, color: 'var(--error)',
              marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span>⚠</span> {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Name row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="input-label" htmlFor="firstName">First name</label>
                <input
                  id="firstName"
                  placeholder="John"
                  autoComplete="given-name"
                  className={`input-field${errors.firstName ? ' error' : ''}`}
                  {...register('firstName')}
                />
                {errors.firstName && <p className="input-error">⚠ {errors.firstName.message}</p>}
              </div>
              <div>
                <label className="input-label" htmlFor="lastName">Last name</label>
                <input
                  id="lastName"
                  placeholder="Doe"
                  autoComplete="family-name"
                  className={`input-field${errors.lastName ? ' error' : ''}`}
                  {...register('lastName')}
                />
                {errors.lastName && <p className="input-error">⚠ {errors.lastName.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="input-label" htmlFor="reg-email">Email address</label>
              <input
                id="reg-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className={`input-field${errors.email ? ' error' : ''}`}
                {...register('email')}
              />
              {errors.email && <p className="input-error">⚠ {errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="input-label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                className={`input-field${errors.password ? ' error' : ''}`}
                {...register('password', { onChange: e => setPwValue(e.target.value) })}
              />
              <PasswordStrength password={password || pwValue} />
              {errors.password && <p className="input-error">⚠ {errors.password.message}</p>}
            </div>

            {/* Account Role Type */}
            <div>
              <label className="input-label" htmlFor="reg-role">Account Type</label>
              <select
                id="reg-role"
                className="input-field"
                style={{ cursor: 'pointer', height: 44 }}
                {...register('role')}
              >
                <option value="CUSTOMER">Customer (Join Queues & Track Live)</option>
                <option value="ORG_ADMIN">Business Administrator (Manage & Add Organizations)</option>
              </select>
              {errors.role && <p className="input-error">⚠ {errors.role.message}</p>}
            </div>

            {/* Terms */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                id="agree"
                {...register('agree')}
                style={{ marginTop: 3, accentColor: 'var(--accent)', width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                I agree to the{' '}
                <a href="#" style={{ color: 'var(--accent-hover)', textDecoration: 'none' }}>Terms of Service</a>
                {' '}and{' '}
                <a href="#" style={{ color: 'var(--accent-hover)', textDecoration: 'none' }}>Privacy Policy</a>
              </span>
            </label>
            {errors.agree && <p className="input-error" style={{ marginTop: -10 }}>⚠ {errors.agree.message}</p>}

            <button
              id="register-submit"
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%', height: 48, fontSize: 15 }}
            >
              {isLoading ? (
                <><span className="spinner" /> Creating account…</>
              ) : (
                'Create Account →'
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-left { display: none !important; }
        }
      `}</style>
    </div>
  );
}
