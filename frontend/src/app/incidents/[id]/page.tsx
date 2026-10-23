'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import {
  AiAnalysisResponse,
  EvidenceItem,
  Incident,
  IncidentStatus,
  RemediationProposal,
  TimelineEvent,
} from '../../../lib/types';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  FileCode,
  FileText,
  GitBranch,
  Layers,
  Lock,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  UploadCloud,
  XCircle,
} from 'lucide-react';

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentId = params?.id as string;
  const { user } = useAuth();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [remediations, setRemediations] = useState<RemediationProposal[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResponse | null>(null);

  const [activeTab, setActiveTab] = useState<'timeline' | 'evidence' | 'ai' | 'remediation'>('timeline');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ingestion Modal State
  const [ingestModalOpen, setIngestModalOpen] = useState(false);
  const [ingestType, setIngestType] = useState<'log' | 'trace' | 'deployment' | 'runbook'>('log');
  const [logForm, setLogForm] = useState({ source: '', level: 'ERROR', message: '' });
  const [traceForm, setTraceForm] = useState({ traceId: '', rootSpan: '', latencyMs: 3200, httpStatus: 504 });
  const [deployForm, setDeployForm] = useState({
    version: 'v2.4.2',
    author: 'sre-dev@corp.internal',
    changeSummary: '',
    commitHash: 'a1b2c3d4',
  });
  const [runbookForm, setRunbookForm] = useState({ title: '', content: '' });

  // Approval Modal State
  const [approvalModalProposal, setApprovalModalProposal] = useState<RemediationProposal | null>(null);
  const [operatorNotes, setOperatorNotes] = useState('');
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);

  // Rejection Modal State
  const [rejectionModalProposal, setRejectionModalProposal] = useState<RemediationProposal | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Simulation execution state
  const [executingProposalId, setExecutingProposalId] = useState<string | null>(null);

  // Copied query feedback state
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);

  const fetchAllData = React.useCallback(async () => {
    if (!incidentId) return;
    try {
      setLoading(true);
      setError(null);
      const [incData, tlData, evData, remData] = await Promise.all([
        api.getIncident(incidentId),
        api.getTimeline(incidentId),
        api.getEvidence(incidentId),
        api.getRemediations(incidentId),
      ]);
      setIncident(incData);
      setTimeline(tlData);
      setEvidence(evData);
      setRemediations(remData);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load incident workspace');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    if (!incident) return;
    try {
      const updated = await api.updateIncident(incident.id, { status: newStatus });
      setIncident(updated);
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleRunAiAnalysis = async () => {
    if (!incident) return;
    try {
      setLoading(true);
      const analysis = await api.runAiAnalysis(incident.id);
      setAiAnalysis(analysis);
      // Refresh remediations as AI analysis saves newly proposed actions
      const remData = await api.getRemediations(incident.id);
      setRemediations(remData);
      setActiveTab('ai');
    } catch (err: any) {
      alert(`AI Correlation error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;

    try {
      if (ingestType === 'log') {
        await api.ingestLog(incident.id, {
          source: logForm.source || incident.service,
          level: logForm.level,
          message: logForm.message,
        });
      } else if (ingestType === 'trace') {
        await api.ingestTrace(incident.id, {
          traceId: traceForm.traceId || `tr_${Date.now()}`,
          rootSpan: traceForm.rootSpan || `POST /${incident.service}`,
          latencyMs: Number(traceForm.latencyMs),
          httpStatus: Number(traceForm.httpStatus),
        });
      } else if (ingestType === 'deployment') {
        await api.ingestDeployment(incident.id, {
          deploymentId: `dep_${Date.now()}`,
          version: deployForm.version,
          service: incident.service,
          author: deployForm.author,
          changeSummary: deployForm.changeSummary,
          commitHash: deployForm.commitHash,
        });
      } else if (ingestType === 'runbook') {
        await api.ingestRunbook(incident.id, {
          title: runbookForm.title || `${incident.service} Runbook`,
          service: incident.service,
          content: runbookForm.content,
        });
      }

      setIngestModalOpen(false);
      // Reset forms
      setLogForm({ source: '', level: 'ERROR', message: '' });
      await fetchAllData();
    } catch (err: any) {
      alert(`Ingestion failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleApproveProposal = async () => {
    if (!approvalModalProposal) return;
    try {
      setApprovalSubmitting(true);
      await api.approveRemediation(approvalModalProposal.id, operatorNotes);
      setApprovalModalProposal(null);
      setOperatorNotes('');
      const remData = await api.getRemediations(incidentId);
      setRemediations(remData);
    } catch (err: any) {
      alert(`Approval error: ${err.response?.data?.message || err.message}`);
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const handleRejectProposal = async () => {
    if (!rejectionModalProposal) return;
    try {
      await api.rejectRemediation(rejectionModalProposal.id, rejectionReason);
      setRejectionModalProposal(null);
      setRejectionReason('');
      const remData = await api.getRemediations(incidentId);
      setRemediations(remData);
    } catch (err: any) {
      alert(`Rejection error: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleExecuteSimulation = async (proposalId: string) => {
    try {
      setExecutingProposalId(proposalId);
      await api.executeSimulation(proposalId);
      const remData = await api.getRemediations(incidentId);
      setRemediations(remData);
    } catch (err: any) {
      alert(`Simulation error: ${err.response?.data?.message || err.message}`);
    } finally {
      setExecutingProposalId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQueryId(id);
    setTimeout(() => setCopiedQueryId(null), 2000);
  };

  if (loading && !incident) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Clock size={32} className="animate-spin" style={{ margin: '0 auto 16px' }} />
        <p>Loading incident telemetry &amp; timeline workspace...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#f87171' }}>
        <AlertTriangle size={32} style={{ margin: '0 auto 16px' }} />
        <p>{error || 'Incident not found'}</p>
        <Link href="/" className="btn btn-secondary" style={{ marginTop: '16px' }}>
          Back to Incidents
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={14} />
          <span>Console</span>
        </Link>
        <span style={{ color: 'var(--text-dim)' }}>/</span>
        <span style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{incident.id}</span>
      </div>

      {/* Incident Header Card */}
      <div
        className="card"
        style={{
          borderLeft: `4px solid ${
            incident.severity === 'P1'
              ? '#ef4444'
              : incident.severity === 'P2'
              ? '#f59e0b'
              : incident.severity === 'P3'
              ? '#38bdf8'
              : '#94a3b8'
          }`,
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span className={`badge badge-${incident.severity.toLowerCase()}`}>
                {incident.severity}
              </span>
              <span className={`badge badge-${incident.status}`}>
                {incident.status}
              </span>
              {incident.isDemo && <span className="badge badge-synthetic">DEMO DATA</span>}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Started: {new Date(incident.startedAt).toLocaleString()}
              </span>
            </div>

            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
              {incident.title}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px', maxWidth: '800px', lineHeight: 1.5 }}>
              {incident.summary}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', fontSize: '0.825rem', color: 'var(--text-dim)' }}>
              <div>
                <strong>Service:</strong> <code style={{ color: 'var(--accent-cyan)' }}>{incident.service}</code>
              </div>
              <div>
                <strong>Environment:</strong> <span style={{ textTransform: 'capitalize' }}>{incident.environment}</span>
              </div>
              <div>
                <strong>Evidence Items:</strong> {evidence.length}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>STATUS:</label>
              <select
                className="select-input"
                value={incident.status}
                onChange={(e) => handleStatusChange(e.target.value as IncidentStatus)}
              >
                <option value="investigating">Investigating</option>
                <option value="identified">Identified</option>
                <option value="monitoring">Monitoring</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setIngestModalOpen(true)} className="btn btn-secondary btn-sm">
                <UploadCloud size={14} />
                <span>Ingest Evidence</span>
              </button>
              <button onClick={handleRunAiAnalysis} className="btn btn-primary btn-sm">
                <Sparkles size={14} />
                <span>Run AI Correlation</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Workspace Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '24px',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveTab('timeline')}
          className={`btn ${activeTab === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', borderBottom: 'none' }}
        >
          <Clock size={16} />
          <span>Timeline ({timeline.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('evidence')}
          className={`btn ${activeTab === 'evidence' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', borderBottom: 'none' }}
        >
          <Layers size={16} />
          <span>Sanitized Evidence ({evidence.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`btn ${activeTab === 'ai' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', borderBottom: 'none' }}
        >
          <Sparkles size={16} />
          <span>Hypotheses &amp; Diagnostic Queries</span>
        </button>

        <button
          onClick={() => setActiveTab('remediation')}
          className={`btn ${activeTab === 'remediation' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', borderBottom: 'none' }}
        >
          <ShieldCheck size={16} />
          <span>Remediation &amp; Approvals ({remediations.length})</span>
        </button>
      </div>

      {/* TAB 1: Correlated Timeline */}
      {activeTab === 'timeline' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Chronological Evidence Timeline</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                Correlated sequence of deployment events, metric deviations, error spikes, and operator actions
              </p>
            </div>
            <button onClick={() => setIngestModalOpen(true)} className="btn btn-secondary btn-sm">
              <Plus size={14} />
              <span>Add Event</span>
            </button>
          </div>

          {timeline.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Clock size={28} style={{ margin: '0 auto 8px', color: 'var(--text-dim)' }} />
              <p>No timeline events correlated yet. Ingest logs or deployments to generate timeline nodes.</p>
            </div>
          ) : (
            <div className="timeline-container">
              <div className="timeline-line" />
              {timeline.map((event) => (
                <div key={event.id} className="timeline-item">
                  <div
                    className="timeline-marker"
                    style={{
                      borderColor:
                        event.severity === 'critical'
                          ? '#ef4444'
                          : event.severity === 'warning'
                          ? '#f59e0b'
                          : '#38bdf8',
                    }}
                  >
                    {event.category === 'deployment' ? (
                      <GitBranch size={10} color="#38bdf8" />
                    ) : event.category === 'error_spike' ? (
                      <AlertOctagon size={10} color="#ef4444" />
                    ) : (
                      <Activity size={10} color="#f59e0b" />
                    )}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{event.title}</span>
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.7rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {event.category}
                        </span>
                      </div>
                      <span className="timeline-time">
                        {new Date(event.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, marginTop: '4px' }}>
                      {event.description}
                    </p>
                    {event.evidenceIds && event.evidenceIds.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Linked Evidence:</span>
                        {event.evidenceIds.map((eid) => (
                          <span
                            key={eid}
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.7rem',
                              padding: '2px 6px',
                              backgroundColor: 'rgba(56, 189, 248, 0.1)',
                              color: '#38bdf8',
                              borderRadius: '4px',
                            }}
                          >
                            {eid}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Sanitized Evidence Drawer */}
      {activeTab === 'evidence' && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Sanitized Evidence Ledger</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Credentials, tokens, authorization headers, and personal data are strictly redacted before persistence
              </p>
            </div>
            <button onClick={() => setIngestModalOpen(true)} className="btn btn-primary btn-sm">
              <UploadCloud size={14} />
              <span>Ingest Raw Artifact</span>
            </button>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {evidence.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <Layers size={32} style={{ margin: '0 auto 12px', color: 'var(--text-dim)' }} />
                <p>No evidence items attached. Ingest logs, traces, or deployment records above.</p>
              </div>
            ) : (
              evidence.map((item) => (
                <div key={item.id} className="card" style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.title}</span>
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.7rem',
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                          }}
                        >
                          {item.type}
                        </span>
                        {item.redactionSummary?.tokensRedacted > 0 && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#fca5a5',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                            }}
                          >
                            <Shield size={10} />
                            {item.redactionSummary.tokensRedacted} SECRETS REDACTED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                        Source: <code>{item.source}</code> • Captured:{' '}
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {item.id}
                    </span>
                  </div>

                  {/* Redacted Sanitized Preview Box */}
                  <div
                    style={{
                      backgroundColor: '#070b12',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      color: '#cbd5e1',
                      overflowX: 'auto',
                      maxHeight: '200px',
                    }}
                  >
                    <pre style={{ margin: 0 }}>
                      {JSON.stringify(item.sanitizedPayload, null, 2)}
                    </pre>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Hypotheses & Diagnostic Queries */}
      {activeTab === 'ai' && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                Evidence-Linked Hypotheses &amp; Diagnostic Queries
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Strictly distinguishes observable facts from speculative AI interpretation
              </p>
            </div>
            <button onClick={handleRunAiAnalysis} className="btn btn-secondary btn-sm">
              <RefreshCw size={14} />
              <span>Re-analyze</span>
            </button>
          </div>

          {!aiAnalysis ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
              <Sparkles size={36} color="var(--accent-purple)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Run AI Evidence Correlation</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '440px', margin: '8px auto 20px' }}>
                Correlates ingested logs, traces, and deployment timestamps against verified runbooks.
              </p>
              <button onClick={handleRunAiAnalysis} className="btn btn-primary">
                Trigger Correlation Engine
              </button>
            </div>
          ) : (
            <div>
              {/* Correlation Summary Banner */}
              <div
                style={{
                  padding: '14px 18px',
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <strong style={{ color: '#d8b4fe' }}>Correlation Engine:</strong>{' '}
                  <span style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{aiAnalysis.summary}</span>
                </div>
                <span className="badge" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#e9d5ff' }}>
                  {aiAnalysis.provider}
                </span>
              </div>

              {/* Hypotheses List */}
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Root Cause Hypotheses
                </h3>
                {aiAnalysis.hypotheses.map((hyp) => (
                  <div key={hyp.id} className="hypothesis-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f3e8ff' }}>{hyp.title}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#c084fc' }}>
                          Confidence: {Math.round(hyp.confidenceScore * 100)}%
                        </span>
                        <div
                          style={{
                            width: '80px',
                            height: '6px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.round(hyp.confidenceScore * 100)}%`,
                              height: '100%',
                              backgroundColor: 'var(--accent-purple)',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Observable Facts */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.05em' }}>
                        Observed Facts (Telemetry Truth)
                      </div>
                      <ul className="observed-facts-list">
                        {hyp.observedFacts.map((fact, idx) => (
                          <li key={idx} className="observed-fact-item">
                            <CheckCircle2 size={15} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* AI Interpretation */}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#c084fc', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        AI Model Interpretation
                      </div>
                      <div className="ai-interpretation-box">
                        {hyp.aiInterpretation}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Diagnostic Queries */}
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Safe Read-Only Diagnostic Queries
                </h3>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {aiAnalysis.diagnosticQueries.map((dq) => (
                    <div key={dq.id} className="card" style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                            {dq.engine}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{dq.purpose}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          Target: {dq.targetSystem}
                        </span>
                      </div>

                      <div className="query-box">
                        <code>{dq.query}</code>
                        <button
                          onClick={() => copyToClipboard(dq.query, dq.id)}
                          className="copy-btn"
                          title="Copy query"
                        >
                          {copiedQueryId === dq.id ? (
                            <>
                              <Check size={12} color="#10b981" />
                              <span style={{ color: '#10b981' }}>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                        <strong>Expected Output:</strong> {dq.expectedOutput}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Runbook Recommendations */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Runbook Recommendations
                </h3>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {aiAnalysis.runbookRecommendations.map((rb) => (
                    <div key={rb.id} className="card" style={{ padding: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <FileCode size={18} color="var(--accent-cyan)" />
                        <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{rb.runbookTitle}</h4>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        <strong>Rationale:</strong> {rb.rationale}
                      </p>
                      <div>
                        <strong style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                          Key Sections:
                        </strong>
                        <ul style={{ listStyle: 'disc', paddingLeft: '20px', marginTop: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                          {rb.relevantSections.map((sec, idx) => (
                            <li key={idx}>{sec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Remediation Proposals & Operator Approval Gate */}
      {activeTab === 'remediation' && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Operator Remediation Gate</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Default recommendation-only mode. Remediation actions require explicit human operator review and approval.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            {remediations.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <ShieldAlert size={32} style={{ margin: '0 auto 12px', color: 'var(--text-dim)' }} />
                <p>No remediation proposals generated yet. Run AI correlation to recommend plans.</p>
                <button onClick={handleRunAiAnalysis} className="btn btn-primary" style={{ marginTop: '16px' }}>
                  Run AI Correlation
                </button>
              </div>
            ) : (
              remediations.map((rem) => (
                <div
                  key={rem.id}
                  className="card"
                  style={{
                    borderLeft: `4px solid ${
                      rem.riskLevel === 'CRITICAL'
                        ? '#ef4444'
                        : rem.riskLevel === 'HIGH'
                        ? '#f59e0b'
                        : rem.riskLevel === 'MEDIUM'
                        ? '#38bdf8'
                        : '#10b981'
                    }`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              rem.riskLevel === 'CRITICAL'
                                ? 'rgba(239, 68, 68, 0.2)'
                                : rem.riskLevel === 'HIGH'
                                ? 'rgba(245, 158, 11, 0.2)'
                                : rem.riskLevel === 'MEDIUM'
                                ? 'rgba(56, 189, 248, 0.2)'
                                : 'rgba(16, 185, 129, 0.2)',
                            color:
                              rem.riskLevel === 'CRITICAL'
                                ? '#fca5a5'
                                : rem.riskLevel === 'HIGH'
                                ? '#fde68a'
                                : rem.riskLevel === 'MEDIUM'
                                ? '#7dd3fc'
                                : '#86efac',
                          }}
                        >
                          RISK: {rem.riskLevel}
                        </span>

                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              rem.approvalStatus === 'APPROVED'
                                ? 'rgba(16, 185, 129, 0.2)'
                                : rem.approvalStatus === 'REJECTED'
                                ? 'rgba(239, 68, 68, 0.2)'
                                : rem.approvalStatus === 'EXECUTED_SIMULATED'
                                ? 'rgba(99, 102, 241, 0.2)'
                                : 'rgba(245, 158, 11, 0.2)',
                            color:
                              rem.approvalStatus === 'APPROVED'
                                ? '#6ee7b7'
                                : rem.approvalStatus === 'REJECTED'
                                ? '#fca5a5'
                                : rem.approvalStatus === 'EXECUTED_SIMULATED'
                                ? '#a5b4fc'
                                : '#fde68a',
                          }}
                        >
                          {rem.approvalStatus}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{rem.title}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                        <strong>Expected Impact:</strong> {rem.expectedImpact}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {rem.approvalStatus === 'PENDING_APPROVAL' && (
                        <>
                          <button
                            onClick={() => setRejectionModalProposal(rem)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#fca5a5' }}
                          >
                            <XCircle size={14} />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() => setApprovalModalProposal(rem)}
                            className="btn btn-primary btn-sm"
                          >
                            <CheckCircle2 size={14} />
                            <span>Review &amp; Approve</span>
                          </button>
                        </>
                      )}

                      {rem.approvalStatus === 'APPROVED' && (
                        <button
                          onClick={() => handleExecuteSimulation(rem.id)}
                          disabled={executingProposalId === rem.id}
                          className="btn btn-success btn-sm"
                        >
                          <Play size={14} />
                          <span>
                            {executingProposalId === rem.id ? 'Simulating...' : 'Execute Dry-Run Simulation'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Prerequisites */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '4px' }}>
                      Prerequisites &amp; Safeguards
                    </div>
                    <ul style={{ listStyle: 'none', paddingLeft: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>
                      {rem.prerequisites.map((p, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <Check size={14} color="#10b981" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Step-by-step Execution Plan */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px' }}>
                      Execution Sequence
                    </div>
                    <div style={{ backgroundColor: '#070b12', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      {rem.executionSteps.map((step, idx) => (
                        <div key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#38bdf8', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>[{idx + 1}]</span> {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rollback Instructions (MANDATORY REQUIREMENT) */}
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#fbbf24', marginBottom: '4px' }}>
                      <AlertTriangle size={14} />
                      <span>Rollback Instructions (Emergency Recovery)</span>
                    </div>
                    {rem.rollbackInstructions.map((rb, idx) => (
                      <div key={idx} style={{ fontSize: '0.825rem', color: '#fde68a', marginTop: '2px' }}>
                        • {rb}
                      </div>
                    ))}
                  </div>

                  {/* Approval Meta Information */}
                  {rem.approvedBy && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <span>
                        Approved by: <strong style={{ color: '#6ee7b7' }}>{rem.approvedBy}</strong>
                      </span>
                      <span>Approved at: {new Date(rem.approvedAt || '').toLocaleString()}</span>
                    </div>
                  )}

                  {/* Simulated Execution Console Output */}
                  {rem.executionSimulatedResult && (
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#a5b4fc', marginBottom: '4px' }}>
                        <Terminal size={14} />
                        <span>Simulated Dry-Run Console Output</span>
                      </div>
                      <div
                        style={{
                          backgroundColor: '#05080f',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          color: '#a5b4fc',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {rem.executionSimulatedResult.stdout}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: Operator Approval Gate */}
      {approvalModalProposal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#10b981" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Operator Remediation Approval</h3>
              </div>
              <button
                onClick={() => setApprovalModalProposal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Proposal
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                  {approvalModalProposal.title}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Impact: {approvalModalProposal.expectedImpact}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Operator Justification &amp; Verification Notes *</label>
                <textarea
                  className="form-textarea"
                  placeholder="Record why this action is safe to execute and confirm prerequisites are verified..."
                  value={operatorNotes}
                  onChange={(e) => setOperatorNotes(e.target.value)}
                  required
                />
              </div>

              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  color: '#fca5a5',
                }}
              >
                <strong>Audit Notice:</strong> This approval action will be permanently recorded in the immutable compliance audit ledger with your operator identifier.
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setApprovalModalProposal(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleApproveProposal}
                disabled={!operatorNotes.trim() || approvalSubmitting}
                className="btn btn-success"
              >
                <CheckCircle2 size={16} />
                <span>{approvalSubmitting ? 'Recording...' : 'Approve Remediation Plan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Rejection Gate */}
      {rejectionModalProposal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={20} color="#ef4444" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Reject Remediation Plan</h3>
              </div>
              <button
                onClick={() => setRejectionModalProposal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Reason for Rejection *</label>
                <textarea
                  className="form-textarea"
                  placeholder="Explain why this proposal is unsuitable (e.g. schema migration incompatibility)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setRejectionModalProposal(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleRejectProposal}
                disabled={!rejectionReason.trim()}
                className="btn btn-danger"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ingest Evidence */}
      {ingestModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UploadCloud size={20} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Ingest Raw Artifact (Auto-Sanitized)</h3>
              </div>
              <button
                onClick={() => setIngestModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIngestSubmit}>
              <div className="modal-body">
                {/* Type Selection */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                  {(['log', 'trace', 'deployment', 'runbook'] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setIngestType(t)}
                      className={`btn btn-sm ${ingestType === t ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {ingestType === 'log' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Level</label>
                        <select
                          className="form-select"
                          value={logForm.level}
                          onChange={(e) => setLogForm({ ...logForm, level: e.target.value })}
                        >
                          <option value="ERROR">ERROR</option>
                          <option value="FATAL">FATAL</option>
                          <option value="WARN">WARN</option>
                          <option value="INFO">INFO</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Source Pod / Container</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder={incident.service}
                          value={logForm.source}
                          onChange={(e) => setLogForm({ ...logForm, source: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Raw Log Message *</label>
                      <textarea
                        className="form-textarea"
                        rows={4}
                        placeholder="Paste stack trace or error log (Credentials &amp; secrets will be redacted)..."
                        value={logForm.message}
                        onChange={(e) => setLogForm({ ...logForm, message: e.target.value })}
                        required
                      />
                    </div>
                  </>
                )}

                {ingestType === 'trace' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Root Span Endpoint</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="POST /api/v1/checkout"
                          value={traceForm.rootSpan}
                          onChange={(e) => setTraceForm({ ...traceForm, rootSpan: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">HTTP Status Code</label>
                        <input
                          type="number"
                          className="form-input"
                          value={traceForm.httpStatus}
                          onChange={(e) => setTraceForm({ ...traceForm, httpStatus: Number(e.target.value) })}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Latency (ms)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={traceForm.latencyMs}
                        onChange={(e) => setTraceForm({ ...traceForm, latencyMs: Number(e.target.value) })}
                        required
                      />
                    </div>
                  </>
                )}

                {ingestType === 'deployment' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Version Tag</label>
                        <input
                          type="text"
                          className="form-input"
                          value={deployForm.version}
                          onChange={(e) => setDeployForm({ ...deployForm, version: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Author</label>
                        <input
                          type="text"
                          className="form-input"
                          value={deployForm.author}
                          onChange={(e) => setDeployForm({ ...deployForm, author: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Change Summary</label>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        placeholder="What changed in this build..."
                        value={deployForm.changeSummary}
                        onChange={(e) => setDeployForm({ ...deployForm, changeSummary: e.target.value })}
                        required
                      />
                    </div>
                  </>
                )}

                {ingestType === 'runbook' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Runbook Title</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Payment Gateway Recovery Playbook"
                        value={runbookForm.title}
                        onChange={(e) => setRunbookForm({ ...runbookForm, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Runbook Markdown Content</label>
                      <textarea
                        className="form-textarea"
                        rows={5}
                        placeholder="# Playbook Content..."
                        value={runbookForm.content}
                        onChange={(e) => setRunbookForm({ ...runbookForm, content: e.target.value })}
                        required
                      />
                    </div>
                  </>
                )}

                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'rgba(56, 189, 248, 0.08)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    color: '#93c5fd',
                  }}
                >
                  <Shield size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Automated Sanitization Active: passwords, tokens, API keys, and IP addresses will be masked.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIngestModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Ingest &amp; Correlate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
