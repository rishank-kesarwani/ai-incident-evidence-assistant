'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { Incident } from '../lib/types';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Server,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchIncidents = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getIncidents({
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setIncidents(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [severityFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIncidents();
  };

  // Metrics calculations
  const totalCount = incidents.length;
  const p1Count = incidents.filter((i) => i.severity === 'P1').length;
  const activeCount = incidents.filter((i) => i.status !== 'resolved').length;
  const totalEvidence = incidents.reduce((acc, curr) => acc + (curr.evidenceCount || 0), 0);

  return (
    <div>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Incident Command Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Correlate sanitized logs, traces, and deployment events with approval-gated remediation
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/incidents/new" className="btn btn-primary">
            <span>+ New Incident</span>
          </Link>
        </div>
      </div>

      {/* Demo Notice Banner */}
      <div className="banner banner-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={18} color="#38bdf8" />
          <span>
            <strong>Safe Synthetic Sandbox:</strong> Ingested logs, traces, and secrets are automatically redacted before correlation or persistence.
          </span>
        </div>
        <button
          onClick={async () => {
            await api.seedDemoData();
            fetchIncidents();
          }}
          className="btn btn-secondary btn-sm"
        >
          Seed Demo Incidents
        </button>
      </div>

      {/* SRE Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <AlertOctagon size={24} />
          </div>
          <div>
            <div className="metric-value" style={{ color: p1Count > 0 ? '#ef4444' : 'var(--text-main)' }}>
              {p1Count}
            </div>
            <div className="metric-label">P1 Critical Outages</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Activity size={24} />
          </div>
          <div>
            <div className="metric-value">{activeCount}</div>
            <div className="metric-label">Active Incidents</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <Layers size={24} />
          </div>
          <div>
            <div className="metric-value">{totalEvidence}</div>
            <div className="metric-label">Ingested Evidence</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="metric-value">{totalCount - activeCount}</div>
            <div className="metric-label">Mitigated &amp; Resolved</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} className="filter-group">
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search service, title, summary..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">
            <Search size={14} />
            <span>Search</span>
          </button>
        </form>

        <div className="filter-group">
          <select
            className="select-input"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="">All Severities</option>
            <option value="P1">P1 - Critical</option>
            <option value="P2">P2 - Major</option>
            <option value="P3">P3 - Moderate</option>
            <option value="P4">P4 - Low</option>
          </select>

          <select
            className="select-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="investigating">Investigating</option>
            <option value="identified">Identified</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Resolved</option>
          </select>

          {(severityFilter || statusFilter || searchQuery) && (
            <button
              onClick={() => {
                setSeverityFilter('');
                setStatusFilter('');
                setSearchQuery('');
              }}
              className="btn btn-secondary btn-sm"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Incidents Table / List */}
      <div className="incidents-table-wrapper">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Clock size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <p>Loading incident stream...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#f87171' }}>
            <ShieldAlert size={28} style={{ margin: '0 auto 12px' }} />
            <p>{error}</p>
            <button onClick={fetchIncidents} className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }}>
              Retry
            </button>
          </div>
        ) : incidents.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center' }}>
            <Server size={36} color="var(--text-dim)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No Incidents Found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '6px', maxWidth: '400px', margin: '6px auto 18px' }}>
              No incidents match the active filters. Seed synthetic demo incidents or create a new investigation.
            </p>
            <button
              onClick={async () => {
                await api.seedDemoData();
                fetchIncidents();
              }}
              className="btn btn-primary"
            >
              <Sparkles size={16} />
              <span>Seed Demo Data</span>
            </button>
          </div>
        ) : (
          <table className="incidents-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Incident Details</th>
                <th>Service &amp; Env</th>
                <th>Status</th>
                <th>Evidence &amp; Timeline</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={inc.id}>
                  <td>
                    <span className={`badge badge-${inc.severity.toLowerCase()}`}>
                      {inc.severity}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Link href={`/incidents/${inc.id}`} style={{ color: 'inherit' }}>
                        {inc.title}
                      </Link>
                      {inc.isDemo && <span className="badge badge-synthetic">DEMO</span>}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        marginTop: '4px',
                        maxWidth: '520px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {inc.summary}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Server size={14} color="var(--accent-cyan)" />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.825rem' }}>
                        {inc.service}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px', textTransform: 'capitalize' }}>
                      {inc.environment}
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${inc.status}`}>
                      {inc.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>{inc.evidenceCount || 0} evidence</span> • <span>{inc.timelineCount || 0} events</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {new Date(inc.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <Link href={`/incidents/${inc.id}`} className="btn btn-secondary btn-sm">
                      <span>Investigate</span>
                      <ArrowRight size={14} />
                    </Link>
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
