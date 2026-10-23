import { EvidenceSanitizer } from './sanitizer.util';

describe('EvidenceSanitizer', () => {
  it('should redact sensitive database connection strings', () => {
    const raw = 'Connected to postgres://sre_user:SecretPassword123!@db.internal:5432/production';
    const { sanitized, summary } = EvidenceSanitizer.sanitize(raw);

    expect(sanitized).not.toContain('SecretPassword123!');
    expect(sanitized).toContain('postgres://[REDACTED_USER]:[REDACTED_PASS]@db.internal:5432/production');
    expect(summary.tokensRedacted).toBeGreaterThan(0);
  });

  it('should redact JWT Bearer tokens and Authorization headers', () => {
    const raw =
      'Request failed with header: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature';
    const { sanitized, summary } = EvidenceSanitizer.sanitize(raw);

    expect(sanitized).not.toContain('doNotLeakThisSignature');
    expect(sanitized).toContain('[REDACTED_JWT_TOKEN]');
    expect(summary.patternsDetected).toEqual(
      expect.arrayContaining(['JWT_BEARER']),
    );
  });

  it('should redact GitHub Personal Access Tokens and AWS Keys', () => {
    const raw =
      'Deploy initiated by ghp_111122223333444455556666777788889999 with AWS_KEY=AKIAIOSFODNN7EXAMPLE';
    const { sanitized, summary } = EvidenceSanitizer.sanitize(raw);

    expect(sanitized).not.toContain('ghp_111122223333444455556666777788889999');
    expect(sanitized).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(sanitized).toContain('[REDACTED_GITHUB_TOKEN]');
    expect(sanitized).toContain('[REDACTED_AWS_KEY_ID]');
    expect(summary.tokensRedacted).toBe(2);
  });

  it('should deeply sanitize nested objects and arrays', () => {
    const payload = {
      user: {
        email: 'operator@corp.internal',
        credentials: {
          password: 'TopSecretPassword99!',
        },
      },
      traces: [
        'Called auth server with x-api-key: my-secret-api-key',
        'Payload contains card 4532015012345678',
      ],
    };

    const { sanitized, summary } = EvidenceSanitizer.sanitize(payload);

    expect(sanitized.user.email).toBe('[REDACTED_EMAIL]');
    expect(sanitized.user.credentials.password).toBe('[REDACTED_CREDENTIAL]');
    expect(sanitized.traces[0]).toContain('[REDACTED_AUTH_HEADER]');
    expect(sanitized.traces[1]).toContain('[REDACTED_PAYMENT_CARD]');
    expect(summary.tokensRedacted).toBeGreaterThanOrEqual(4);
  });
});
