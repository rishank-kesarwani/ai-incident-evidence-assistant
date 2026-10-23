import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TimelineDocument = TimelineEntity & Document;

@Schema({ timestamps: true, collection: 'timeline_events' })
export class TimelineEntity {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  incidentId: string;

  @Prop({ required: true, index: true })
  timestamp: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    required: true,
    enum: [
      'deployment',
      'error_spike',
      'latency_anomaly',
      'operator_action',
      'runbook_match',
    ],
  })
  category: string;

  @Prop({ required: true, enum: ['info', 'warning', 'critical'] })
  severity: string;

  @Prop({ type: [String], default: [] })
  evidenceIds: string[];

  @Prop({ required: true, default: 0.9 })
  confidence: number;
}

export const TimelineSchema = SchemaFactory.createForClass(TimelineEntity);
TimelineSchema.index({ incidentId: 1, timestamp: 1 });
