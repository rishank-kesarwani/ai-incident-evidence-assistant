import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApprovalStatus, RemediationRiskLevel } from '../../../common/types';

export type RemediationDocument = RemediationEntity & Document;

@Schema({ timestamps: true, collection: 'remediations' })
export class RemediationEntity {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  incidentId: string;

  @Prop({ required: true })
  title: string;

  @Prop({
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  })
  riskLevel: RemediationRiskLevel;

  @Prop({ required: true })
  expectedImpact: string;

  @Prop({ type: [String], default: [] })
  prerequisites: string[];

  @Prop({ type: [String], default: [] })
  executionSteps: string[];

  @Prop({ type: [String], default: [] })
  rollbackInstructions: string[];

  @Prop({
    required: true,
    enum: [
      'PENDING_APPROVAL',
      'APPROVED',
      'REJECTED',
      'EXECUTED_SIMULATED',
    ],
    default: 'PENDING_APPROVAL',
    index: true,
  })
  approvalStatus: ApprovalStatus;

  @Prop()
  approvedBy?: string;

  @Prop()
  approvedAt?: string;

  @Prop()
  rejectionReason?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  executionSimulatedResult?: {
    executedAt: string;
    operator: string;
    stdout: string;
    success: boolean;
    auditVerificationHash: string;
  };
}

export const RemediationSchema = SchemaFactory.createForClass(RemediationEntity);
RemediationSchema.index({ incidentId: 1, approvalStatus: 1 });
