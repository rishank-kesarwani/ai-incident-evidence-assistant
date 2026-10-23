import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AiPlatformAdapter, AiAnalysisResult } from '../integrations/ai-platform.adapter';
import { RedisAdapter } from '../integrations/redis.adapter';

@Injectable()
export class AiAnalysisService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly aiAdapter: AiPlatformAdapter,
    private readonly redisAdapter: RedisAdapter,
  ) {}

  async analyze(incidentId: string): Promise<AiAnalysisResult> {
    const incident = await this.databaseService.findIncidentById(incidentId);
    if (!incident) {
      throw new NotFoundException(`Incident "${incidentId}" not found.`);
    }

    // Check Redis cache first
    const cacheKey = `ai_analysis:${incidentId}:${incident.evidenceCount}`;
    const cached = await this.redisAdapter.get<AiAnalysisResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const evidence = await this.databaseService.findEvidenceByIncident(incidentId);

    const result = await this.aiAdapter.analyzeIncident(
      incidentId,
      {
        title: incident.title,
        service: incident.service,
        environment: incident.environment,
        severity: incident.severity,
      },
      evidence,
    );

    // Save newly generated remediation proposals to database so operator can review them
    for (const proposal of result.remediationProposals) {
      const existing = await this.databaseService.findRemediationById(proposal.id);
      if (!existing) {
        await this.databaseService.createRemediation(proposal);
      }
    }

    // Cache analysis in Redis for 120 seconds
    await this.redisAdapter.set(cacheKey, result, 120);

    return result;
  }
}
