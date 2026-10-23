import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsPublic } from '../../common/decorators';
import { DemoService } from './demo.service';

@ApiTags('Demo & Synthetic Data')
@Controller('demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @IsPublic()
  @Post('seed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Seed realistic synthetic demo incidents with correlated logs, traces, deployments, and runbooks',
  })
  @ApiResponse({
    status: 200,
    description: 'Sample data seeded with clear [SYNTHETIC] markers',
  })
  async seedDemo() {
    return this.demoService.seedDemoData();
  }
}
