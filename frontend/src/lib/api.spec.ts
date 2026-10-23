const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

jest.mock('axios', () => {
  return {
    create: jest.fn(() => ({
      get: mockGet,
      post: mockPost,
      patch: mockPatch,
      delete: mockDelete,
      interceptors: {
        request: { use: jest.fn() },
      },
    })),
    get: jest.fn(),
    post: jest.fn(),
  };
});

import { api } from './api';

describe('Frontend API Client & Access States', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch incidents with filters', async () => {
    const mockIncidents = [
      {
        id: 'inc_1',
        title: 'Payment Gateway 504 Timeout',
        severity: 'P1',
        service: 'payment-service',
      },
    ];

    mockGet.mockResolvedValueOnce({ data: mockIncidents });

    const res = await api.getIncidents({ severity: 'P1' });
    expect(res).toEqual(mockIncidents);
    expect(mockGet).toHaveBeenCalledWith('/incidents', { params: { severity: 'P1' } });
  });

  it('should authenticate operator and store token', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        accessToken: 'jwt-operator-token-xyz',
        user: { username: 'lead-sre', role: 'OPERATOR' },
      },
    });

    const res = await api.login('lead-sre', 'secret123');
    expect(res.accessToken).toBe('jwt-operator-token-xyz');
    expect(res.user.role).toBe('OPERATOR');
  });

  it('should call approval endpoint for remediation proposal', async () => {
    const approvedResult = {
      id: 'rem_1',
      approvalStatus: 'APPROVED',
      approvedBy: 'lead-sre',
    };

    mockPost.mockResolvedValueOnce({ data: approvedResult });

    const res = await api.approveRemediation('rem_1', 'Confirmed safe rollback');
    expect(res.approvalStatus).toBe('APPROVED');
    expect(res.approvedBy).toBe('lead-sre');
    expect(mockPost).toHaveBeenCalledWith('/remediations/rem_1/approve', {
      operatorNotes: 'Confirmed safe rollback',
    });
  });
});
