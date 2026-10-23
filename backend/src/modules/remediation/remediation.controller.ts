import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import {
  ApproveRemediationDto,
  CreateRemediationDto,
  RejectRemediationDto,
} from './dto/remediation-action.dto';
import { RemediationService } from './remediation.service';

@ApiTags('Remediation & Operator Approval Gates')
@Controller()
export class RemediationController {
  constructor(private readonly remediationService: RemediationService) {}

  @Get('incidents/:id/remediations')
  @ApiOperation({ summary: 'List all remediation proposals for an incident' })
  async listForIncident(@Param('id') incidentId: string) {
    return this.remediationService.findAllForIncident(incidentId);
  }

  @Post('incidents/:id/remediations')
  @ApiOperation({ summary: 'Create a custom remediation proposal' })
  async createProposal(
    @Param('id') incidentId: string,
    @Body() dto: CreateRemediationDto,
    @CurrentUser() user: any,
  ) {
    return this.remediationService.createProposal(incidentId, dto, user);
  }

  @Get('remediations/:id')
  @ApiOperation({ summary: 'Get details of a remediation proposal' })
  async getOne(@Param('id') id: string) {
    return this.remediationService.findOne(id);
  }

  @Post('remediations/:id/approve')
  @ApiOperation({ summary: 'Operator approval gate for a remediation plan' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveRemediationDto,
    @CurrentUser() user: any,
  ) {
    return this.remediationService.approveProposal(id, dto, user);
  }

  @Post('remediations/:id/reject')
  @ApiOperation({ summary: 'Operator rejection of a remediation plan' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectRemediationDto,
    @CurrentUser() user: any,
  ) {
    return this.remediationService.rejectProposal(id, dto, user);
  }

  @Post('remediations/:id/execute-simulation')
  @ApiOperation({
    summary:
      'Execute approved remediation plan in safe verified dry-run simulation mode',
  })
  async executeSimulation(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.remediationService.executeSimulation(id, user);
  }
}
