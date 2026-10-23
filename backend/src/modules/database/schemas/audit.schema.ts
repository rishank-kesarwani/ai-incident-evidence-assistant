import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AuditDocument = AuditEntity & Document;

@Schema({ timestamps: true, collection: 'audit_records' })
export class AuditEntity {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  incidentId: string;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true, index: true })
  performedBy: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true, index: true })
  timestamp: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  details: Record<string, any>;
}

export const AuditSchema = SchemaFactory.createForClass(AuditEntity);
AuditSchema.index({ incidentId: 1, timestamp: -1 });
