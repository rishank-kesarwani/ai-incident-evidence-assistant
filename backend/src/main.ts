import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 4000;
  const apiPrefix = configService.get<string>('apiPrefix') || 'api/v1';
  const corsOrigin = configService.get<string>('corsOrigin') || '*';
  const isPublicAccess = configService.get<boolean>('publicAccessEnabled');

  // Security headers & compression
  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Content-Type, Accept, Authorization, x-api-key, x-correlation-id, x-request-id',
  });

  // Global API prefix with health endpoint exclusion
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health', 'health/ready', 'health/live'],
  });

  // Strict validation pipe with auto-transform
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger OpenAPI documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Incident Evidence & Runbook Assistant API')
    .setDescription(
      'AI-assisted incident investigation platform correlating sanitized logs, traces, deployment events, and runbooks with approval-gated remediation.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'Service-to-service authentication key',
      },
      'x-api-key',
    )
    .addTag('Health', 'Readiness and liveness health checks')
    .addTag('Incidents', 'Incident management, lifecycle, and search')
    .addTag('Evidence Ingestion & Sanitization', 'Ingestion of logs, traces, deployments, and runbooks')
    .addTag('Timeline Correlation', 'Chronological correlation of incident events')
    .addTag('AI Analysis & Hypothesis Engine', 'Automated hypothesis and diagnostic query generation')
    .addTag('Remediation & Operator Approval Gates', 'Explicit operator approval and execution')
    .addTag('Audit Trail & Compliance', 'Security audit logs of approvals and mutations')
    .addTag('Demo & Synthetic Data', 'Realistic synthetic incidents for evaluation')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Listen on 0.0.0.0 and port supplied by PORT
  await app.listen(port, '0.0.0.0');

  logger.log(
    `AI Incident Evidence & Runbook Assistant backend listening on 0.0.0.0:${port} with prefix /${apiPrefix}`,
  );
  logger.log(`Public access mode (PUBLIC_ACCESS_ENABLE): ${isPublicAccess ? 'ENABLED' : 'DISABLED'}`);
  logger.log(`OpenAPI documentation available at http://localhost:${port}/docs`);
  logger.log(`Health check ready at http://localhost:${port}/health`);
}

bootstrap().catch((err) => {
  console.error(`Application startup failure: ${err.message}`, err.stack);
  process.exit(1);
});
