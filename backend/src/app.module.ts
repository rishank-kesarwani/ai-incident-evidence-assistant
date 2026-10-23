import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { DatabaseModule } from './modules/database/database.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { AiAnalysisModule } from './modules/ai-analysis/ai-analysis.module';
import { RemediationModule } from './modules/remediation/remediation.module';
import { AuditModule } from './modules/audit/audit.module';
import { DemoModule } from './modules/demo/demo.module';
import { PublicAccessGuard } from './common/guards/public-access.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => [
        {
          ttl: 60000,
          limit: 120,
        },
      ],
    }),
    DatabaseModule.forRoot(),
    IntegrationsModule,
    AuthModule,
    HealthModule,
    IncidentsModule,
    EvidenceModule,
    TimelineModule,
    AiAnalysisModule,
    RemediationModule,
    AuditModule,
    DemoModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PublicAccessGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
