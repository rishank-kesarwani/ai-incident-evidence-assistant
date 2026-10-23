import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AuditRecord,
  EvidenceItem,
  EvidenceType,
  Incident,
  RemediationProposal,
  TimelineEvent,
} from '../../common/types';
import { IncidentDocument, IncidentEntity } from './schemas/incident.schema';
import { EvidenceDocument, EvidenceEntity } from './schemas/evidence.schema';
import { TimelineDocument, TimelineEntity } from './schemas/timeline.schema';
import { RemediationDocument, RemediationEntity } from './schemas/remediation.schema';
import { AuditDocument, AuditEntity } from './schemas/audit.schema';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  // In-memory fallback stores
  private readonly memIncidents = new Map<string, Incident>();
  private readonly memEvidence = new Map<string, EvidenceItem>();
  private readonly memTimeline = new Map<string, TimelineEvent>();
  private readonly memRemediations = new Map<string, RemediationProposal>();
  private readonly memAudits: AuditRecord[] = [];

  private isMongoConnected = false;

  constructor(
    @Optional()
    @InjectModel(IncidentEntity.name)
    private readonly incidentModel?: Model<IncidentDocument>,
    @Optional()
    @InjectModel(EvidenceEntity.name)
    private readonly evidenceModel?: Model<EvidenceDocument>,
    @Optional()
    @InjectModel(TimelineEntity.name)
    private readonly timelineModel?: Model<TimelineDocument>,
    @Optional()
    @InjectModel(RemediationEntity.name)
    private readonly remediationModel?: Model<RemediationDocument>,
    @Optional()
    @InjectModel(AuditEntity.name)
    private readonly auditModel?: Model<AuditDocument>,
  ) {}

  onModuleInit() {
    if (this.incidentModel && this.incidentModel.db?.readyState === 1) {
      this.isMongoConnected = true;
      this.logger.log('DatabaseService: Successfully connected to MongoDB production database.');
    } else {
      this.isMongoConnected = false;
      this.logger.log(
        'DatabaseService: Operating in verified In-Memory persistence mode (MongoDB not configured or connecting). External DB can be attached via MONGODB_URI.',
      );
    }
  }

  // --- Incidents ---

  async findIncidents(filter?: {
    status?: string;
    severity?: string;
    service?: string;
    environment?: string;
    search?: string;
  }): Promise<Incident[]> {
    if (this.isMongoConnected && this.incidentModel) {
      const query: any = {};
      if (filter?.status) query.status = filter.status;
      if (filter?.severity) query.severity = filter.severity;
      if (filter?.service) query.service = filter.service;
      if (filter?.environment) query.environment = filter.environment;
      if (filter?.search) {
        query.$or = [
          { title: { $regex: filter.search, $options: 'i' } },
          { summary: { $regex: filter.search, $options: 'i' } },
          { service: { $regex: filter.search, $options: 'i' } },
        ];
      }
      const docs = await this.incidentModel.find(query).sort({ startedAt: -1 }).exec();
      return docs.map((d) => this.mapIncidentDoc(d));
    }

    let items = Array.from(this.memIncidents.values());
    if (filter?.status) items = items.filter((i) => i.status === filter.status);
    if (filter?.severity) items = items.filter((i) => i.severity === filter.severity);
    if (filter?.service) items = items.filter((i) => i.service === filter.service);
    if (filter?.environment) items = items.filter((i) => i.environment === filter.environment);
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.service.toLowerCase().includes(q),
      );
    }
    return items.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  async findIncidentById(id: string): Promise<Incident | null> {
    if (this.isMongoConnected && this.incidentModel) {
      const doc = await this.incidentModel.findOne({ id }).exec();
      return doc ? this.mapIncidentDoc(doc) : null;
    }
    return this.memIncidents.get(id) || null;
  }

  async createIncident(incident: Incident): Promise<Incident> {
    if (this.isMongoConnected && this.incidentModel) {
      await this.incidentModel.create(incident);
      return incident;
    }
    this.memIncidents.set(incident.id, incident);
    return incident;
  }

  async updateIncident(id: string, update: Partial<Incident>): Promise<Incident | null> {
    const updatedTimestamp = new Date().toISOString();
    if (this.isMongoConnected && this.incidentModel) {
      const doc = await this.incidentModel
        .findOneAndUpdate({ id }, { ...update, updatedAt: updatedTimestamp }, { new: true })
        .exec();
      return doc ? this.mapIncidentDoc(doc) : null;
    }
    const existing = this.memIncidents.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...update, updatedAt: updatedTimestamp };
    this.memIncidents.set(id, merged);
    return merged;
  }

  async deleteIncident(id: string): Promise<boolean> {
    if (this.isMongoConnected && this.incidentModel) {
      const res = await this.incidentModel.deleteOne({ id }).exec();
      await this.evidenceModel?.deleteMany({ incidentId: id }).exec();
      await this.timelineModel?.deleteMany({ incidentId: id }).exec();
      await this.remediationModel?.deleteMany({ incidentId: id }).exec();
      return res.deletedCount > 0;
    }
    const had = this.memIncidents.delete(id);
    for (const [k, v] of this.memEvidence.entries()) {
      if (v.incidentId === id) this.memEvidence.delete(k);
    }
    for (const [k, v] of this.memTimeline.entries()) {
      if (v.incidentId === id) this.memTimeline.delete(k);
    }
    for (const [k, v] of this.memRemediations.entries()) {
      if (v.incidentId === id) this.memRemediations.delete(k);
    }
    return had;
  }

  // --- Evidence ---

  async findEvidenceByIncident(incidentId: string, type?: EvidenceType): Promise<EvidenceItem[]> {
    if (this.isMongoConnected && this.evidenceModel) {
      const query: any = { incidentId };
      if (type) query.type = type;
      const docs = await this.evidenceModel.find(query).sort({ timestamp: 1 }).exec();
      return docs.map((d) => this.mapEvidenceDoc(d));
    }
    let items = Array.from(this.memEvidence.values()).filter((e) => e.incidentId === incidentId);
    if (type) items = items.filter((e) => e.type === type);
    return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async createEvidence(evidence: EvidenceItem): Promise<EvidenceItem> {
    if (this.isMongoConnected && this.evidenceModel) {
      await this.evidenceModel.create(evidence);
      await this.incidentModel?.updateOne({ id: evidence.incidentId }, { $inc: { evidenceCount: 1 } });
      return evidence;
    }
    this.memEvidence.set(evidence.id, evidence);
    const incident = this.memIncidents.get(evidence.incidentId);
    if (incident) {
      incident.evidenceCount = (incident.evidenceCount || 0) + 1;
    }
    return evidence;
  }

  // --- Timeline ---

  async findTimelineByIncident(incidentId: string): Promise<TimelineEvent[]> {
    if (this.isMongoConnected && this.timelineModel) {
      const docs = await this.timelineModel.find({ incidentId }).sort({ timestamp: 1 }).exec();
      return docs.map((d) => this.mapTimelineDoc(d));
    }
    return Array.from(this.memTimeline.values())
      .filter((t) => t.incidentId === incidentId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async createTimelineEvent(event: TimelineEvent): Promise<TimelineEvent> {
    if (this.isMongoConnected && this.timelineModel) {
      await this.timelineModel.create(event);
      await this.incidentModel?.updateOne({ id: event.incidentId }, { $inc: { timelineCount: 1 } });
      return event;
    }
    this.memTimeline.set(event.id, event);
    const incident = this.memIncidents.get(event.incidentId);
    if (incident) {
      incident.timelineCount = (incident.timelineCount || 0) + 1;
    }
    return event;
  }

  // --- Remediation Proposals ---

  async findRemediationsByIncident(incidentId: string): Promise<RemediationProposal[]> {
    if (this.isMongoConnected && this.remediationModel) {
      const docs = await this.remediationModel.find({ incidentId }).sort({ createdAt: -1 }).exec();
      return docs.map((d) => this.mapRemediationDoc(d));
    }
    return Array.from(this.memRemediations.values())
      .filter((r) => r.incidentId === incidentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findRemediationById(id: string): Promise<RemediationProposal | null> {
    if (this.isMongoConnected && this.remediationModel) {
      const doc = await this.remediationModel.findOne({ id }).exec();
      return doc ? this.mapRemediationDoc(doc) : null;
    }
    return this.memRemediations.get(id) || null;
  }

  async createRemediation(remediation: RemediationProposal): Promise<RemediationProposal> {
    if (this.isMongoConnected && this.remediationModel) {
      await this.remediationModel.create(remediation);
      await this.incidentModel?.updateOne(
        { id: remediation.incidentId },
        { $inc: { proposalsCount: 1 } },
      );
      return remediation;
    }
    this.memRemediations.set(remediation.id, remediation);
    const incident = this.memIncidents.get(remediation.incidentId);
    if (incident) {
      incident.proposalsCount = (incident.proposalsCount || 0) + 1;
    }
    return remediation;
  }

  async updateRemediation(
    id: string,
    update: Partial<RemediationProposal>,
  ): Promise<RemediationProposal | null> {
    const updatedTimestamp = new Date().toISOString();
    if (this.isMongoConnected && this.remediationModel) {
      const doc = await this.remediationModel
        .findOneAndUpdate({ id }, { ...update, updatedAt: updatedTimestamp }, { new: true })
        .exec();
      return doc ? this.mapRemediationDoc(doc) : null;
    }
    const existing = this.memRemediations.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...update, updatedAt: updatedTimestamp };
    this.memRemediations.set(id, merged);
    return merged;
  }

  // --- Audit ---

  async createAudit(audit: AuditRecord): Promise<AuditRecord> {
    if (this.isMongoConnected && this.auditModel) {
      await this.auditModel.create(audit);
      return audit;
    }
    this.memAudits.push(audit);
    return audit;
  }

  async findAudits(incidentId?: string): Promise<AuditRecord[]> {
    if (this.isMongoConnected && this.auditModel) {
      const query = incidentId ? { incidentId } : {};
      const docs = await this.auditModel.find(query).sort({ timestamp: -1 }).limit(100).exec();
      return docs.map((d) => ({
        id: d.id,
        incidentId: d.incidentId,
        action: d.action,
        performedBy: d.performedBy,
        role: d.role,
        ipAddress: d.ipAddress,
        timestamp: d.timestamp,
        details: d.details || {},
      }));
    }
    let records = [...this.memAudits];
    if (incidentId) {
      records = records.filter((a) => a.incidentId === incidentId);
    }
    return records.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  // --- Health status ---

  getHealthInfo() {
    return {
      persistenceMode: this.isMongoConnected ? 'mongodb' : 'in-memory',
      connected: this.isMongoConnected,
      counts: {
        incidents: this.memIncidents.size,
        evidenceItems: this.memEvidence.size,
        timelineEvents: this.memTimeline.size,
        remediations: this.memRemediations.size,
        auditLogs: this.memAudits.length,
      },
    };
  }

  // --- Internal mappers ---

  private mapIncidentDoc(d: IncidentDocument): Incident {
    return {
      id: d.id,
      title: d.title,
      summary: d.summary,
      severity: d.severity,
      status: d.status,
      service: d.service,
      environment: d.environment,
      startedAt: d.startedAt,
      resolvedAt: d.resolvedAt,
      isDemo: d.isDemo,
      operatorNotes: d.operatorNotes,
      evidenceCount: d.evidenceCount || 0,
      timelineCount: d.timelineCount || 0,
      proposalsCount: d.proposalsCount || 0,
      createdAt: (d as any).createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: (d as any).updatedAt?.toISOString?.() || new Date().toISOString(),
    };
  }

  private mapEvidenceDoc(d: EvidenceDocument): EvidenceItem {
    return {
      id: d.id,
      incidentId: d.incidentId,
      type: d.type,
      title: d.title,
      source: d.source,
      timestamp: d.timestamp,
      rawSnippetPreview: d.rawSnippetPreview,
      sanitizedPayload: d.sanitizedPayload,
      redactionSummary: d.redactionSummary,
      isDemo: d.isDemo,
      createdAt: (d as any).createdAt?.toISOString?.() || new Date().toISOString(),
    };
  }

  private mapTimelineDoc(d: TimelineDocument): TimelineEvent {
    return {
      id: d.id,
      incidentId: d.incidentId,
      timestamp: d.timestamp,
      title: d.title,
      description: d.description,
      category: d.category as any,
      severity: d.severity as any,
      evidenceIds: d.evidenceIds || [],
      confidence: d.confidence,
    };
  }

  private mapRemediationDoc(d: RemediationDocument): RemediationProposal {
    return {
      id: d.id,
      incidentId: d.incidentId,
      title: d.title,
      riskLevel: d.riskLevel,
      expectedImpact: d.expectedImpact,
      prerequisites: d.prerequisites || [],
      executionSteps: d.executionSteps || [],
      rollbackInstructions: d.rollbackInstructions || [],
      approvalStatus: d.approvalStatus,
      approvedBy: d.approvedBy,
      approvedAt: d.approvedAt,
      rejectionReason: d.rejectionReason,
      executionSimulatedResult: d.executionSimulatedResult,
      createdAt: (d as any).createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: (d as any).updatedAt?.toISOString?.() || new Date().toISOString(),
    };
  }
}
