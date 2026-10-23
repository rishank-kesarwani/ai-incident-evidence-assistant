import axios from 'axios';
import {
  AiAnalysisResponse,
  AuditRecord,
  EvidenceItem,
  Incident,
  RemediationProposal,
  TimelineEvent,
} from './types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

if (apiClient?.interceptors?.request) {
  apiClient.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('sre_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });
}

export const api = {
  // Health & Status
  async getHealth() {
    const res = await axios.get(
      `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/health`,
    );
    return res.data;
  },

  async getAuthStatus() {
    const res = await apiClient.get('/auth/status');
    return res.data;
  },

  async login(username: string, password: string) {
    const res = await apiClient.post('/auth/login', { username, password });
    return res.data;
  },

  // Incidents
  async getIncidents(params?: {
    status?: string;
    severity?: string;
    service?: string;
    environment?: string;
    search?: string;
  }): Promise<Incident[]> {
    const res = await apiClient.get('/incidents', { params });
    return res.data;
  },

  async getIncident(id: string): Promise<Incident> {
    const res = await apiClient.get(`/incidents/${id}`);
    return res.data;
  },

  async createIncident(data: Partial<Incident>): Promise<Incident> {
    const res = await apiClient.post('/incidents', data);
    return res.data;
  },

  async updateIncident(id: string, data: Partial<Incident>): Promise<Incident> {
    const res = await apiClient.patch(`/incidents/${id}`, data);
    return res.data;
  },

  async deleteIncident(id: string): Promise<{ deleted: boolean }> {
    const res = await apiClient.delete(`/incidents/${id}`);
    return res.data;
  },

  // Evidence
  async getEvidence(incidentId: string): Promise<EvidenceItem[]> {
    const res = await apiClient.get(`/incidents/${incidentId}/evidence`);
    return res.data;
  },

  async ingestLog(
    incidentId: string,
    data: { source: string; level: string; message: string; metadata?: any },
  ): Promise<EvidenceItem> {
    const res = await apiClient.post(
      `/incidents/${incidentId}/evidence/log`,
      data,
    );
    return res.data;
  },

  async ingestTrace(
    incidentId: string,
    data: {
      traceId: string;
      rootSpan: string;
      latencyMs: number;
      httpStatus: number;
      errorSpan?: string;
      metadata?: any;
    },
  ): Promise<EvidenceItem> {
    const res = await apiClient.post(
      `/incidents/${incidentId}/evidence/trace`,
      data,
    );
    return res.data;
  },

  async ingestDeployment(
    incidentId: string,
    data: {
      deploymentId: string;
      version: string;
      service: string;
      author: string;
      changeSummary: string;
      commitHash: string;
    },
  ): Promise<EvidenceItem> {
    const res = await apiClient.post(
      `/incidents/${incidentId}/evidence/deployment`,
      data,
    );
    return res.data;
  },

  async ingestRunbook(
    incidentId: string,
    data: { title: string; service: string; content: string; owner?: string },
  ): Promise<EvidenceItem> {
    const res = await apiClient.post(
      `/incidents/${incidentId}/evidence/runbook`,
      data,
    );
    return res.data;
  },

  // Timeline
  async getTimeline(incidentId: string): Promise<TimelineEvent[]> {
    const res = await apiClient.get(`/incidents/${incidentId}/timeline`);
    return res.data;
  },

  // AI Analysis & Hypotheses
  async runAiAnalysis(incidentId: string): Promise<AiAnalysisResponse> {
    const res = await apiClient.post(`/incidents/${incidentId}/analyze`);
    return res.data;
  },

  // Remediation Proposals & Approval Gates
  async getRemediations(incidentId: string): Promise<RemediationProposal[]> {
    const res = await apiClient.get(`/incidents/${incidentId}/remediations`);
    return res.data;
  },

  async createRemediation(
    incidentId: string,
    data: Partial<RemediationProposal>,
  ): Promise<RemediationProposal> {
    const res = await apiClient.post(
      `/incidents/${incidentId}/remediations`,
      data,
    );
    return res.data;
  },

  async approveRemediation(
    remediationId: string,
    operatorNotes: string,
  ): Promise<RemediationProposal> {
    const res = await apiClient.post(`/remediations/${remediationId}/approve`, {
      operatorNotes,
    });
    return res.data;
  },

  async rejectRemediation(
    remediationId: string,
    reason: string,
  ): Promise<RemediationProposal> {
    const res = await apiClient.post(`/remediations/${remediationId}/reject`, {
      reason,
    });
    return res.data;
  },

  async executeSimulation(
    remediationId: string,
  ): Promise<RemediationProposal> {
    const res = await apiClient.post(
      `/remediations/${remediationId}/execute-simulation`,
    );
    return res.data;
  },

  // Audit Logs
  async getAuditLogs(incidentId?: string): Promise<AuditRecord[]> {
    const res = await apiClient.get('/audit', { params: { incidentId } });
    return res.data;
  },

  // Demo Seeding
  async seedDemoData(): Promise<{ seeded: boolean; incidentIds: string[] }> {
    const res = await apiClient.post('/demo/seed');
    return res.data;
  },
};
