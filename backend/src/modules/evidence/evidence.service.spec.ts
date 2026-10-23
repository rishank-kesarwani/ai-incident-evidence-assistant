import { NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EvidenceService } from './evidence.service';

describe('EvidenceService', () => {
  let service: EvidenceService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    dbService = new DatabaseService();
    service = new EvidenceService(dbService);

    await dbService.createIncident({
      id: 'inc_test_1',
      title: 'Auth Service 500 Spike',
      summary: 'Authentication microservice returning 500 Internal Server Error',
      severity: 'P1',
      status: 'investigating',
      service: 'auth-service',
      environment: 'production',
      startedAt: new Date().toISOString(),
      isDemo: false,
      evidenceCount: 0,
      timelineCount: 0,
      proposalsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('should sanitize credentials when ingesting logs and correlate to timeline', async () => {
    const item = await service.ingestLog('inc_test_1', {
      source: 'auth-gateway',
      level: 'ERROR',
      message:
        'DB Connection failed: postgres://app_user:LeakedSecretPass123!@10.0.1.4:5432/auth_db with token Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig123',
    });

    expect(item.id).toMatch(/^ev_log_/);
    expect(item.sanitizedPayload.message).not.toContain('LeakedSecretPass123!');
    expect(item.sanitizedPayload.message).toContain('[REDACTED_USER]:[REDACTED_PASS]');
    expect(item.sanitizedPayload.message).toContain('[REDACTED_JWT_TOKEN]');
    expect(item.redactionSummary.tokensRedacted).toBeGreaterThan(0);

    // Verify timeline correlation
    const timeline = await dbService.findTimelineByIncident('inc_test_1');
    expect(timeline.length).toBe(1);
    expect(timeline[0].category).toBe('error_spike');
    expect(timeline[0].evidenceIds).toContain(item.id);
  });

  it('should ingest distributed trace summaries and link to timeline', async () => {
    const trace = await service.ingestTrace('inc_test_1', {
      traceId: 'tr_12345678',
      rootSpan: 'POST /oauth/token',
      latencyMs: 3400,
      httpStatus: 500,
      errorSpan: 'redis.get_session',
    });

    expect(trace.id).toMatch(/^ev_tr_/);
    expect(trace.sanitizedPayload.latencyMs).toBe(3400);

    const timeline = await dbService.findTimelineByIncident('inc_test_1');
    expect(timeline.some((t) => t.category === 'latency_anomaly')).toBe(true);
  });

  it('should throw NotFoundException if incident does not exist', async () => {
    await expect(
      service.ingestLog('inc_non_existent', {
        source: 'pod',
        level: 'INFO',
        message: 'hello',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
