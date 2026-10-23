import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AiPlatformAdapter } from './ai-platform.adapter';
import { EvidenceItem } from '../../common/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AiPlatformAdapter', () => {
  let adapter: AiPlatformAdapter;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'aiPlatform.url') return 'https://ai-platform.onrender.com';
        if (key === 'aiPlatform.apiKey') return 'test-ai-key';
        return null;
      }),
    } as any;

    adapter = new AiPlatformAdapter(configService);
  });

  const sampleEvidence: EvidenceItem[] = [
    {
      id: 'ev_dep_1',
      incidentId: 'inc_1',
      type: 'deployment',
      title: 'Deployment: payment-service v2.4.1',
      source: 'GitHub Actions',
      timestamp: '2026-10-22T14:26:00.000Z',
      rawSnippetPreview: 'Deployment of v2.4.1',
      sanitizedPayload: { version: 'v2.4.1', service: 'payment-service' },
      redactionSummary: { tokensRedacted: 0, patternsDetected: [] },
      createdAt: '2026-10-22T14:26:00.000Z',
    },
    {
      id: 'ev_log_1',
      incidentId: 'inc_1',
      type: 'log',
      title: 'Log: [ERROR] payment-service',
      source: 'payment-service',
      timestamp: '2026-10-22T14:30:00.000Z',
      rawSnippetPreview: 'Connection pool timeout',
      sanitizedPayload: { message: 'Connection pool timeout after 5000ms' },
      redactionSummary: { tokensRedacted: 0, patternsDetected: [] },
      createdAt: '2026-10-22T14:30:00.000Z',
    },
  ];

  it('should call external AI Platform when configured and parse structured response', async () => {
    const aiAnswer = JSON.stringify({
      summary: 'Deployment correlation identified DB pool starvation.',
      hypotheses: [
        {
          title: 'Connection Pool Starvation in v2.4.1',
          observedFacts: ['Release v2.4.1 deployed 4 minutes prior'],
          aiInterpretation: 'Keep-alive configuration leak caused hung pool',
          confidenceScore: 0.94,
          evidenceIds: ['ev_dep_1', 'ev_log_1'],
        },
      ],
      diagnosticQueries: [
        {
          engine: 'PromQL',
          query: 'rate(http_requests_total[5m])',
          targetSystem: 'Prometheus',
          purpose: 'Measure throughput',
          expectedOutput: 'Drop in success',
        },
      ],
      remediationProposals: [
        {
          title: 'Rollback to v2.4.0',
          riskLevel: 'LOW',
          expectedImpact: 'Immediate recovery',
          prerequisites: ['Verify previous tag'],
          executionSteps: ['kubectl rollout undo'],
          rollbackInstructions: ['Scale replicas to 5'],
        },
      ],
    });

    mockedAxios.post.mockResolvedValueOnce({
      data: { answer: aiAnswer },
      status: 200,
    });

    const result = await adapter.analyzeIncident(
      'inc_1',
      {
        title: 'Payment 504 Spikes',
        service: 'payment-service',
        environment: 'production',
        severity: 'P1',
      },
      sampleEvidence,
    );

    expect(result.provider).toBe('ai-platform');
    expect(result.hypotheses.length).toBe(1);
    expect(result.hypotheses[0].observedFacts).toContain('Release v2.4.1 deployed 4 minutes prior');
    expect(result.remediationProposals[0].title).toBe('Rollback to v2.4.0');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://ai-platform.onrender.com/api/v1/ai/chat',
      expect.objectContaining({
        applicationId: 'ai-incident-evidence-assistant',
      }),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json', 'x-api-key': 'test-ai-key' },
      }),
    );
  });

  it('should cleanly fallback to high-fidelity local deterministic engine when AI platform call fails', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network timeout to AI Platform'));

    const result = await adapter.analyzeIncident(
      'inc_1',
      {
        title: 'Payment 504 Spikes',
        service: 'payment-service',
        environment: 'production',
        severity: 'P1',
      },
      sampleEvidence,
    );

    expect(result.provider).toBe('local-correlation-engine');
    expect(result.hypotheses.length).toBeGreaterThan(0);
    expect(result.diagnosticQueries.length).toBeGreaterThan(0);
    expect(result.remediationProposals.length).toBeGreaterThan(0);
    expect(result.remediationProposals[0].rollbackInstructions).toBeDefined();
  });
});
