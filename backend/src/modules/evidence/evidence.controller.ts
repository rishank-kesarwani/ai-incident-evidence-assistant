import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IngestDeploymentDto,
  IngestLogDto,
  IngestRunbookDto,
  IngestTraceDto,
} from './dto/ingest-evidence.dto';
import { EvidenceService } from './evidence.service';

@ApiTags('Evidence Ingestion & Sanitization')
@Controller('incidents/:id/evidence')
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve all sanitized evidence items for an incident' })
  async getEvidence(@Param('id') incidentId: string) {
    return this.evidenceService.getEvidenceForIncident(incidentId);
  }

  @Post('log')
  @ApiOperation({ summary: 'Ingest and sanitize application / system log' })
  async ingestLog(
    @Param('id') incidentId: string,
    @Body() dto: IngestLogDto,
  ) {
    return this.evidenceService.ingestLog(incidentId, dto);
  }

  @Post('trace')
  @ApiOperation({ summary: 'Ingest and sanitize distributed trace summary' })
  async ingestTrace(
    @Param('id') incidentId: string,
    @Body() dto: IngestTraceDto,
  ) {
    return this.evidenceService.ingestTrace(incidentId, dto);
  }

  @Post('deployment')
  @ApiOperation({ summary: 'Ingest CI/CD release and deployment event' })
  async ingestDeployment(
    @Param('id') incidentId: string,
    @Body() dto: IngestDeploymentDto,
  ) {
    return this.evidenceService.ingestDeployment(incidentId, dto);
  }

  @Post('runbook')
  @ApiOperation({ summary: 'Ingest operator runbook documentation' })
  async ingestRunbook(
    @Param('id') incidentId: string,
    @Body() dto: IngestRunbookDto,
  ) {
    return this.evidenceService.ingestRunbook(incidentId, dto);
  }
}
