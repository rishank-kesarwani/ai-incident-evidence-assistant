import { Module, DynamicModule, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from './database.service';
import { IncidentEntity, IncidentSchema } from './schemas/incident.schema';
import { EvidenceEntity, EvidenceSchema } from './schemas/evidence.schema';
import { TimelineEntity, TimelineSchema } from './schemas/timeline.schema';
import { RemediationEntity, RemediationSchema } from './schemas/remediation.schema';
import { AuditEntity, AuditSchema } from './schemas/audit.schema';

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    const mongoUri = process.env.MONGODB_URI;
    const hasMongo = typeof mongoUri === 'string' && mongoUri.trim().length > 0;

    const imports: any[] = [];

    if (hasMongo) {
      imports.push(
        MongooseModule.forRoot(mongoUri, {
          serverSelectionTimeoutMS: 3000,
          connectTimeoutMS: 3000,
        }),
        MongooseModule.forFeature([
          { name: IncidentEntity.name, schema: IncidentSchema },
          { name: EvidenceEntity.name, schema: EvidenceSchema },
          { name: TimelineEntity.name, schema: TimelineSchema },
          { name: RemediationEntity.name, schema: RemediationSchema },
          { name: AuditEntity.name, schema: AuditSchema },
        ]),
      );
    }

    return {
      module: DatabaseModule,
      imports,
      providers: [DatabaseService],
      exports: [DatabaseService],
    };
  }
}
