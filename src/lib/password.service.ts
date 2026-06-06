import bcrypt from 'bcrypt';

import { env } from '../config/env';

export class PasswordService {
  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, env.BCRYPT_SALT_ROUNDS);
  }

  async verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}

export const passwordService = new PasswordService();
