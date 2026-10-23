export type IncidentSeverity = 'P1' | 'P2' | 'P3' | 'P4';

export type IncidentStatus =
  | 'investigating'
  | 'identified'
  | 'monitoring'
  | 'resolved';

export type Environment = 'production' | 'staging' | 'canary' | 'development';

export type EvidenceType = 'log' | 'trace' | 'deployment' | 'runbook';

export type RemediationRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ApprovalStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED_SIMULATED';

export type DiagnosticEngine = 'PromQL' | 'LogQL' | 'SQL' | 'kubectl';

export interface RedactionSummary {
  tokensRedacted: number;
  patternsDetected: string[];
}

export interface EvidenceItem {
  id: string;
  incidentId: string;
  type: EvidenceType;
  title: string;
  source: string;
  timestamp: string;
  rawSnippetPreview: string;
  sanitizedPayload: Record<string, any>;
  redactionSummary: RedactionSummary;
  isDemo?: boolean;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  incidentId: string;
  timestamp: string;
  title: string;
  description: string;
  category:
    | 'deployment'
    | 'error_spike'
    | 'latency_anomaly'
    | 'operator_action'
    | 'runbook_match';
  severity: 'info' | 'warning' | 'critical';
  evidenceIds: string[];
  confidence: number;
}

export interface Hypothesis {
  id: string;
  incidentId: string;
  title: string;
  observedFacts: string[];
  aiInterpretation: string;
  confidenceScore: number;
  evidenceIds: string[];
  status: 'validating' | 'confirmed' | 'dismissed';
}

export interface DiagnosticQuery {
  id: string;
  incidentId: string;
  engine: DiagnosticEngine;
  query: string;
  targetSystem: string;
  purpose: string;
  expectedOutput: string;
  safeReadOnly: boolean;
}

export interface RunbookRecommendation {
  id: string;
  incidentId: string;
  runbookTitle: string;
  relevantSections: string[];
  rationale: string;
  matchedEvidenceIds: string[];
  prerequisites: string[];
}

export interface RemediationProposal {
  id: string;
  incidentId: string;
  title: string;
  riskLevel: RemediationRiskLevel;
  expectedImpact: string;
  prerequisites: string[];
  executionSteps: string[];
  rollbackInstructions: string[];
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  executionSimulatedResult?: {
    executedAt: string;
    operator: string;
    stdout: string;
    success: boolean;
    auditVerificationHash: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: string;
  title: string;
  summary: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  service: string;
  environment: Environment;
  startedAt: string;
  resolvedAt?: string;
  isDemo: boolean;
  operatorNotes?: string;
  evidenceCount: number;
  timelineCount: number;
  proposalsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditRecord {
  id: string;
  incidentId: string;
  action: string;
  performedBy: string;
  role: string;
  ipAddress: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface UserContext {
  id: string;
  username: string;
  name: string;
  role: 'OPERATOR' | 'ADMIN' | 'PUBLIC_VIEWER';
}

export interface AiAnalysisResponse {
  provider: 'ai-platform' | 'local-correlation-engine';
  rawResponse?: string;
  hypotheses: Hypothesis[];
  diagnosticQueries: DiagnosticQuery[];
  runbookRecommendations: RunbookRecommendation[];
  remediationProposals: RemediationProposal[];
  summary: string;
}
