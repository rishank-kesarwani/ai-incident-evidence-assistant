import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api/v1';

  @IsString()
  @IsOptional()
  PUBLIC_ACCESS_ENABLE: string = 'false';

  @IsString()
  @IsOptional()
  PUBLIC_ACCESS_ENABLED: string;

  @IsString()
  @IsOptional()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  SERVICE_API_KEY: string;

  @IsString()
  @IsOptional()
  MONGODB_URI: string;

  @IsString()
  @IsOptional()
  REDIS_URL: string;

  @IsString()
  @IsOptional()
  AI_PLATFORM_URL: string;

  @IsString()
  @IsOptional()
  AI_PLATFORM_API_KEY: string;

  @IsString()
  @IsOptional()
  NOTIFICATION_SERVICE_URL: string;

  @IsString()
  @IsOptional()
  NOTIFICATION_SERVICE_API_KEY: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const redactedErrors = errors.map((err) => ({
      property: err.property,
      constraints: err.constraints,
    }));
    throw new Error(
      `Configuration validation error: ${JSON.stringify(redactedErrors)}`,
    );
  }

  return validatedConfig;
}
