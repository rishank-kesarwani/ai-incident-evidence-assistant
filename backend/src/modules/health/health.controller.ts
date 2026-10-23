import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsPublic } from '../../common/decorators';
import { DatabaseService } from '../database/database.service';
import { RedisAdapter } from '../integrations/redis.adapter';
import { ConfigService } from '@nestjs/config';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisAdapter: RedisAdapter,
    private readonly configService: ConfigService,
  ) {}

  @IsPublic()
  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Application liveness and readiness health check' })
  @ApiResponse({ status: 200, description: 'Application is healthy and serving traffic' })
  checkHealth() {
    const dbInfo = this.databaseService.getHealthInfo();
    const redisInfo = this.redisAdapter.getStatus();
    const aiConfigured = !!(
      this.configService.get<string>('aiPlatform.url') &&
      this.configService.get<string>('aiPlatform.apiKey')
    );
    const notificationConfigured = !!(
      this.configService.get<string>('notificationService.url') &&
      this.configService.get<string>('notificationService.apiKey')
    );

    return {
      status: 'UP',
      application: 'AI Incident Evidence & Runbook Assistant',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: '1.0.0',
      publicAccessEnabled: this.configService.get<boolean>('publicAccessEnabled'),
      services: {
        database: {
          status: 'UP',
          mode: dbInfo.persistenceMode,
          connected: dbInfo.connected,
          recordCounts: dbInfo.counts,
        },
        redis: {
          status: 'UP',
          mode: redisInfo.mode,
          connected: redisInfo.connected,
        },
        sharedAiPlatform: {
          status: aiConfigured ? 'CONFIGURED' : 'LOCAL_CORRELATION_ENGINE',
          provider: aiConfigured ? 'ai-platform' : 'deterministic-local-engine',
        },
        notificationService: {
          status: notificationConfigured ? 'CONFIGURED' : 'SIMULATED_LOGGER',
          provider: notificationConfigured ? 'notification-service' : 'local-logger',
        },
      },
    };
  }

  @IsPublic()
  @Get('health/ready')
  @HttpCode(HttpStatus.OK)
  readiness() {
    return { status: 'READY' };
  }

  @IsPublic()
  @Get('health/live')
  @HttpCode(HttpStatus.OK)
  liveness() {
    return { status: 'ALIVE' };
  }
}
