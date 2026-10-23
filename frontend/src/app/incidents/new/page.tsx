'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { IncidentSeverity, Environment } from '../../../lib/types';
import { AlertTriangle, ArrowLeft, Save, Server, Shield } from 'lucide-react';
import Link from 'next/link';

export default function NewIncidentPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('P1');
  const [service, setService] = useState('');
  const [environment, setEnvironment] = useState<Environment>('production');
  const [operatorNotes, setOperatorNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !service.trim() || !summary.trim()) {
      setError('Please provide a title, service name, and summary.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const created = await api.createIncident({
        title,
        summary,
        severity,
        service,
        environment,
        operatorNotes,
        status: 'investigating',
      });
      router.push(`/incidents/${created.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            marginBottom: '12px',
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Console</span>
        </Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Declare New Incident
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
          Initialize an incident triage workspace with automated sanitization and evidence correlation.
        </p>
      </div>

      <div className="card">
        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: '#fca5a5',
              fontSize: '0.875rem',
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Incident Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Payment Gateway 504 Gateway Timeouts"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Severity Level *</label>
              <select
                className="form-select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
              >
                <option value="P1">P1 - Critical (Outage)</option>
                <option value="P2">P2 - Major Degradation</option>
                <option value="P3">P3 - Moderate Issue</option>
                <option value="P4">P4 - Low / Minor</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Service Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. payment-service"
                value={service}
                onChange={(e) => setService(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Environment *</label>
              <select
                className="form-select"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as Environment)}
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="canary">Canary</option>
                <option value="development">Development</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Incident Summary &amp; Initial Symptoms *</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Describe what occurred, impacted customer journeys, and error signatures..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Operator Triage Notes (Optional)</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="On-call triage observations, responder names, bridge URL..."
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
            />
          </div>

          <div
            style={{
              padding: '14px',
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: '#93c5fd',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Shield size={18} />
            <span>
              <strong>Zero Secret Leakage:</strong> All subsequently ingested logs and traces will be sanitized against credential patterns prior to analysis.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Link href="/" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Save size={16} />
              <span>{loading ? 'Creating...' : 'Create Incident & Open Workspace'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
