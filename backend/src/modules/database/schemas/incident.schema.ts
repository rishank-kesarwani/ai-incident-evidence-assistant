import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Environment, IncidentSeverity, IncidentStatus } from '../../../common/types';

export type IncidentDocument = IncidentEntity & Document;

@Schema({ timestamps: true, collection: 'incidents' })
export class IncidentEntity {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  title: string;

  @Prop({ required: true })
  summary: string;

  @Prop({ required: true, index: true, enum: ['P1', 'P2', 'P3', 'P4'] })
  severity: IncidentSeverity;

  @Prop({
    required: true,
    index: true,
    enum: ['investigating', 'identified', 'monitoring', 'resolved'],
  })
  status: IncidentStatus;

  @Prop({ required: true, index: true })
  service: string;

  @Prop({
    required: true,
    index: true,
    enum: ['production', 'staging', 'canary', 'development'],
  })
  environment: Environment;

  @Prop({ required: true })
  startedAt: string;

  @Prop()
  resolvedAt?: string;

  @Prop({ default: false, index: true })
  isDemo: boolean;

  @Prop()
  operatorNotes?: string;

  @Prop({ default: 0 })
  evidenceCount: number;

  @Prop({ default: 0 })
  timelineCount: number;

  @Prop({ default: 0 })
  proposalsCount: number;
}

export const IncidentSchema = SchemaFactory.createForClass(IncidentEntity);
IncidentSchema.index({ service: 1, environment: 1, severity: 1 });
IncidentSchema.index({ createdAt: -1 });
