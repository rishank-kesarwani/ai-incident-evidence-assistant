import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';

@ApiTags('Audit Trail & Compliance')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List security and operational audit trail events' })
  @ApiQuery({ name: 'incidentId', required: false })
  async getAuditLogs(@Query('incidentId') incidentId?: string) {
    return this.auditService.findAll(incidentId);
  }
}
