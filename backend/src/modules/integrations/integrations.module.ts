import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiPlatformAdapter } from './ai-platform.adapter';
import { NotificationAdapter } from './notification.adapter';
import { RedisAdapter } from './redis.adapter';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AiPlatformAdapter, NotificationAdapter, RedisAdapter],
  exports: [AiPlatformAdapter, NotificationAdapter, RedisAdapter],
})
export class IntegrationsModule {}
