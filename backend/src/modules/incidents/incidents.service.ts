import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Incident } from '../../common/types';
import { DatabaseService } from '../database/database.service';
import { NotificationAdapter } from '../integrations/notification.adapter';
import { CreateIncidentDto, UpdateIncidentDto } from './dto/create-incident.dto';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationAdapter: NotificationAdapter,
  ) {}

  async create(dto: CreateIncidentDto, user?: any): Promise<Incident> {
    const id = `inc_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
    const now = new Date().toISOString();

    const incident: Incident = {
      id,
      title: dto.title,
      summary: dto.summary,
      severity: dto.severity,
      status: dto.status || 'investigating',
      service: dto.service,
      environment: dto.environment,
      startedAt: dto.startedAt || now,
      isDemo: !!dto.isDemo,
      operatorNotes: dto.operatorNotes || '',
      evidenceCount: 0,
      timelineCount: 0,
      proposalsCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const created = await this.databaseService.createIncident(incident);

    // Record audit event
    await this.databaseService.createAudit({
      id: `aud_${uuidv4().slice(0, 8)}`,
      incidentId: id,
      action: 'INCIDENT_CREATED',
      performedBy: user?.username || 'operator',
      role: user?.role || 'OPERATOR',
      ipAddress: '127.0.0.1',
      timestamp: now,
      details: {
        severity: incident.severity,
        service: incident.service,
        title: incident.title,
      },
    });

    // If P1 or P2, dispatch alert notification
    if (incident.severity === 'P1' || incident.severity === 'P2') {
      this.notificationAdapter
        .sendIncidentAlert({
          incidentId: id,
          title: incident.title,
          severity: incident.severity,
          service: incident.service,
          status: incident.status,
          details: incident.summary,
        })
        .catch((err) => {
          this.logger.warn(`Failed to dispatch notification for incident ${id}: ${err.message}`);
        });
    }

    return created;
  }

  async findAll(filter?: {
    status?: string;
    severity?: string;
    service?: string;
    environment?: string;
    search?: string;
  }): Promise<Incident[]> {
    return this.databaseService.findIncidents(filter);
  }

  async findOne(id: string): Promise<Incident> {
    const incident = await this.databaseService.findIncidentById(id);
    if (!incident) {
      throw new NotFoundException(`Incident with ID "${id}" was not found.`);
    }
    return incident;
  }

  async update(id: string, dto: UpdateIncidentDto, user?: any): Promise<Incident> {
    const incident = await this.findOne(id);
    const updated = await this.databaseService.updateIncident(id, dto);

    await this.databaseService.createAudit({
      id: `aud_${uuidv4().slice(0, 8)}`,
      incidentId: id,
      action: 'INCIDENT_UPDATED',
      performedBy: user?.username || 'operator',
      role: user?.role || 'OPERATOR',
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: dto,
    });

    return updated || incident;
  }

  async delete(id: string, user?: any): Promise<{ deleted: boolean; id: string }> {
    await this.findOne(id);
    await this.databaseService.deleteIncident(id);

    await this.databaseService.createAudit({
      id: `aud_${uuidv4().slice(0, 8)}`,
      incidentId: id,
      action: 'INCIDENT_DELETED',
      performedBy: user?.username || 'operator',
      role: user?.role || 'OPERATOR',
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { deletedIncidentId: id },
    });

    return { deleted: true, id };
  }
}
