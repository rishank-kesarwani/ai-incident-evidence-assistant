import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisAdapter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisAdapter.name);
  private client: Redis | null = null;
  private readonly memCache = new Map<string, { value: string; expiresAt: number }>();
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.url');
    if (redisUrl && redisUrl.trim()) {
      try {
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 3000,
          retryStrategy: (times) => (times > 3 ? null : Math.min(times * 1000, 3000)),
          lazyConnect: true,
        });

        this.client.on('connect', () => {
          this.isConnected = true;
          this.logger.log('RedisAdapter: Connected to external Redis instance.');
        });

        this.client.on('error', (err) => {
          this.isConnected = false;
          this.logger.warn(`Redis connection error: ${err.message}. Operating in memory cache mode.`);
        });

        this.client.connect().catch((err) => {
          this.logger.warn(`Initial Redis connection failed: ${err.message}. Using in-memory cache.`);
        });
      } catch (err: any) {
        this.logger.warn(`Failed to initialize Redis client: ${err.message}`);
      }
    } else {
      this.logger.log('RedisAdapter: No REDIS_URL provided. Operating in high-speed in-memory cache mode.');
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (this.isConnected && this.client) {
      try {
        const val = await this.client.get(key);
        return val ? JSON.parse(val) : null;
      } catch (err: any) {
        this.logger.warn(`Redis GET error (${key}): ${err.message}`);
      }
    }

    const item = this.memCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memCache.delete(key);
      return null;
    }
    return JSON.parse(item.value);
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    const serialized = JSON.stringify(value);
    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
        return;
      } catch (err: any) {
        this.logger.warn(`Redis SET error (${key}): ${err.message}`);
      }
    }

    this.memCache.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch {
        // fallback
      }
    }
    this.memCache.delete(key);
  }

  getStatus() {
    return {
      mode: this.isConnected ? 'external-redis' : 'in-memory-cache',
      connected: this.isConnected,
    };
  }
}
