import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiAnalysisService } from './ai-analysis.service';

@ApiTags('AI Analysis & Hypothesis Engine')
@Controller('incidents/:id/analyze')
export class AiAnalysisController {
  constructor(private readonly aiAnalysisService: AiAnalysisService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Trigger AI evidence correlation, generate hypotheses, diagnostic queries, and remediation plans',
  })
  @ApiResponse({
    status: 200,
    description: 'Correlated hypotheses, diagnostic queries, and remediation proposals',
  })
  async analyze(@Param('id') incidentId: string) {
    return this.aiAnalysisService.analyze(incidentId);
  }
}
