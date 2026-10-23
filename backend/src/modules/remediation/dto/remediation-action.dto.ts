import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RemediationRiskLevel } from '../../../common/types';

export class CreateRemediationDto {
  @ApiProperty({ example: 'Rollback Deployment to v2.4.0' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], example: 'LOW' })
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  riskLevel: RemediationRiskLevel;

  @ApiProperty({ example: 'Restores stable state within ~60 seconds' })
  @IsString()
  @IsNotEmpty()
  expectedImpact: string;

  @ApiProperty({ example: ['Previous image tag v2.4.0 available in ECR'] })
  @IsArray()
  prerequisites: string[];

  @ApiProperty({ example: ['kubectl rollout undo deployment/payment-service'] })
  @IsArray()
  executionSteps: string[];

  @ApiProperty({ example: ['Re-apply traffic rate limiting if 5xx persists'] })
  @IsArray()
  rollbackInstructions: string[];
}

export class ApproveRemediationDto {
  @ApiProperty({ example: 'Operator confirmation note: Rollback pre-requisites verified' })
  @IsString()
  @IsNotEmpty()
  operatorNotes: string;
}

export class RejectRemediationDto {
  @ApiProperty({ example: 'Rejected: DB schema changes prevent rolling back without manual migration' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
