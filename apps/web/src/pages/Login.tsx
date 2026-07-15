import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthContext } from '../context/AuthProvider';

const schema = z.object({
  email:    z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthContext();
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    setIsLoading(true);
    try {
      const user = await login(data.email, data.password);
      if (user.role === 'ORG_ADMIN') {
        navigate('/org/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Friendly error messages
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setServerError('Invalid email or password. Please try again.');
      } else if (msg.includes('too-many-requests')) {
        setServerError('Too many attempts. Please try again later.');
      } else {
        setServerError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'grid', gridTemplateColumns: '1fr 1fr' }} className="auth-grid">
      {/* ── Left panel ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 100%)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 48, gap: 32, position: 'relative', overflow: 'hidden'
        }}
        className="auth-left"
      >
        {/* Background orbs */}
        <div style={{
          position: 'absolute', top: '20%', left: '20%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          animation: 'float 6s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '10%',
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)',
          animation: 'float 8s ease-in-out infinite reverse'
        }} />

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 360 }}>
          {/* Logo */}
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
            Welcome back
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 40 }}>
            Sign in to manage your queues and never wait in line again.
          </p>

          {/* Testimonial */}
          <div className="glass" style={{ padding: 20, borderRadius: 14, textAlign: 'left' }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 12 }}>
              "QueueLess reduced our patient wait time by 60%. Our staff focuses on care, not crowd management."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: 'white'
              }}>DR</div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Dr. Ramesh Iyer</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Apollo Hospital, Chennai</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — Form ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 48
      }}>
        <div style={{ width: '100%', maxWidth: 400 }} className="animate-fadeIn">
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>
            Sign in
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent-hover)', textDecoration: 'none', fontWeight: 600 }}>
              Create one free
            </Link>
          </p>

          {/* Server error */}
          {serverError && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--error-soft)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10,
              fontSize: 14,
              color: 'var(--error)',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>⚠</span> {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Email */}
            <div>
              <label className="input-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={`input-field${errors.email ? ' error' : ''}`}
                {...register('email')}
              />
              {errors.email && <p className="input-error">⚠ {errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="input-label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
                <a href="#" style={{ fontSize: 13, color: 'var(--accent-hover)', textDecoration: 'none' }}>Forgot?</a>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={`input-field${errors.password ? ' error' : ''}`}
                {...register('password')}
              />
              {errors.password && <p className="input-error">⚠ {errors.password.message}</p>}
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%', height: 48, fontSize: 15, marginTop: 4 }}
            >
              {isLoading ? (
                <><span className="spinner" /> Signing in…</>
              ) : (
                'Sign In →'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="divider-text" style={{ margin: '28px 0' }}>or continue with</div>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
            By signing in you agree to our{' '}
            <a href="#" style={{ color: 'var(--text-secondary)' }}>Terms</a> &{' '}
            <a href="#" style={{ color: 'var(--text-secondary)' }}>Privacy Policy</a>.
          </p>
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
