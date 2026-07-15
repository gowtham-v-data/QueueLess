import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthContext } from '../../context/AuthProvider';
import { organizationService } from '../../services/organization.service';

const CATEGORIES = ['Hospital', 'Bank', 'Government', 'Restaurant', 'College', 'Auto Service', 'Salon', 'Retail', 'Other'];

const schema = z.object({
  name:     z.string().min(2, 'Organization name must be at least 2 characters'),
  slug:     z.string().min(2, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  tagline:  z.string().optional(),
  category: z.string().min(1, 'Please select a category'),
  primaryColor: z.string().optional()
});

type FormData = z.infer<typeof schema>;

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function OrgSetupPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [step, setStep] = useState(1);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: '', primaryColor: '#6366f1' }
  });

  const nameVal = watch('name', '');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('name', e.target.value);
    setValue('slug', slugify(e.target.value));
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setServerError('');
    setIsLoading(true);
    try {
      const existing = await organizationService.getBySlug(data.slug);
      if (existing) {
        throw new Error('This URL slug is already taken. Please choose another name or custom URL slug.');
      }

      const org = await organizationService.create(
        user.id,
        `${user.firstName} ${user.lastName}`,
        {
          name:         data.name,
          slug:         data.slug,
          tagline:      data.tagline,
          category:     data.category,
          primaryColor: data.primaryColor,
          status:       'ACTIVE'
        }
      );
      navigate('/org/dashboard', { state: { newOrg: org } });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to create organization.');
    } finally {
      setIsLoading(false);
    }
  };

  const STEP_LABELS = ['Basic Info', 'Customize', 'Review'];

  return (
    <div className="bg-mesh" style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <span className="section-tag" style={{ marginBottom: 16, display: 'inline-flex' }}>Setup Wizard</span>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Create your Organization
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            Set up your organization to start managing queues
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 36 }}>
          {STEP_LABELS.map((label, i) => {
            const num = i + 1;
            const active = num === step;
            const done   = num < step;
            return (
              <React.Fragment key={label}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: done ? 'var(--success)' : active ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'var(--glass)',
                    border: `2px solid ${done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14,
                    color: done || active ? 'white' : 'var(--text-muted)',
                    transition: 'all 0.3s'
                  }}>
                    {done ? '✓' : num}
                  </div>
                  <span style={{ fontSize: 12, color: active ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: active ? 600 : 400 }}>{label}</span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div style={{ height: 2, width: 60, background: done ? 'var(--success)' : 'var(--border)', margin: '0 8px', marginBottom: 22, transition: 'background 0.3s' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Form card */}
        <div className="glass-card" style={{ padding: 32 }}>
          {serverError && (
            <div style={{ padding: '12px 16px', background: 'var(--error-soft)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: 'var(--error)', fontSize: 14, marginBottom: 24 }}>
              ⚠ {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            {step === 1 && (
              <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label className="input-label" htmlFor="org-name">Organization Name *</label>
                  <input
                    id="org-name"
                    placeholder="e.g., City General Hospital"
                    className={`input-field${errors.name ? ' error' : ''}`}
                    {...register('name', { onChange: handleNameChange })}
                  />
                  {errors.name && <p className="input-error">⚠ {errors.name.message}</p>}
                </div>

                <div>
                  <label className="input-label" htmlFor="org-slug">URL Slug *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <span style={{
                      padding: '12px 12px', background: 'var(--glass)', border: '1px solid var(--glass-border)',
                      borderRight: 'none', borderRadius: '10px 0 0 10px', fontSize: 13, color: 'var(--text-muted)'
                    }}>queueless.app/</span>
                    <input
                      id="org-slug"
                      placeholder="city-general-hospital"
                      className={`input-field${errors.slug ? ' error' : ''}`}
                      style={{ borderRadius: '0 10px 10px 0' }}
                      {...register('slug')}
                    />
                  </div>
                  {errors.slug && <p className="input-error">⚠ {errors.slug.message}</p>}
                </div>

                <div>
                  <label className="input-label" htmlFor="org-category">Category *</label>
                  <select
                    id="org-category"
                    className={`input-field${errors.category ? ' error' : ''}`}
                    {...register('category')}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="" disabled>Select a category…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.category && <p className="input-error">⚠ {errors.category.message}</p>}
                </div>

                <div>
                  <label className="input-label" htmlFor="org-tagline">Tagline (optional)</label>
                  <input
                    id="org-tagline"
                    placeholder="e.g., Caring for the community since 1990"
                    className="input-field"
                    {...register('tagline')}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn btn-primary"
                  style={{ width: '100%', height: 48 }}
                  disabled={!nameVal}
                >
                  Continue →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label className="input-label" htmlFor="primary-color">Brand Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      id="primary-color"
                      type="color"
                      className="input-field"
                      style={{ width: 80, height: 48, padding: 4, cursor: 'pointer' }}
                      {...register('primaryColor')}
                    />
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Choose your brand color — shown on your queue page.</p>
                  </div>
                </div>

                <div style={{ padding: 20, background: 'var(--glass)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>What's next after creation?</p>
                  <ul style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
                    <li>✓ Add branches (locations)</li>
                    <li>✓ Create services (what customers queue for)</li>
                    <li>✓ Set up counters for staff</li>
                    <li>✓ Share the link — customers can join immediately</li>
                  </ul>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setStep(1)} className="btn btn-secondary" style={{ flex: 1 }}>← Back</button>
                  <button type="button" onClick={() => setStep(3)} className="btn btn-primary" style={{ flex: 2 }}>Review →</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ padding: 20, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 12 }}>
                  <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 16 }}>Review your organization</p>
                  {[
                    { label: 'Name',     value: watch('name') },
                    { label: 'Slug',     value: `queueless.app/${watch('slug')}` },
                    { label: 'Category', value: watch('category') },
                    { label: 'Tagline',  value: watch('tagline') ?? '—' }
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 80 }}>{row.label}:</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setStep(2)} className="btn btn-secondary" style={{ flex: 1 }}>← Back</button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary"
                    style={{ flex: 2, height: 48 }}
                  >
                    {isLoading ? <><span className="spinner" /> Creating…</> : '🚀 Create Organization'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
