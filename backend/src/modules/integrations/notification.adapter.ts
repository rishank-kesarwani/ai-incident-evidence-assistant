import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface DispatchAlertOptions {
  incidentId: string;
  title: string;
  severity: string;
  service: string;
  status: string;
  details: string;
  recipientEmail?: string;
}

@Injectable()
export class NotificationAdapter {
  private readonly logger = new Logger(NotificationAdapter.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly defaultRecipient: string;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('notificationService.url') || '';
    this.apiKey = this.configService.get<string>('notificationService.apiKey') || '';
    this.defaultRecipient =
      this.configService.get<string>('notificationService.defaultRecipient') ||
      'sre-oncall@incident-assistant.internal';
    this.isConfigured = !!(this.apiUrl && this.apiKey);

    if (this.isConfigured) {
      this.logger.log(`NotificationAdapter: Configured with Notification Service at ${this.apiUrl}`);
    } else {
      this.logger.log(
        'NotificationAdapter: NOTIFICATION_SERVICE_API_KEY not configured. Operating in simulated alert notification mode.',
      );
    }
  }

  async sendIncidentAlert(options: DispatchAlertOptions): Promise<{
    dispatched: boolean;
    provider: 'notification-service' | 'simulated-logger';
    messageId?: string;
  }> {
    const recipient = options.recipientEmail || this.defaultRecipient;
    const subject = `[${options.severity} ALERT] ${options.service}: ${options.title}`;
    const text = `Incident Alert: ${options.title}\nSeverity: ${options.severity}\nService: ${options.service}\nStatus: ${options.status}\nDetails: ${options.details}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 8px;">
        <h2 style="color: #ef4444; margin-top: 0;">[${options.severity} INCIDENT ALERT]</h2>
        <p><strong>Service:</strong> ${options.service}</p>
        <p><strong>Title:</strong> ${options.title}</p>
        <p><strong>Status:</strong> ${options.status}</p>
        <div style="background-color: #1e293b; padding: 15px; border-radius: 6px; border-left: 4px solid #ef4444; margin: 15px 0;">
          <p style="margin: 0;">${options.details}</p>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">Dispatched via AI Incident Evidence & Runbook Assistant</p>
      </div>
    `;

    if (this.isConfigured) {
      try {
        const endpoint = `${this.apiUrl.replace(/\/$/, '')}/v1/notifications`;
        const response = await axios.post(
          endpoint,
          {
            channels: ['EMAIL'],
            priority: options.severity === 'P1' || options.severity === 'P2' ? 'CRITICAL' : 'BULK',
            recipient: {
              userId: 'sre-oncall-operator',
              email: recipient,
            },
            email: {
              subject,
              text,
              html,
            },
            metadata: {
              incidentId: options.incidentId,
              service: options.service,
              severity: options.severity,
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': this.apiKey,
            },
            timeout: 5000,
          },
        );

        this.logger.log(
          `Notification dispatched successfully to ${recipient} (status: ${response.status})`,
        );
        return {
          dispatched: true,
          provider: 'notification-service',
          messageId: response.data?.id || 'delivered',
        };
      } catch (err: any) {
        this.logger.warn(
          `Failed to dispatch alert via Notification Service (${err.message}). Falling back to internal logger.`,
        );
      }
    }

    // Simulated logger fallback
    this.logger.log(
      `[SIMULATED SRE ALERT] To: ${recipient} | Subject: ${subject} | Details: ${options.details.slice(0, 80)}...`,
    );

    return {
      dispatched: true,
      provider: 'simulated-logger',
      messageId: `sim_${Date.now()}`,
    };
  }
}
