import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { EvidenceSanitizer } from '../../common/sanitization/sanitizer.util';
import { EvidenceItem } from '../../common/types';
import { DatabaseService } from '../database/database.service';
import {
  IngestDeploymentDto,
  IngestLogDto,
  IngestRunbookDto,
  IngestTraceDto,
} from './dto/ingest-evidence.dto';

@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async ingestLog(incidentId: string, dto: IngestLogDto): Promise<EvidenceItem> {
    await this.verifyIncident(incidentId);

    const rawSnippet = `[${dto.level}] ${dto.source}: ${dto.message}`;
    const { sanitized, summary } = EvidenceSanitizer.sanitize({
      source: dto.source,
      level: dto.level,
      message: dto.message,
      metadata: dto.metadata || {},
    });

    const item: EvidenceItem = {
      id: `ev_log_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
      incidentId,
      type: 'log',
      title: `Log: [${dto.level}] ${dto.source}`,
      source: dto.source,
      timestamp: dto.timestamp || new Date().toISOString(),
      rawSnippetPreview: EvidenceSanitizer.sanitize(rawSnippet).sanitized,
      sanitizedPayload: sanitized,
      redactionSummary: summary,
      createdAt: new Date().toISOString(),
    };

    const saved = await this.databaseService.createEvidence(item);

    // Correlate into timeline
    await this.databaseService.createTimelineEvent({
      id: `tl_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
      incidentId,
      timestamp: item.timestamp,
      title: `Error Log Signature in ${dto.source}`,
      description: sanitized.message,
      category: 'error_spike',
      severity: dto.level === 'FATAL' || dto.level === 'ERROR' ? 'critical' : 'warning',
      evidenceIds: [item.id],
      confidence: 0.95,
    });

    return saved;
  }

  async ingestTrace(incidentId: string, dto: IngestTraceDto): Promise<EvidenceItem> {
    await this.verifyIncident(incidentId);

    const rawSnippet = `Trace ${dto.traceId}: ${dto.rootSpan} returned ${dto.httpStatus} (${dto.latencyMs}ms)`;
    const { sanitized, summary } = EvidenceSanitizer.sanitize({
      traceId: dto.traceId,
      rootSpan: dto.rootSpan,
      latencyMs: dto.latencyMs,
      httpStatus: dto.httpStatus,
      errorSpan: dto.errorSpan,
      metadata: dto.metadata || {},
    });

    const item: EvidenceItem = {
      id: `ev_tr_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
      incidentId,
      type: 'trace',
      title: `Trace: ${dto.rootSpan} (${dto.httpStatus})`,
      source: 'Distributed Tracing (OpenTelemetry)',
      timestamp: dto.timestamp || new Date().toISOString(),
      rawSnippetPreview: EvidenceSanitizer.sanitize(rawSnippet).sanitized,
      sanitizedPayload: sanitized,
      redactionSummary: summary,
      createdAt: new Date().toISOString(),
    };

    const saved = await this.databaseService.createEvidence(item);

    // Correlate into timeline
    await this.databaseService.createTimelineEvent({
      id: `tl_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
      incidentId,
      timestamp: item.timestamp,
      title: `Latency Anomaly / HTTP ${dto.httpStatus} on ${dto.rootSpan}`,
      description: `Span duration ${dto.latencyMs}ms exceeded threshold (Failed span: ${dto.errorSpan || 'root'})`,
      category: 'latency_anomaly',
      severity: dto.httpStatus >= 500 ? 'critical' : 'warning',
      evidenceIds: [item.id],
      confidence: 0.92,
    });

    return saved;
  }

  async ingestDeployment(
    incidentId: string,
    dto: IngestDeploymentDto,
  ): Promise<EvidenceItem> {
    await this.verifyIncident(incidentId);

    const rawSnippet = `Deployment of ${dto.service} (${dto.version}) by ${dto.author}: ${dto.changeSummary}`;
    const { sanitized, summary } = EvidenceSanitizer.sanitize({
      deploymentId: dto.deploymentId,
      version: dto.version,
      service: dto.service,
      author: dto.author,
      changeSummary: dto.changeSummary,
      commitHash: dto.commitHash,
    });

    const item: EvidenceItem = {
      id: `ev_dep_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
      incidentId,
      type: 'deployment',
      title: `Deployment: ${dto.service} ${dto.version}`,
      source: 'CI/CD Pipeline (GitHub Actions)',
      timestamp: dto.timestamp || new Date().toISOString(),
      rawSnippetPreview: EvidenceSanitizer.sanitize(rawSnippet).sanitized,
      sanitizedPayload: sanitized,
      redactionSummary: summary,
      createdAt: new Date().toISOString(),
    };

    const saved = await this.databaseService.createEvidence(item);

    // Correlate into timeline
    await this.databaseService.createTimelineEvent({
      id: `tl_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
      incidentId,
      timestamp: item.timestamp,
      title: `Deployment: ${dto.service} v${dto.version}`,
      description: `Release deployed by ${sanitized.author}. Change: ${sanitized.changeSummary}`,
      category: 'deployment',
      severity: 'info',
      evidenceIds: [item.id],
      confidence: 1.0,
    });

    return saved;
  }

  async ingestRunbook(incidentId: string, dto: IngestRunbookDto): Promise<EvidenceItem> {
    await this.verifyIncident(incidentId);

    const rawSnippet = `Runbook: ${dto.title} for ${dto.service}`;
    const { sanitized, summary } = EvidenceSanitizer.sanitize({
      title: dto.title,
      service: dto.service,
      content: dto.content,
      owner: dto.owner || 'SRE',
    });

    const item: EvidenceItem = {
      id: `ev_rb_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
      incidentId,
      type: 'runbook',
      title: `Runbook: ${dto.title}`,
      source: 'Runbook Repository',
      timestamp: new Date().toISOString(),
      rawSnippetPreview: rawSnippet,
      sanitizedPayload: sanitized,
      redactionSummary: summary,
      createdAt: new Date().toISOString(),
    };

    return this.databaseService.createEvidence(item);
  }

  async getEvidenceForIncident(incidentId: string): Promise<EvidenceItem[]> {
    await this.verifyIncident(incidentId);
    return this.databaseService.findEvidenceByIncident(incidentId);
  }

  private async verifyIncident(incidentId: string) {
    const inc = await this.databaseService.findIncidentById(incidentId);
    if (!inc) {
      throw new NotFoundException(`Incident "${incidentId}" not found.`);
    }
    return inc;
  }
}
