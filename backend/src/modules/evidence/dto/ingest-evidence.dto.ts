import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class IngestLogDto {
  @ApiProperty({ example: 'payment-service' })
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty({ example: 'ERROR' })
  @IsString()
  @IsNotEmpty()
  level: string;

  @ApiProperty({
    example:
      'ConnectionPoolTimeoutException: Timeout waiting for connection from pool after 5000ms. Host: db-primary.internal',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: '2026-10-22T14:32:10.000Z' })
  @IsString()
  @IsOptional()
  timestamp?: string;

  @ApiPropertyOptional({ example: { stackTrace: 'at Pool.acquire (pool.js:124)' } })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class IngestTraceDto {
  @ApiProperty({ example: 'tr_98af7bc39d0124' })
  @IsString()
  @IsNotEmpty()
  traceId: string;

  @ApiProperty({ example: 'POST /v1/checkout/process' })
  @IsString()
  @IsNotEmpty()
  rootSpan: string;

  @ApiProperty({ example: 4520 })
  @IsNumber()
  latencyMs: number;

  @ApiProperty({ example: 504 })
  @IsNumber()
  httpStatus: number;

  @ApiPropertyOptional({ example: 'database.query:acquireConnection' })
  @IsString()
  @IsOptional()
  errorSpan?: string;

  @ApiPropertyOptional({ example: '2026-10-22T14:33:00.000Z' })
  @IsString()
  @IsOptional()
  timestamp?: string;

  @ApiPropertyOptional({ example: { callerService: 'frontend-bff' } })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class IngestDeploymentDto {
  @ApiProperty({ example: 'dep_v2.4.1_prod' })
  @IsString()
  @IsNotEmpty()
  deploymentId: string;

  @ApiProperty({ example: 'v2.4.1' })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiProperty({ example: 'payment-service' })
  @IsString()
  @IsNotEmpty()
  service: string;

  @ApiProperty({ example: 'dev-ci@company.internal' })
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiProperty({
    example: 'Optimize SQL connection pooling and enable concurrent payment processor threads',
  })
  @IsString()
  @IsNotEmpty()
  changeSummary: string;

  @ApiProperty({ example: 'a9b2c3d4' })
  @IsString()
  @IsNotEmpty()
  commitHash: string;

  @ApiPropertyOptional({ example: '2026-10-22T14:26:00.000Z' })
  @IsString()
  @IsOptional()
  timestamp?: string;
}

export class IngestRunbookDto {
  @ApiProperty({ example: 'Payment Gateway Degradation & Connection Recovery' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'payment-service' })
  @IsString()
  @IsNotEmpty()
  service: string;

  @ApiProperty({
    example:
      '# Payment Service Runbook\n\n## Symptoms\n- Elevated 504 Gateway Timeouts\n- DB Connection pool exhaustion\n\n## Rollback Procedure\n1. Run `kubectl rollout undo deployment/payment-service -n production`\n2. Verify pool recovery.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: 'SRE Core Team' })
  @IsString()
  @IsOptional()
  owner?: string;
}
