import { Injectable } from '@nestjs/common';
import { AuditRecord } from '../../common/types';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuditService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(incidentId?: string): Promise<AuditRecord[]> {
    return this.databaseService.findAudits(incidentId);
  }
}
