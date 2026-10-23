import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EvidenceService } from '../evidence/evidence.service';
import { IncidentsService } from '../incidents/incidents.service';
import { RemediationService } from '../remediation/remediation.service';

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly incidentsService: IncidentsService,
    private readonly evidenceService: EvidenceService,
    private readonly remediationService: RemediationService,
  ) {}

  async seedDemoData(): Promise<{ seeded: boolean; incidentIds: string[] }> {
    this.logger.log('Seeding synthetic demo incidents...');

    // Scenario 1: P1 Payment Service Connection Pool Exhaustion after v2.4.1 deployment
    const inc1 = await this.incidentsService.create({
      title: '[SYNTHETIC] Payment Service 504 Gateway Timeouts following v2.4.1 Deployment',
      summary:
        'Checkout and payment processing endpoints experiencing 87% failure rate with HTTP 504 upstream timeout. Initiated 4 minutes after v2.4.1 deployment to production cluster.',
      severity: 'P1',
      status: 'investigating',
      service: 'payment-service',
      environment: 'production',
      startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      isDemo: true,
      operatorNotes:
        'SRE On-Call engaged. Customer checkouts impacted in US-East and EU-West regions. Database connections saturated at 100%.',
    });

    // Ingest Deployment Evidence
    await this.evidenceService.ingestDeployment(inc1.id, {
      deploymentId: 'dep_prod_payment_v2.4.1',
      version: 'v2.4.1',
      service: 'payment-service',
      author: 'release-bot@payments-corp.internal',
      changeSummary:
        'Migrated connection pool manager to aggressive keep-alive with maxConnections=200; token=ghp_9876543210abcdef0123456789abcdef0123',
      commitHash: '7f9a12c4',
      timestamp: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
    });

    // Ingest Log Evidence (with simulated sensitive tokens for redaction engine to catch!)
    await this.evidenceService.ingestLog(inc1.id, {
      source: 'payment-service-pod-7db49c-xf2k',
      level: 'ERROR',
      message:
        'ConnectionPoolTimeoutException: Timeout waiting for free connection from pool after 5000ms. DB_HOST=postgres://db_app:supersecretpass123!@10.244.3.15:5432/payments with auth Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID1URArdBETaxjlUKAutxQBQJYZuJflbWIZjA17jI',
      timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      metadata: {
        activeConnections: 200,
        idleConnections: 0,
        queuedRequests: 1420,
      },
    });

    // Ingest Trace Evidence
    await this.evidenceService.ingestTrace(inc1.id, {
      traceId: 'tr_8f9c210d54a',
      rootSpan: 'POST /api/v1/payments/charge',
      latencyMs: 5120,
      httpStatus: 504,
      errorSpan: 'pg.pool.acquireConnection',
      timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      metadata: {
        clientIp: '198.51.100.42',
        gateway: 'traefik-ingress-controller',
      },
    });

    // Ingest Runbook
    await this.evidenceService.ingestRunbook(inc1.id, {
      title: 'Payment Gateway Connection Pool & Latency Playbook',
      service: 'payment-service',
      owner: 'Payments Infrastructure SRE',
      content: `
# Payment Gateway Recovery Playbook

## 1. Quick Triage
- Check PostgreSQL active connections: \`SELECT count(*), state FROM pg_stat_activity GROUP BY state;\`
- If waiting count > 100, trigger emergency connection pool restart or deployment rollback.

## 2. Safe Rollback Procedure
1. Confirm previous image tag: \`payment-service:v2.4.0\`
2. Execute rollback: \`kubectl rollout undo deployment/payment-service -n production\`
3. Verify latency recovery within 45s.
      `,
    });

    // Create Remediation Proposals
    await this.remediationService.createProposal(inc1.id, {
      title: 'Rollback payment-service to v2.4.0',
      riskLevel: 'LOW',
      expectedImpact:
        'Restores stable connection pooling baseline and clears 504 gateway timeouts within 60s.',
      prerequisites: [
        'Confirm v2.4.0 container image is present in ECR',
        'Verify no destructive database migrations were applied in v2.4.1',
      ],
      executionSteps: [
        'kubectl rollout undo deployment/payment-service -n production',
        'kubectl rollout status deployment/payment-service -n production --timeout=90s',
        'Verify Prometheus HTTP 5xx error rate drops below 0.1%',
      ],
      rollbackInstructions: [
        'If rollback fails, scale replicas to 10 and temporarily throttle incoming non-critical traffic',
        'Engage Database Administrator on-call',
      ],
    });

    // Scenario 2: P2 Auth Service Redis Cache Connection Pool Starvation
    const inc2 = await this.incidentsService.create({
      title: '[SYNTHETIC] Auth Service Redis Cache Connection Starvation & Token Validation Latency',
      summary:
        'JWT validation latency increased from 4ms to 480ms due to Redis socket starvation. Intermittent 401s observed during user session refresh.',
      severity: 'P2',
      status: 'identified',
      service: 'auth-service',
      environment: 'production',
      startedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      isDemo: true,
      operatorNotes:
        'Redis master failover occurred at 13:45 UTC. Auth service pods did not gracefully reconnect to newly promoted replica.',
    });

    await this.evidenceService.ingestLog(inc2.id, {
      source: 'auth-service-pod-99c-341a',
      level: 'WARN',
      message:
        'RedisClusterException: Node 10.244.1.8:6379 marked down. Reconnecting client socket pool; client secret apiKey="ak_test_secret_9941a87b"',
      timestamp: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
    });

    await this.remediationService.createProposal(inc2.id, {
      title: 'Restart Auth Service Pods to Re-initialize Redis Connection Pool',
      riskLevel: 'LOW',
      expectedImpact:
        'Forces clean TCP socket establishment to current Redis primary node. Zero downtime rolling restart.',
      prerequisites: ['Ensure minimum 2 pods remain in Ready state during rollout'],
      executionSteps: [
        'kubectl rollout restart deployment/auth-service -n production',
        'kubectl rollout status deployment/auth-service -n production',
      ],
      rollbackInstructions: [
        'Bypass Redis session cache and fall back to local in-memory token verification mode',
      ],
    });

    return {
      seeded: true,
      incidentIds: [inc1.id, inc2.id],
    };
  }
}
