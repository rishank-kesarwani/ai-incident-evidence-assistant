import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { EvidenceType } from '../../../common/types';

export type EvidenceDocument = EvidenceEntity & Document;

@Schema({ timestamps: true, collection: 'evidence' })
export class EvidenceEntity {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  incidentId: string;

  @Prop({ required: true, enum: ['log', 'trace', 'deployment', 'runbook'] })
  type: EvidenceType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  source: string;

  @Prop({ required: true, index: true })
  timestamp: string;

  @Prop({ required: true })
  rawSnippetPreview: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  sanitizedPayload: Record<string, any>;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  redactionSummary: {
    tokensRedacted: number;
    patternsDetected: string[];
  };

  @Prop({ default: false })
  isDemo?: boolean;
}

export const EvidenceSchema = SchemaFactory.createForClass(EvidenceEntity);
EvidenceSchema.index({ incidentId: 1, type: 1, timestamp: -1 });
