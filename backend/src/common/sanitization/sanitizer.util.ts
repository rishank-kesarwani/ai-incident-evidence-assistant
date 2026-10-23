import { RedactionSummary } from '../types';

export class EvidenceSanitizer {
  private static readonly RULES: Array<{
    name: string;
    regex: RegExp;
    replacement: string | ((substring: string, ...args: any[]) => string);
  }> = [
    {
      name: 'PRIVATE_KEY',
      regex: /-----BEGIN\s+(?:[A-Z\s]+)?PRIVATE KEY-----[\s\S]*?-----END\s+(?:[A-Z\s]+)?PRIVATE KEY-----/gi,
      replacement: '[REDACTED_PRIVATE_KEY]',
    },
    {
      name: 'DATABASE_URL',
      // Matches proto://user:pass@host
      regex: /(mongodb(?:\+srv)?|postgres|postgresql|mysql|redis):\/\/([^:\s/]+):([^\s/]+)@/gi,
      replacement: '$1://[REDACTED_USER]:[REDACTED_PASS]@',
    },
    {
      name: 'AWS_ACCESS_KEY',
      regex: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g,
      replacement: '[REDACTED_AWS_KEY_ID]',
    },
    {
      name: 'GITHUB_TOKEN',
      regex: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}\b/g,
      replacement: '[REDACTED_GITHUB_TOKEN]',
    },
    {
      name: 'SLACK_TOKEN',
      regex: /\bxox[baprs]-[0-9a-zA-Z-]{10,72}\b/g,
      replacement: '[REDACTED_SLACK_TOKEN]',
    },
    {
      name: 'JWT_BEARER',
      regex: /(Bearer\s+)[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/gi,
      replacement: '$1[REDACTED_JWT_TOKEN]',
    },
    {
      name: 'GENERIC_JWT',
      regex: /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\b/g,
      replacement: '[REDACTED_JWT_TOKEN]',
    },
    {
      name: 'AUTHORIZATION_HEADER',
      regex: /(?:Authorization|x-api-key)\s*[:=]\s*["']?([^\s"',;]+)["']?/gi,
      replacement: (match, p1) => match.replace(p1, '[REDACTED_AUTH_HEADER]'),
    },
    {
      name: 'PASSWORD_FIELD',
      regex: /(["']?(?:password|passwd|secret|client_secret|apiKey|authToken|accessToken)["']?\s*[:=]\s*["'])([^"'\r\n\s,]+)(["']?)/gi,
      replacement: '$1[REDACTED_CREDENTIAL]$3',
    },
    {
      name: 'CREDIT_CARD',
      regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
      replacement: '[REDACTED_PAYMENT_CARD]',
    },
    {
      name: 'EMAIL_ADDRESS',
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      replacement: '[REDACTED_EMAIL]',
    },
    {
      name: 'PUBLIC_IP_ADDRESS',
      regex: /\b(?!127\.0\.0\.1|0\.0\.0\.0)(?:[1-9]\d{0,2})\.(?:\d{1,3})\.(?:\d{1,3})\.(?:\d{1,3})\b/g,
      replacement: '[REDACTED_IP]',
    },
  ];

  public static sanitize(input: any): {
    sanitized: any;
    summary: RedactionSummary;
  } {
    let tokensRedacted = 0;
    const detectedPatterns = new Set<string>();

    const sanitizeString = (text: string): string => {
      let result = text;
      for (const rule of EvidenceSanitizer.RULES) {
        const matches = result.match(rule.regex);
        if (matches && matches.length > 0) {
          detectedPatterns.add(rule.name);
          tokensRedacted += matches.length;
          result = result.replace(rule.regex, rule.replacement as any);
        }
      }
      return result;
    };

    const traverse = (val: any): any => {
      if (typeof val === 'string') {
        return sanitizeString(val);
      }
      if (Array.isArray(val)) {
        return val.map((item) => traverse(item));
      }
      if (val !== null && typeof val === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
          const lowerKey = k.toLowerCase();
          if (
            ['password', 'secret', 'token', 'authorization', 'api_key', 'apikey'].includes(
              lowerKey,
            ) &&
            typeof v === 'string'
          ) {
            tokensRedacted++;
            detectedPatterns.add('SECRET_KEY_NAME');
            out[k] = '[REDACTED_CREDENTIAL]';
          } else {
            out[k] = traverse(v);
          }
        }
        return out;
      }
      return val;
    };

    const sanitized = traverse(input);

    return {
      sanitized,
      summary: {
        tokensRedacted,
        patternsDetected: Array.from(detectedPatterns),
      },
    };
  }
}
