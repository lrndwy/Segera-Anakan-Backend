import { randomUUID } from 'crypto';

import { UserStatus } from '../../constants';
import type { DatabaseClient } from '../../db/client';
import type { UserRow } from '../../db/schema';
import { ForbiddenException, UnauthorizedException } from '../../lib/exceptions';
import { jwtService } from '../../lib/jwt.service';
import { passwordService } from '../../lib/password.service';
import type { AuditLogService } from '../../services/audit-log.service';
import { AuthRepository } from './auth.repository';
import { SessionRepository } from './session.repository';
import type {
  AuthMeta,
  CurrentUserResponse,
  LoginResponse,
  RefreshTokenResponse,
} from './auth.types';
import type { LoginInput, RefreshTokenInput } from './auth.schema';

const getRefreshTokenExpiry = (refreshToken: string): Date => {
  const decoded = jwtService.decodeToken(refreshToken);

  if (!decoded || !('exp' in decoded) || typeof decoded.exp !== 'number') {
    throw new UnauthorizedException();
  }

  return new Date(decoded.exp * 1000);
};

const toLoginUser = (user: UserRow) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  villageId: user.villageId,
});

const toCurrentUser = (user: UserRow): CurrentUserResponse => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  status: user.status,
  villageId: user.villageId,
});

export class AuthService {
  private readonly authRepository: AuthRepository;
  private readonly sessionRepository: SessionRepository;

  constructor(
    db: DatabaseClient,
    private readonly auditLogService: AuditLogService,
  ) {
    this.authRepository = new AuthRepository(db);
    this.sessionRepository = new SessionRepository(db);
  }

  private generateTokens(user: UserRow) {
    const accessToken = jwtService.generateAccessToken({
      sub: user.id,
      villageId: user.villageId,
      role: user.role,
    });

    const refreshToken = jwtService.generateRefreshToken({
      sub: user.id,
      tokenVersion: user.refreshTokenVersion,
    });

    return { accessToken, refreshToken };
  }

  async login(input: LoginInput, meta: AuthMeta): Promise<LoginResponse> {
    const user = await this.authRepository.findByEmail(input.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Account is inactive');
    }

    const passwordMatches = await passwordService.verifyPassword(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { accessToken, refreshToken } = this.generateTokens(user);
    const expiredAt = getRefreshTokenExpiry(refreshToken);

    await this.sessionRepository.create({
      id: randomUUID(),
      userId: user.id,
      refreshToken,
      expiredAt,
    });

    await this.authRepository.updateLastLoginAt(user.id);

    await this.auditLogService.create({
      userId: user.id,
      action: 'LOGIN',
      module: 'AUTH',
      entityType: 'users',
      entityId: user.id,
      ipAddress: meta.ipAddress,
      newData: { email: user.email },
    });

    return {
      accessToken,
      refreshToken,
      user: toLoginUser(user),
    };
  }

  async refreshToken(input: RefreshTokenInput): Promise<RefreshTokenResponse> {
    let payload;

    try {
      payload = jwtService.verifyRefreshToken(input.refreshToken);
    } catch {
      throw new UnauthorizedException();
    }

    const session = await this.sessionRepository.findByRefreshToken(input.refreshToken);

    if (!session || session.expiredAt.getTime() < Date.now()) {
      throw new UnauthorizedException();
    }

    const user = await this.authRepository.findById(payload.sub);

    if (!user || user.status !== UserStatus.ACTIVE || user.refreshTokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException();
    }

    const { accessToken, refreshToken } = this.generateTokens(user);
    const expiredAt = getRefreshTokenExpiry(refreshToken);

    const updatedSession = await this.sessionRepository.updateRefreshToken(session.id, refreshToken, expiredAt);

    if (!updatedSession) {
      throw new UnauthorizedException();
    }

    return { accessToken, refreshToken };
  }

  async logout(refreshToken: string, userId: string, meta: AuthMeta): Promise<void> {
    const session = await this.sessionRepository.deleteByRefreshToken(refreshToken);

    if (!session) {
      throw new UnauthorizedException();
    }

    if (session.userId !== userId) {
      throw new UnauthorizedException();
    }

    await this.auditLogService.create({
      userId,
      action: 'LOGOUT',
      module: 'AUTH',
      entityType: 'user_sessions',
      entityId: session.id,
      ipAddress: meta.ipAddress,
    });
  }

  async getCurrentUser(userId: string): Promise<CurrentUserResponse> {
    const user = await this.authRepository.findById(userId);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException();
    }

    return toCurrentUser(user);
  }
}
