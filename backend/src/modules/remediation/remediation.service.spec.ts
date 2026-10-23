import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RemediationService } from './remediation.service';

describe('RemediationService', () => {
  let service: RemediationService;
  let dbService: DatabaseService;

  beforeEach(() => {
    dbService = new DatabaseService();
    service = new RemediationService(dbService);
  });

  it('should create a remediation proposal in PENDING_APPROVAL state', async () => {
    await dbService.createIncident({
      id: 'inc_test_1',
      title: 'Payment Timeouts',
      summary: '504 Gateway errors',
      severity: 'P1',
      status: 'investigating',
      service: 'payment-service',
      environment: 'production',
      startedAt: new Date().toISOString(),
      isDemo: false,
      evidenceCount: 0,
      timelineCount: 0,
      proposalsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const proposal = await service.createProposal(
      'inc_test_1',
      {
        title: 'Rollback to v2.4.0',
        riskLevel: 'LOW',
        expectedImpact: 'Recovers within 60s',
        prerequisites: ['Verify v2.4.0 in registry'],
        executionSteps: ['kubectl rollout undo deployment/payment-service'],
        rollbackInstructions: ['Scale replicas to 10'],
      },
      { username: 'lead-sre', role: 'OPERATOR' },
    );

    expect(proposal.id).toBeDefined();
    expect(proposal.approvalStatus).toBe('PENDING_APPROVAL');
    expect(proposal.riskLevel).toBe('LOW');
  });

  it('should prevent unauthenticated public viewer from approving remediation', async () => {
    const proposal = await dbService.createRemediation({
      id: 'rem_1',
      incidentId: 'inc_test_1',
      title: 'Restart Pods',
      riskLevel: 'MEDIUM',
      expectedImpact: 'Flushes pools',
      prerequisites: [],
      executionSteps: ['kubectl rollout restart'],
      rollbackInstructions: [],
      approvalStatus: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await expect(
      service.approveProposal(
        'rem_1',
        { operatorNotes: 'Public approving' },
        { username: 'guest', role: 'PUBLIC_VIEWER' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow operator to approve remediation proposal', async () => {
    await dbService.createRemediation({
      id: 'rem_2',
      incidentId: 'inc_test_1',
      title: 'Restart Pods',
      riskLevel: 'MEDIUM',
      expectedImpact: 'Flushes pools',
      prerequisites: [],
      executionSteps: ['kubectl rollout restart'],
      rollbackInstructions: [],
      approvalStatus: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const approved = await service.approveProposal(
      'rem_2',
      { operatorNotes: 'Reviewed runbook and confirmed safe' },
      { username: 'sarah-sre', role: 'OPERATOR' },
    );

    expect(approved.approvalStatus).toBe('APPROVED');
    expect(approved.approvedBy).toBe('sarah-sre');
    expect(approved.approvedAt).toBeDefined();
  });

  it('should block execution simulation if proposal is not APPROVED first', async () => {
    await dbService.createRemediation({
      id: 'rem_3',
      incidentId: 'inc_test_1',
      title: 'Emergency traffic shedding',
      riskLevel: 'CRITICAL',
      expectedImpact: 'Drops 50% non-critical traffic',
      prerequisites: [],
      executionSteps: ['apply rate-limit'],
      rollbackInstructions: [],
      approvalStatus: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await expect(
      service.executeSimulation('rem_3', { username: 'sarah-sre', role: 'OPERATOR' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should execute simulated dry-run for approved proposal with verification hash', async () => {
    await dbService.createRemediation({
      id: 'rem_4',
      incidentId: 'inc_test_1',
      title: 'Scale Deployment Replicas',
      riskLevel: 'MEDIUM',
      expectedImpact: 'Provides headroom',
      prerequisites: ['Verify node capacity'],
      executionSteps: ['kubectl scale deployment/payment-service --replicas=8'],
      rollbackInstructions: ['kubectl scale deployment/payment-service --replicas=3'],
      approvalStatus: 'APPROVED',
      approvedBy: 'sarah-sre',
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const executed = await service.executeSimulation('rem_4', {
      username: 'sarah-sre',
      role: 'OPERATOR',
    });

    expect(executed.approvalStatus).toBe('EXECUTED_SIMULATED');
    expect(executed.executionSimulatedResult?.success).toBe(true);
    expect(executed.executionSimulatedResult?.stdout).toContain('[PRE-FLIGHT]');
    expect(executed.executionSimulatedResult?.auditVerificationHash).toMatch(/^sha256:/);
  });
});
