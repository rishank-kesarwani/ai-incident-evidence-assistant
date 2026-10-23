'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { AuditRecord } from '../../lib/types';
import {
  Clock,
  History,
  Lock,
  RefreshCw,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react';

export default function AuditPage() {
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAudits = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAuditLogs();
      setAudits(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Compliance &amp; Security Audit Trail
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            Append-only audit log tracking operator approvals, remediation executions, and redactions
          </p>
        </div>
        <button onClick={fetchAudits} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Clock size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <p>Loading audit ledger...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#f87171' }}>
            <p>{error}</p>
          </div>
        ) : audits.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <History size={32} style={{ margin: '0 auto 12px', color: 'var(--text-dim)' }} />
            <p>No audit events recorded yet.</p>
          </div>
        ) : (
          <table className="incidents-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Operator</th>
                <th>Incident ID</th>
                <th>Timestamp</th>
                <th>Audit Details</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor:
                          a.action.includes('APPROVED')
                            ? 'rgba(16, 185, 129, 0.15)'
                            : a.action.includes('REJECTED')
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(56, 189, 248, 0.15)',
                        color:
                          a.action.includes('APPROVED')
                            ? '#6ee7b7'
                            : a.action.includes('REJECTED')
                            ? '#fca5a5'
                            : '#7dd3fc',
                      }}
                    >
                      {a.action}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="var(--text-dim)" />
                      <strong style={{ fontSize: '0.85rem' }}>{a.performedBy}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Role: {a.role}
                    </div>
                  </td>
                  <td>
                    <Link
                      href={`/incidents/${a.incidentId}`}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        color: 'var(--accent-cyan)',
                      }}
                    >
                      {a.incidentId}
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(a.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        color: '#94a3b8',
                        maxWidth: '400px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {JSON.stringify(a.details)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
