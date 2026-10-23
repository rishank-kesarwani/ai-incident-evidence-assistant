import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PublicAccessGuard } from './public-access.guard';

describe('PublicAccessGuard', () => {
  let guard: PublicAccessGuard;
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<ConfigService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    configService = {
      get: jest.fn(),
    } as any;

    jwtService = {
      verify: jest.fn(),
    } as any;

    guard = new PublicAccessGuard(reflector, configService, jwtService);
  });

  const createMockContext = (headers: Record<string, string>, method = 'GET', url = '/api/v1/incidents') => {
    const request = {
      headers,
      method,
      url,
      path: url,
      user: undefined,
    };

    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if route has @IsPublic() decorator', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = createMockContext({});

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow valid service API key in x-api-key header', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    configService.get.mockImplementation((key: string) => {
      if (key === 'serviceApiKey') return 'secret-service-key-123';
      return false;
    });

    const ctx = createMockContext({ 'x-api-key': 'secret-service-key-123' });
    expect(guard.canActivate(ctx)).toBe(true);
    expect((ctx.switchToHttp().getRequest() as any).user.role).toBe('ADMIN');
  });

  it('should throw UnauthorizedException if service key is invalid', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    configService.get.mockReturnValue('secret-service-key-123');

    const ctx = createMockContext({ 'x-api-key': 'wrong-key' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should allow valid Bearer JWT token when public access is disabled', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    configService.get.mockImplementation((key: string) => {
      if (key === 'jwt.secret') return 'jwt-secret';
      if (key === 'publicAccessEnabled') return false;
      return null;
    });

    jwtService.verify.mockReturnValue({ username: 'operator', role: 'OPERATOR' });

    const ctx = createMockContext({ authorization: 'Bearer valid.jwt.token' });
    expect(guard.canActivate(ctx)).toBe(true);
    expect((ctx.switchToHttp().getRequest() as any).user.role).toBe('OPERATOR');
  });

  it('should reject unauthenticated request when PUBLIC_ACCESS_ENABLE=false', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    configService.get.mockImplementation((key: string) => {
      if (key === 'publicAccessEnabled') return false;
      return null;
    });

    const ctx = createMockContext({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should allow read-only GET request when PUBLIC_ACCESS_ENABLE=true', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    configService.get.mockImplementation((key: string) => {
      if (key === 'publicAccessEnabled') return true;
      return null;
    });

    const ctx = createMockContext({}, 'GET', '/api/v1/incidents');
    expect(guard.canActivate(ctx)).toBe(true);
    expect((ctx.switchToHttp().getRequest() as any).user.role).toBe('PUBLIC_VIEWER');
  });

  it('should block destructive operations (DELETE, remediation approval) when unauthenticated under PUBLIC_ACCESS_ENABLE=true', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    configService.get.mockImplementation((key: string) => {
      if (key === 'publicAccessEnabled') return true;
      return null;
    });

    // 1. Destructive DELETE
    const deleteCtx = createMockContext({}, 'DELETE', '/api/v1/incidents/inc_123');
    expect(() => guard.canActivate(deleteCtx)).toThrow(ForbiddenException);

    // 2. Remediation Approval
    const approveCtx = createMockContext({}, 'POST', '/api/v1/remediations/rem_123/approve');
    expect(() => guard.canActivate(approveCtx)).toThrow(ForbiddenException);
  });
});
