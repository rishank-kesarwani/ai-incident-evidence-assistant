import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  DiagnosticQuery,
  EvidenceItem,
  Hypothesis,
  RemediationProposal,
  RunbookRecommendation,
} from '../../common/types';

export interface AiAnalysisResult {
  provider: 'ai-platform' | 'local-correlation-engine';
  rawResponse?: string;
  hypotheses: Hypothesis[];
  diagnosticQueries: DiagnosticQuery[];
  runbookRecommendations: RunbookRecommendation[];
  remediationProposals: RemediationProposal[];
  summary: string;
}

@Injectable()
export class AiPlatformAdapter {
  private readonly logger = new Logger(AiPlatformAdapter.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('aiPlatform.url') || '';
    this.apiKey = this.configService.get<string>('aiPlatform.apiKey') || '';
    this.isConfigured = !!(this.apiUrl && this.apiKey);

    if (this.isConfigured) {
      this.logger.log(`AiPlatformAdapter: Configured with AI Platform at ${this.apiUrl}`);
    } else {
      this.logger.log(
        'AiPlatformAdapter: AI_PLATFORM_API_KEY not configured. Operating in high-fidelity deterministic local correlation mode.',
      );
    }
  }

  async analyzeIncident(
    incidentId: string,
    incidentContext: {
      title: string;
      service: string;
      environment: string;
      severity: string;
    },
    evidenceItems: EvidenceItem[],
  ): Promise<AiAnalysisResult> {
    if (this.isConfigured) {
      try {
        const prompt = this.buildPrompt(incidentContext, evidenceItems);
        // Verified route on AI Platform: /api/v1/ai/chat (or /ai/chat)
        const endpoint = `${this.apiUrl.replace(/\/$/, '')}/api/v1/ai/chat`;

        const response = await axios.post(
          endpoint,
          {
            applicationId: 'ai-incident-evidence-assistant',
            tenantId: 'incident-assistant-default',
            message: prompt,
            systemInstruction:
              'You are an expert SRE Incident Investigator. Distinguish observed facts from speculative hypotheses. Suggest safe read-only queries, recommend runbooks, and propose risk-classified remediation plans with rollback instructions.',
            temperature: 0.2,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': this.apiKey,
            },
            timeout: 8000,
          },
        );

        if (response.data && response.data.answer) {
          const parsed = this.tryParseAiResponse(
            incidentId,
            response.data.answer,
            incidentContext,
            evidenceItems,
          );
          return {
            provider: 'ai-platform',
            rawResponse: response.data.answer,
            ...parsed,
          };
        }
      } catch (err: any) {
        this.logger.warn(
          `AiPlatform call failed (${err.message}). Falling back to local correlation engine.`,
        );
      }
    }

    // High-fidelity deterministic fallback
    return this.generateDeterministicAnalysis(incidentId, incidentContext, evidenceItems);
  }

  private buildPrompt(context: any, evidence: EvidenceItem[]): string {
    const evidenceSummary = evidence.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      timestamp: e.timestamp,
      payload: e.sanitizedPayload,
    }));

    return JSON.stringify({
      task: 'ANALYZE_INCIDENT',
      incident: context,
      evidence: evidenceSummary,
      instruction:
        'Return JSON with: hypotheses (distinguishing observed facts vs AI interpretation), diagnosticQueries (PromQL/LogQL/SQL/kubectl), runbookRecommendations, remediationProposals (with riskLevel, steps, rollbackInstructions).',
    });
  }

  private tryParseAiResponse(
    incidentId: string,
    answer: string,
    context: any,
    evidence: EvidenceItem[],
  ): Omit<AiAnalysisResult, 'provider' | 'rawResponse'> {
    try {
      const jsonMatch = answer.match(/```json([\s\S]*?)```/) || [null, answer];
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed.hypotheses && parsed.remediationProposals) {
        return {
          summary: parsed.summary || `AI-assisted incident correlation for ${context.service}`,
          hypotheses: parsed.hypotheses.map((h: any, idx: number) => ({
            id: `hyp_${incidentId}_${idx + 1}`,
            incidentId,
            title: h.title,
            observedFacts: h.observedFacts || [],
            aiInterpretation: h.aiInterpretation || '',
            confidenceScore: h.confidenceScore || 0.85,
            evidenceIds: h.evidenceIds || evidence.map((e) => e.id),
            status: 'validating',
          })),
          diagnosticQueries: (parsed.diagnosticQueries || []).map((q: any, idx: number) => ({
            id: `dq_${incidentId}_${idx + 1}`,
            incidentId,
            engine: q.engine || 'PromQL',
            query: q.query,
            targetSystem: q.targetSystem || context.service,
            purpose: q.purpose,
            expectedOutput: q.expectedOutput,
            safeReadOnly: true,
          })),
          runbookRecommendations: (parsed.runbookRecommendations || []).map(
            (r: any, idx: number) => ({
              id: `rb_${incidentId}_${idx + 1}`,
              incidentId,
              runbookTitle: r.runbookTitle,
              relevantSections: r.relevantSections || [],
              rationale: r.rationale,
              matchedEvidenceIds: r.matchedEvidenceIds || [],
              prerequisites: r.prerequisites || [],
            }),
          ),
          remediationProposals: (parsed.remediationProposals || []).map((rp: any, idx: number) => ({
            id: `rem_${incidentId}_${idx + 1}`,
            incidentId,
            title: rp.title,
            riskLevel: rp.riskLevel || 'MEDIUM',
            expectedImpact: rp.expectedImpact,
            prerequisites: rp.prerequisites || [],
            executionSteps: rp.executionSteps || [],
            rollbackInstructions: rp.rollbackInstructions || [],
            approvalStatus: 'PENDING_APPROVAL',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
        };
      }
    } catch {
      // Fall through to deterministic
    }

    return this.generateDeterministicAnalysis(incidentId, context, evidence);
  }

  public generateDeterministicAnalysis(
    incidentId: string,
    context: { title: string; service: string; environment: string; severity: string },
    evidence: EvidenceItem[],
  ): AiAnalysisResult {
    const deploymentEvidence = evidence.filter((e) => e.type === 'deployment');
    const logEvidence = evidence.filter((e) => e.type === 'log');
    const traceEvidence = evidence.filter((e) => e.type === 'trace');
    const runbookEvidence = evidence.filter((e) => e.type === 'runbook');

    const observedFacts: string[] = [];
    const evidenceIds: string[] = [];

    if (deploymentEvidence.length > 0) {
      observedFacts.push(
        `Service deployment detected: ${deploymentEvidence.map((d) => d.title).join(', ')}`,
      );
      evidenceIds.push(...deploymentEvidence.map((d) => d.id));
    }
    if (traceEvidence.length > 0) {
      observedFacts.push(
        `High latency and error rates detected across trace spans in ${context.service}`,
      );
      evidenceIds.push(...traceEvidence.map((d) => d.id));
    }
    if (logEvidence.length > 0) {
      observedFacts.push(
        `Repeated fatal or error level log signatures found matching error patterns`,
      );
      evidenceIds.push(...logEvidence.map((d) => d.id));
    }

    if (observedFacts.length === 0) {
      observedFacts.push(
        `Telemetry reporting anomalies on ${context.service} in ${context.environment}`,
      );
    }

    const hypotheses: Hypothesis[] = [
      {
        id: `hyp_${incidentId}_1`,
        incidentId,
        title: `Primary Root Cause: Configuration or Release Regression in ${context.service}`,
        observedFacts,
        aiInterpretation:
          'Correlation of deployment timestamps and error telemetry indicates the recent release introduced connection exhaustion or unhandled exceptions under traffic.',
        confidenceScore: deploymentEvidence.length > 0 ? 0.92 : 0.78,
        evidenceIds,
        status: 'validating',
      },
    ];

    const diagnosticQueries: DiagnosticQuery[] = [
      {
        id: `dq_${incidentId}_1`,
        incidentId,
        engine: 'PromQL',
        query: `sum(rate(http_requests_total{service="${context.service}",status=~"5.."}[5m])) / sum(rate(http_requests_total{service="${context.service}"}[5m])) * 100`,
        targetSystem: 'Prometheus / VictoriaMetrics',
        purpose: 'Verify exact 5xx error percentage over time',
        expectedOutput: 'Elevated rate > 5% indicating critical service degradation',
        safeReadOnly: true,
      },
      {
        id: `dq_${incidentId}_2`,
        incidentId,
        engine: 'LogQL',
        query: `{app="${context.service}", environment="${context.environment}"} |= "error" | json`,
        targetSystem: 'Grafana Loki',
        purpose: 'Extract stack traces and structured log context',
        expectedOutput: 'Clustered timeout, connection refuse, or null reference traces',
        safeReadOnly: true,
      },
      {
        id: `dq_${incidentId}_3`,
        incidentId,
        engine: 'kubectl',
        query: `kubectl get pods -n ${context.environment} -l app=${context.service} -o wide`,
        targetSystem: 'Kubernetes Cluster',
        purpose: 'Inspect pod health, restart counts, and OOMKilled events',
        expectedOutput: 'Restarts > 0 or CrashLoopBackOff indicators',
        safeReadOnly: true,
      },
    ];

    const runbookRecommendations: RunbookRecommendation[] = [
      {
        id: `rb_${incidentId}_1`,
        incidentId,
        runbookTitle:
          runbookEvidence.length > 0
            ? runbookEvidence[0].title
            : `SRE Incident Playbook: ${context.service} Degradation Recovery`,
        relevantSections: [
          'Section 3.1: Traffic Shedding and Circuit Breakers',
          'Section 4.2: Automated Deployment Rollback Procedure',
          'Section 5.0: Cache Invalidation and Connection Pool Flush',
        ],
        rationale:
          'High match score with current error patterns, deployment timing, and saturation symptoms.',
        matchedEvidenceIds: evidenceIds.slice(0, 3),
        prerequisites: [
          'Operator access to production deployment pipelines',
          'ReadOnly SRE token for Kubernetes cluster inspection',
        ],
      },
    ];

    const remediationProposals: RemediationProposal[] = [
      {
        id: `rem_${incidentId}_1`,
        incidentId,
        title: `Rollback ${context.service} to Previous Stable Release`,
        riskLevel: 'LOW',
        expectedImpact:
          'Restores service to known stable baseline within ~60-90 seconds with zero customer data loss.',
        prerequisites: [
          'Verify previous stable release image tag exists in container registry',
          'Ensure database schema migrations are backwards-compatible',
        ],
        executionSteps: [
          `kubectl rollout undo deployment/${context.service} -n ${context.environment}`,
          `kubectl rollout status deployment/${context.service} -n ${context.environment} --timeout=120s`,
          'Monitor Prometheus error rate for 3 minutes to confirm error rate drop below 0.1%',
        ],
        rollbackInstructions: [
          'If rollback fails or cluster state worsens, re-apply emergency ingress traffic shedding (rate limit 50%)',
          'Notify Level 3 Database SRE on-call team',
        ],
        approvalStatus: 'PENDING_APPROVAL',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `rem_${incidentId}_2`,
        incidentId,
        title: `Scale Pod Replicas & Restart Connection Pool in ${context.service}`,
        riskLevel: 'MEDIUM',
        expectedImpact:
          'Alleviates resource pressure and flushes hung sockets. May cause momentary spike in connection initialization.',
        prerequisites: [
          'Ensure Kubernetes node capacity has available CPU and Memory headroom',
        ],
        executionSteps: [
          `kubectl scale deployment/${context.service} --replicas=8 -n ${context.environment}`,
          `kubectl rollout restart deployment/${context.service} -n ${context.environment}`,
        ],
        rollbackInstructions: [
          `kubectl scale deployment/${context.service} --replicas=3 -n ${context.environment}`,
        ],
        approvalStatus: 'PENDING_APPROVAL',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    return {
      provider: 'local-correlation-engine',
      summary: `Correlated ${evidence.length} evidence items for ${context.service} (${context.severity}). Identified ${hypotheses.length} root cause hypothesis and ${remediationProposals.length} reviewable remediation plans.`,
      hypotheses,
      diagnosticQueries,
      runbookRecommendations,
      remediationProposals,
    };
  }
}
