import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/* ─── Animated counter ─── */
function AnimatedCount({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting && !started.current) {
        started.current = true;
        const dur = 1800;
        const step = 16;
        const increment = target / (dur / step);
        let current = 0;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) { setCount(target); clearInterval(timer); }
          else setCount(Math.floor(current));
        }, step);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─── Feature card ─── */
function FeatureCard({ icon, title, desc, delay }: { icon: string; title: string; desc: string; delay: number }) {
  return (
    <div
      className="glass-card animate-fadeInUp"
      style={{ padding: 28, animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div style={{
        width: 52, height: 52,
        background: 'var(--accent-soft)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, marginBottom: 16
      }}>
        {icon}
      </div>
      <h3 style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{desc}</p>
    </div>
  );
}

/* ─── Use-case card ─── */
function UseCaseCard({ icon, label, count }: { icon: string; label: string; count: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      padding: '20px 24px',
      background: 'var(--glass)',
      border: '1px solid var(--glass-border)',
      borderRadius: 16,
      transition: 'all 0.25s ease',
      cursor: 'default'
    }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--accent)';
        el.style.background = 'var(--glass-hover)';
        el.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--glass-border)';
        el.style.background = 'var(--glass)';
        el.style.transform = 'translateY(0)';
      }}
    >
      <span style={{ fontSize: 32 }}>{icon}</span>
      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{count} orgs</span>
    </div>
  );
}

/* ─── Step ─── */
function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 16, color: 'white',
        boxShadow: 'var(--shadow-accent)'
      }}>
        {num}
      </div>
      <div>
        <h3 style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{desc}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="bg-mesh" style={{ overflow: 'hidden' }}>
      {/* ── HERO ── */}
      <section style={{ padding: '100px 0 80px', textAlign: 'center', position: 'relative' }}>
        {/* Glow blobs */}
        <div style={{
          position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 300,
          background: 'radial-gradient(ellipse, rgba(0, 71, 65, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div className="container" style={{ position: 'relative' }}>
          {/* Tag */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <span className="section-tag animate-fadeIn">
              ✨ REINVENTING THE WAITING EXPERIENCE
            </span>
          </div>

          {/* Headline */}
          <h1
            className="animate-fadeInUp"
            style={{
              fontSize: 'clamp(40px, 7vw, 80px)',
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              marginBottom: 28,
              opacity: 0,
              animationDelay: '100ms'
            }}
          >
            Never Wait in Line
            <br />
            <span className="gradient-text">Again.</span>
          </h1>

          <p
            className="animate-fadeInUp"
            style={{
              fontSize: 20, color: 'var(--text-secondary)', maxWidth: 660, margin: '0 auto 40px',
              lineHeight: 1.75, opacity: 0, animationDelay: '200ms', fontWeight: 450
            }}
          >
            QueueLess replaces frustrating physical lines with seamless virtual queues. Give your customers real-time tracking, empower your staff with intuitive tools, and eliminate lobby congestion.
          </p>

          {/* CTA buttons */}
          <div
            className="animate-fadeInUp"
            style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', opacity: 0, animationDelay: '300ms' }}
          >
            <Link to="/register" className="btn btn-primary btn-lg">
              Get Started Free →
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg">
              Sign In
            </Link>
          </div>

          {/* Hero token preview */}
          <div
            className="animate-fadeInUp"
            style={{
              marginTop: 64, display: 'flex', justifyContent: 'center',
              opacity: 0, animationDelay: '400ms'
            }}
          >
            <div className="glass-card" style={{ padding: '32px 48px', maxWidth: 440, width: '100%', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Your Queue Token
              </p>
              <div className="token-display animate-float">A-042</div>
              <div style={{ marginTop: 16, display: 'flex', gap: 24, justifyContent: 'center' }}>
                <div>
                  <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>3</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>ahead of you</p>
                </div>
                <div style={{ width: 1, background: 'var(--border)' }} />
                <div>
                  <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>~12</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>min wait</p>
                </div>
                <div style={{ width: 1, background: 'var(--border)' }} />
                <div>
                  <span className="badge badge-success badge-dot" style={{ marginTop: 4 }}>Live</span>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>tracking</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: '60px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            {[
              { val: 50000, suf: '+', label: 'Customers served' },
              { val: 1200,  suf: '+', label: 'Organizations' },
              { val: 99,    suf: '.9%', label: 'Uptime SLA' },
              { val: 6,     suf: 'x',  label: 'Faster than walkins' }
            ].map(({ val, suf, label }) => (
              <div key={label} style={{
                padding: '24px 16px',
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                borderRadius: 16,
                textAlign: 'center',
                transition: 'all 0.25s ease-in-out'
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(-3px)';
                  el.style.background = 'var(--bg-elevated)';
                  el.style.borderColor = 'var(--accent)';
                  el.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(0)';
                  el.style.background = 'var(--glass)';
                  el.style.borderColor = 'var(--glass-border)';
                  el.style.boxShadow = 'none';
                }}
              >
                <p style={{ fontSize: 44, fontWeight: 900, color: 'var(--accent)', letterSpacing: '-0.03em', fontFamily: 'var(--font-header)', lineHeight: 1.1 }}>
                  <AnimatedCount target={val} suffix={suf} />
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 8 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '100px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <span className="section-tag">Features</span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: 'var(--text-primary)', marginTop: 16, letterSpacing: '-0.02em' }}>
              Everything you need to
              <span className="gradient-text"> eliminate physical queues</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            <FeatureCard icon="⚡" title="Real-Time Queue Tracking" desc="Customers see their live position and estimated wait time — updated in real-time via Firestore subscriptions." delay={0} />
            <FeatureCard icon="🏢" title="Multi-Branch Management" desc="Manage multiple branches, each with their own services, counters, and staff — all from one dashboard." delay={100} />
            <FeatureCard icon="🔔" title="Smart Notifications" desc="Customers get notified when their turn is approaching so they can arrive right on time." delay={200} />
            <FeatureCard icon="📊" title="Analytics & Reports" desc="Track peak hours, average wait times, staff performance, and customer throughput with rich charts." delay={300} />
            <FeatureCard icon="🎯" title="Priority Queuing" desc="Built-in support for VIP, Senior Citizen, and Emergency priority lanes — fair and transparent." delay={400} />
            <FeatureCard icon="📱" title="Mobile-First Design" desc="Fully responsive for both customers on phones and staff on tablets — no app install required." delay={500} />
          </div>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section style={{ padding: '80px 0', background: 'linear-gradient(180deg, transparent 0%, rgba(42, 35, 18, 0.03) 100%)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="section-tag">Use Cases</span>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, color: 'var(--text-primary)', marginTop: 14, letterSpacing: '-0.02em' }}>
              Built for every industry
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
            <UseCaseCard icon="🏥" label="Hospital" count="340+" />
            <UseCaseCard icon="🏦" label="Bank" count="210+" />
            <UseCaseCard icon="🏛️" label="Government" count="180+" />
            <UseCaseCard icon="🍽️" label="Restaurant" count="280+" />
            <UseCaseCard icon="🎓" label="College" count="90+" />
            <UseCaseCard icon="🚗" label="Auto Service" count="120+" />
            <UseCaseCard icon="💇" label="Salon" count="150+" />
            <UseCaseCard icon="🏪" label="Retail" count="200+" />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '100px 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <span className="section-tag">How it works</span>
              <h2 style={{ fontSize: 'clamp(24px, 3vw, 38px)', fontWeight: 800, color: 'var(--text-primary)', marginTop: 16, marginBottom: 40, letterSpacing: '-0.02em' }}>
                Queue smarter in
                <span className="gradient-text"> 3 simple steps</span>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                <Step num={1} title="Find your service" desc="Search for your bank, hospital, or any registered organization and pick the service you need." />
                <Step num={2} title="Join the queue" desc="Get your token instantly. No physical ticket required — your phone is your place in line." />
                <Step num={3} title="Show up on time" desc="Watch your live position drop in real-time. Arrive just before your turn — never early, never late." />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="glass-card animate-float" style={{ padding: 28, maxWidth: 300, width: '100%' }}>
                {/* Mock queue list */}
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                  🏥 City Hospital — General OPD
                </p>
                {[
                  { token: 'A-040', name: 'Kumar R.', status: 'CALLED', color: 'var(--warning)' },
                  { token: 'A-041', name: 'Priya S.', status: 'WAITING', color: 'var(--text-muted)' },
                  { token: 'A-042', name: 'You 👋',   status: 'WAITING', color: 'var(--accent-hover)', highlight: true },
                  { token: 'A-043', name: 'Rahul M.',  status: 'WAITING', color: 'var(--text-muted)' }
                ].map(item => (
                  <div
                    key={item.token}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: 10, marginBottom: 8,
                      background: item.highlight ? 'var(--accent-soft)' : 'var(--glass)',
                      border: `1px solid ${item.highlight ? 'rgba(0, 71, 65, 0.25)' : 'var(--border)'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: item.color, fontFamily: 'monospace' }}>{item.token}</span>
                      <span style={{ fontSize: 13, color: item.highlight ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.name}</span>
                    </div>
                    <span className={`badge ${item.status === 'CALLED' ? 'badge-warning' : 'badge-muted'}`}>{item.status}</span>
                  </div>
                ))}
                <div className="progress-bar" style={{ marginTop: 16 }}>
                  <div className="progress-fill" style={{ width: '60%' }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>~12 min estimated wait</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '100px 0', textAlign: 'center', position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0, 71, 65, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div className="container" style={{ position: 'relative' }}>
          <div className="glass-card" style={{ padding: '64px 48px', maxWidth: 680, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 16, letterSpacing: '-0.02em' }}>
              Ready to go <span className="gradient-text">QueueLess?</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 17, marginBottom: 36, lineHeight: 1.6 }}>
              Join thousands of organizations already saving their customers' time. Free to get started.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary btn-lg">Create Free Account</Link>
              <Link to="/login"    className="btn btn-secondary btn-lg">Sign In</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '32px 0', textAlign: 'center' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🎫</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>
                Queue<span style={{ color: 'var(--accent-hover)' }}>Less</span>
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              © 2026 QueueLess. Never wait in line again.
            </p>
            <div style={{ display: 'flex', gap: 20 }}>
              {['Privacy', 'Terms', 'Contact'].map(l => (
                <a key={l} href="#" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--text-secondary)')}
                  onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--text-muted)')}
                >{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
