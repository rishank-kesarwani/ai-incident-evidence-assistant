import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { IncidentsModule } from '../incidents/incidents.module';
import { EvidenceModule } from '../evidence/evidence.module';
import { RemediationModule } from '../remediation/remediation.module';

@Module({
  imports: [IncidentsModule, EvidenceModule, RemediationModule],
  controllers: [DemoController],
  providers: [DemoService],
  exports: [DemoService],
})
export class DemoModule {}
