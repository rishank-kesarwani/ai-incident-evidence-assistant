import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';
import { DatabaseService } from '../database/database.service';
import { RedisAdapter } from '../integrations/redis.adapter';

describe('HealthController', () => {
  let controller: HealthController;
  let mockDbService: Partial<DatabaseService>;
  let mockRedisAdapter: Partial<RedisAdapter>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockDbService = {
      getHealthInfo: jest.fn().mockReturnValue({
        connected: true,
        persistenceMode: 'IN_MEMORY',
        counts: { incidents: 0, evidence: 0, timelineEvents: 0, remediations: 0, audits: 0 },
      }),
    };

    mockRedisAdapter = {
      getStatus: jest.fn().mockReturnValue({
        connected: false,
        mode: 'SIMULATED_LOCAL',
      }),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'apiPrefix') return 'api/v1';
        if (key === 'publicAccessEnabled') return true;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: DatabaseService, useValue: mockDbService },
        { provide: RedisAdapter, useValue: mockRedisAdapter },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRoot', () => {
    it('should return service discovery information with status UP', () => {
      const res = controller.getRoot();
      expect(res).toBeDefined();
      expect(res.status).toBe('UP');
      expect(res.application).toContain('AI Incident Evidence & Runbook Assistant');
      expect(res.docs).toBe('/docs');
      expect(res.health).toBe('/health');
      expect(res.apiPrefix).toBe('/api/v1');
      expect(res.publicAccessEnabled).toBe(true);
    });
  });

  describe('headRoot', () => {
    it('should respond to HEAD requests without throwing', () => {
      expect(() => controller.headRoot()).not.toThrow();
    });
  });

  describe('checkHealth', () => {
    it('should return comprehensive service health info', () => {
      const health = controller.checkHealth();
      expect(health.status).toBe('UP');
      expect(health.services.database.status).toBe('UP');
      expect(health.services.redis.status).toBe('UP');
    });
  });

  describe('readiness & liveness', () => {
    it('should return READY and ALIVE statuses', () => {
      expect(controller.readiness()).toEqual({ status: 'READY' });
      expect(controller.liveness()).toEqual({ status: 'ALIVE' });
    });
  });
});
