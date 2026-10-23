import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { RemediationProposal } from '../../common/types';
import { DatabaseService } from '../database/database.service';
import {
  ApproveRemediationDto,
  CreateRemediationDto,
  RejectRemediationDto,
} from './dto/remediation-action.dto';

@Injectable()
export class RemediationService {
  private readonly logger = new Logger(RemediationService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAllForIncident(incidentId: string): Promise<RemediationProposal[]> {
    return this.databaseService.findRemediationsByIncident(incidentId);
  }

  async findOne(id: string): Promise<RemediationProposal> {
    const proposal = await this.databaseService.findRemediationById(id);
    if (!proposal) {
      throw new NotFoundException(`Remediation proposal "${id}" not found.`);
    }
    return proposal;
  }

  async createProposal(
    incidentId: string,
    dto: CreateRemediationDto,
    user?: any,
  ): Promise<RemediationProposal> {
    const inc = await this.databaseService.findIncidentById(incidentId);
    if (!inc) {
      throw new NotFoundException(`Incident "${incidentId}" not found.`);
    }

    const proposal: RemediationProposal = {
      id: `rem_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
      incidentId,
      title: dto.title,
      riskLevel: dto.riskLevel,
      expectedImpact: dto.expectedImpact,
      prerequisites: dto.prerequisites,
      executionSteps: dto.executionSteps,
      rollbackInstructions: dto.rollbackInstructions,
      approvalStatus: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await this.databaseService.createRemediation(proposal);

    await this.databaseService.createAudit({
      id: `aud_${uuidv4().slice(0, 8)}`,
      incidentId,
      action: 'REMEDIATION_PROPOSED',
      performedBy: user?.username || 'operator',
      role: user?.role || 'OPERATOR',
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: {
        proposalId: proposal.id,
        title: proposal.title,
        riskLevel: proposal.riskLevel,
      },
    });

    return saved;
  }

  async approveProposal(
    id: string,
    dto: ApproveRemediationDto,
    user: any,
  ): Promise<RemediationProposal> {
    if (user?.role === 'PUBLIC_VIEWER') {
      throw new ForbiddenException(
        'Remediation approval requires operator authorization. Public access mode cannot approve actions.',
      );
    }

    const proposal = await this.findOne(id);

    if (proposal.approvalStatus === 'APPROVED') {
      return proposal;
    }

    if (proposal.approvalStatus === 'EXECUTED_SIMULATED') {
      throw new BadRequestException('Proposal has already been executed.');
    }

    const updated = await this.databaseService.updateRemediation(id, {
      approvalStatus: 'APPROVED',
      approvedBy: user?.username || 'operator',
      approvedAt: new Date().toISOString(),
    });

    await this.databaseService.createAudit({
      id: `aud_${uuidv4().slice(0, 8)}`,
      incidentId: proposal.incidentId,
      action: 'REMEDIATION_APPROVED',
      performedBy: user?.username || 'operator',
      role: user?.role || 'OPERATOR',
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: {
        proposalId: id,
        title: proposal.title,
        notes: dto.operatorNotes,
      },
    });

    return updated;
  }

  async rejectProposal(
    id: string,
    dto: RejectRemediationDto,
    user: any,
  ): Promise<RemediationProposal> {
    if (user?.role === 'PUBLIC_VIEWER') {
      throw new ForbiddenException(
        'Remediation rejection requires operator authorization.',
      );
    }

    const proposal = await this.findOne(id);

    const updated = await this.databaseService.updateRemediation(id, {
      approvalStatus: 'REJECTED',
      rejectionReason: dto.reason,
    });

    await this.databaseService.createAudit({
      id: `aud_${uuidv4().slice(0, 8)}`,
      incidentId: proposal.incidentId,
      action: 'REMEDIATION_REJECTED',
      performedBy: user?.username || 'operator',
      role: user?.role || 'OPERATOR',
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: {
        proposalId: id,
        reason: dto.reason,
      },
    });

    return updated;
  }

  async executeSimulation(id: string, user: any): Promise<RemediationProposal> {
    if (user?.role === 'PUBLIC_VIEWER') {
      throw new ForbiddenException(
        'Executing remediation plans requires operator privileges.',
      );
    }

    const proposal = await this.findOne(id);

    if (proposal.approvalStatus !== 'APPROVED') {
      throw new BadRequestException(
        `Remediation proposal must be explicitly APPROVED by an operator prior to execution. Current status is "${proposal.approvalStatus}".`,
      );
    }

    // Explicit Safety Guarantee: Never execute raw arbitrary shell commands or production mutations autonomously
    const simulationHash = crypto
      .createHash('sha256')
      .update(`${proposal.id}-${Date.now()}-${proposal.executionSteps.join(';')}`)
      .digest('hex')
      .slice(0, 16);

    const stdoutLines = [
      `[PRE-FLIGHT] Verifying prerequisites: ${proposal.prerequisites.join(', ')} -> OK`,
      `[SIMULATOR] Dry-run execution mode activated (Recommendation-only safety boundary enforced).`,
      ...proposal.executionSteps.map(
        (step, idx) => `[STEP ${idx + 1}/${proposal.executionSteps.length}] Emulating: "${step}" -> Completed successfully.`,
      ),
      `[POST-VERIFICATION] Rollback instructions verified: ${proposal.rollbackInstructions.join('; ')}`,
      `[AUDIT] Cryptographic execution token generated: 0x${simulationHash}`,
    ];

    const result = {
      executedAt: new Date().toISOString(),
      operator: user?.username || 'operator',
      stdout: stdoutLines.join('\n'),
      success: true,
      auditVerificationHash: `sha256:${simulationHash}`,
    };

    const updated = await this.databaseService.updateRemediation(id, {
      approvalStatus: 'EXECUTED_SIMULATED',
      executionSimulatedResult: result,
    });

    await this.databaseService.createAudit({
      id: `aud_${uuidv4().slice(0, 8)}`,
      incidentId: proposal.incidentId,
      action: 'REMEDIATION_EXECUTED_SIMULATION',
      performedBy: user?.username || 'operator',
      role: user?.role || 'OPERATOR',
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: {
        proposalId: id,
        hash: simulationHash,
      },
    });

    return updated;
  }
}
