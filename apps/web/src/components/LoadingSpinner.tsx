import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export default function LoadingSpinner({ size = 'md', className = '', label }: LoadingSpinnerProps) {
  const sizes = { sm: 16, md: 24, lg: 40 };
  const px = sizes[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        style={{
          width: px,
          height: px,
          border: `${size === 'sm' ? 2 : 3}px solid rgba(99,102,241,0.2)`,
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite'
        }}
      />
      {label && <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{label}</p>}
    </div>
  );
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)'
    }}>
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}
