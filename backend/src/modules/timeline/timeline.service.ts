import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TimelineEvent } from '../../common/types';
import { DatabaseService } from '../database/database.service';

export interface CreateTimelineEventDto {
  timestamp: string;
  title: string;
  description: string;
  category: 'deployment' | 'error_spike' | 'latency_anomaly' | 'operator_action' | 'runbook_match';
  severity: 'info' | 'warning' | 'critical';
  evidenceIds?: string[];
  confidence?: number;
}

@Injectable()
export class TimelineService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getTimeline(incidentId: string): Promise<TimelineEvent[]> {
    const inc = await this.databaseService.findIncidentById(incidentId);
    if (!inc) {
      throw new NotFoundException(`Incident "${incidentId}" not found.`);
    }
    return this.databaseService.findTimelineByIncident(incidentId);
  }

  async addEvent(
    incidentId: string,
    dto: CreateTimelineEventDto,
  ): Promise<TimelineEvent> {
    const inc = await this.databaseService.findIncidentById(incidentId);
    if (!inc) {
      throw new NotFoundException(`Incident "${incidentId}" not found.`);
    }

    const event: TimelineEvent = {
      id: `tl_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
      incidentId,
      timestamp: dto.timestamp || new Date().toISOString(),
      title: dto.title,
      description: dto.description,
      category: dto.category,
      severity: dto.severity,
      evidenceIds: dto.evidenceIds || [],
      confidence: dto.confidence ?? 0.95,
    };

    return this.databaseService.createTimelineEvent(event);
  }
}
