export default () => {
  const publicAccessRaw = (
    process.env.PUBLIC_ACCESS_ENABLE ||
    process.env.PUBLIC_ACCESS_ENABLED ||
    'false'
  ).toLowerCase().trim();

  const isPublicAccess = publicAccessRaw === 'true' || publicAccessRaw === '1';

  return {
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 4000,
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    publicAccessEnabled: isPublicAccess,
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-fallback-insecure-jwt-secret-do-not-use-in-production-min-32',
      expiresIn: '8h',
    },
    serviceApiKey: process.env.SERVICE_API_KEY || 'incident-dev-service-api-key',
    operatorPassword: process.env.OPERATOR_ADMIN_PASSWORD || 'operator123!',
    database: {
      mongodbUri: process.env.MONGODB_URI || '',
    },
    redis: {
      url: process.env.REDIS_URL || '',
    },
    aiPlatform: {
      url: process.env.AI_PLATFORM_URL || 'https://ai-platform.onrender.com',
      apiKey: process.env.AI_PLATFORM_API_KEY || '',
    },
    notificationService: {
      url: process.env.NOTIFICATION_SERVICE_URL || 'https://notification-service.onrender.com',
      apiKey: process.env.NOTIFICATION_SERVICE_API_KEY || '',
      defaultRecipient: process.env.ALERT_EMAIL_RECIPIENT || 'sre-oncall@incident-assistant.internal',
    },
  };
};
