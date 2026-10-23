import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface LoginDto {
  username: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const configuredPassword =
      this.configService.get<string>('operatorPassword') || 'operator123!';
    const username = (dto.username || 'operator').trim();

    if (dto.password !== configuredPassword) {
      throw new UnauthorizedException('Invalid operator credentials.');
    }

    const payload = {
      id: `usr_${username}`,
      username,
      name: `${username.toUpperCase()} (Incident Commander)`,
      role: 'OPERATOR',
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: payload,
      expiresIn: '8h',
      publicAccessEnabled: this.configService.get<boolean>('publicAccessEnabled'),
    };
  }

  getStatus() {
    return {
      publicAccessEnabled: this.configService.get<boolean>('publicAccessEnabled'),
      authenticationRequired: !this.configService.get<boolean>('publicAccessEnabled'),
      supportedMethods: ['Bearer JWT', 'x-api-key'],
      serverTime: new Date().toISOString(),
    };
  }
}
