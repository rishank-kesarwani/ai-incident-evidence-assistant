import { DatabaseService } from '../database/database.service';
import { IncidentsService } from './incidents.service';
import { NotificationAdapter } from '../integrations/notification.adapter';

describe('IncidentsService', () => {
  let service: IncidentsService;
  let dbService: DatabaseService;
  let notificationAdapter: jest.Mocked<NotificationAdapter>;

  beforeEach(() => {
    dbService = new DatabaseService();
    notificationAdapter = {
      sendIncidentAlert: jest.fn().mockResolvedValue({ dispatched: true, provider: 'simulated-logger' }),
    } as any;

    service = new IncidentsService(dbService, notificationAdapter);
  });

  it('should create an incident and dispatch notification if P1 or P2', async () => {
    const inc = await service.create(
      {
        title: 'Redis Cluster Split Brain',
        summary: 'Nodes unable to reach quorum',
        severity: 'P1',
        service: 'session-cache',
        environment: 'production',
      },
      { username: 'oncall-sre', role: 'OPERATOR' },
    );

    expect(inc.id).toMatch(/^inc_/);
    expect(inc.severity).toBe('P1');
    expect(notificationAdapter.sendIncidentAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'P1',
        service: 'session-cache',
      }),
    );
  });

  it('should filter incidents by status and severity', async () => {
    await service.create({
      title: 'Inc A',
      summary: 'Desc A',
      severity: 'P1',
      service: 'payment',
      environment: 'production',
    });
    await service.create({
      title: 'Inc B',
      summary: 'Desc B',
      severity: 'P3',
      service: 'web',
      environment: 'staging',
    });

    const p1s = await service.findAll({ severity: 'P1' });
    expect(p1s.length).toBe(1);
    expect(p1s[0].severity).toBe('P1');

    const staging = await service.findAll({ environment: 'staging' });
    expect(staging.length).toBe(1);
    expect(staging[0].service).toBe('web');
  });
});
