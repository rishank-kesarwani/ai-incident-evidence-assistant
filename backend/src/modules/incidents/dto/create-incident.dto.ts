import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Environment, IncidentSeverity, IncidentStatus } from '../../../common/types';

export class CreateIncidentDto {
  @ApiProperty({ example: 'Payment Service Latency Spike & Gateway Timeouts' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example:
      'Elevated 504 errors observed on checkout routes following release v2.4.1.',
  })
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiProperty({ enum: ['P1', 'P2', 'P3', 'P4'], example: 'P1' })
  @IsEnum(['P1', 'P2', 'P3', 'P4'])
  severity: IncidentSeverity;

  @ApiProperty({
    enum: ['investigating', 'identified', 'monitoring', 'resolved'],
    example: 'investigating',
    default: 'investigating',
  })
  @IsEnum(['investigating', 'identified', 'monitoring', 'resolved'])
  @IsOptional()
  status?: IncidentStatus = 'investigating';

  @ApiProperty({ example: 'payment-service' })
  @IsString()
  @IsNotEmpty()
  service: string;

  @ApiProperty({
    enum: ['production', 'staging', 'canary', 'development'],
    example: 'production',
  })
  @IsEnum(['production', 'staging', 'canary', 'development'])
  environment: Environment;

  @ApiPropertyOptional({ example: '2026-10-22T14:30:00.000Z' })
  @IsString()
  @IsOptional()
  startedAt?: string;

  @ApiPropertyOptional({ example: 'Initial triage notes by SRE on-call' })
  @IsString()
  @IsOptional()
  operatorNotes?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  isDemo?: boolean;
}

export class UpdateIncidentDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiPropertyOptional({ enum: ['P1', 'P2', 'P3', 'P4'] })
  @IsEnum(['P1', 'P2', 'P3', 'P4'])
  @IsOptional()
  severity?: IncidentSeverity;

  @ApiPropertyOptional({
    enum: ['investigating', 'identified', 'monitoring', 'resolved'],
  })
  @IsEnum(['investigating', 'identified', 'monitoring', 'resolved'])
  @IsOptional()
  status?: IncidentStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  service?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  resolvedAt?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  operatorNotes?: string;
}
