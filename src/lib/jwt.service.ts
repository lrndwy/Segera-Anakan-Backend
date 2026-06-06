import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

import { env } from '../config/env';
import type { UserRole } from '../constants';

export type AccessTokenPayload = {
  sub: string;
  villageId: string | null;
  role: UserRole;
  tokenType: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  tokenVersion: number;
  tokenType: 'refresh';
};

export type DecodedToken = AccessTokenPayload | RefreshTokenPayload;

const accessTokenExpiresIn: Exclude<SignOptions['expiresIn'], undefined> = env.ACCESS_TOKEN_TTL as Exclude<
  SignOptions['expiresIn'],
  undefined
>;
const refreshTokenExpiresIn: Exclude<SignOptions['expiresIn'], undefined> = env.REFRESH_TOKEN_TTL as Exclude<
  SignOptions['expiresIn'],
  undefined
>;

export class JwtService {
  generateAccessToken(payload: Omit<AccessTokenPayload, 'tokenType'>): string {
    return jwt.sign({ ...payload, tokenType: 'access' }, env.JWT_ACCESS_SECRET, {
      expiresIn: accessTokenExpiresIn,
      issuer: env.APP_NAME,
    });
  }

  generateRefreshToken(payload: Omit<RefreshTokenPayload, 'tokenType'>): string {
    return jwt.sign({ ...payload, tokenType: 'refresh' }, env.JWT_REFRESH_SECRET, {
      expiresIn: refreshTokenExpiresIn,
      issuer: env.APP_NAME,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

    if (decoded.tokenType !== 'access') {
      throw new Error('Invalid access token');
    }

    return decoded;
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

    if (decoded.tokenType !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    return decoded;
  }

  decodeToken(token: string): DecodedToken | null {
    const decoded = jwt.decode(token);

    if (!decoded || typeof decoded === 'string') {
      return null;
    }

    return decoded as DecodedToken;
  }
}

export const jwtService = new JwtService();
