import { randomUUID } from 'crypto';

import { UserRole, UserStatus } from '../../constants';
import type { DatabaseClient } from '../../db/client';
import type { UserRow } from '../../db/schema';
import { ConflictException, NotFoundException, ValidationException } from '../../lib/exceptions';
import { buildPaginationMeta, normalizePagination } from '../../lib/pagination';
import { passwordService } from '../../lib/password.service';
import type { AuditLogService } from '../../services/audit-log.service';
import { SessionRepository } from '../auth/session.repository';
import type {
  CreateUserInput,
  ListUsersQuery,
  ResetPasswordInput,
  UpdateUserInput,
} from './user.schema';
import { UserRepository } from './user.repository';
import type { ServiceMeta, UserDetailResponse, UserListItemResponse } from './user.types';

const toUserDetail = (user: UserRow): UserDetailResponse => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  status: user.status,
});

const toUserListItem = (user: UserRow): UserListItemResponse => ({
  ...toUserDetail(user),
  phone: user.phone,
  villageId: user.villageId,
});

const resolveVillageId = (role: UserRole, villageId?: string | null): string | null => {
  if (role === UserRole.ADMIN_KECAMATAN) {
    return null;
  }

  return villageId ?? null;
};

const assertVillageAssignment = (role: UserRole, villageId: string | null): void => {
  if (role === UserRole.ADMIN_KECAMATAN && villageId) {
    throw new ValidationException('ADMIN_KECAMATAN must not have villageId', [
      { field: 'villageId', message: 'ADMIN_KECAMATAN must not have villageId' },
    ]);
  }

  if ((role === UserRole.ADMIN_DESA || role === UserRole.KADER_DESA) && !villageId) {
    throw new ValidationException('villageId is required for this role', [
      { field: 'villageId', message: 'villageId is required for this role' },
    ]);
  }
};

export class UserManagementService {
  private readonly userRepository: UserRepository;
  private readonly sessionRepository: SessionRepository;

  constructor(
    db: DatabaseClient,
    private readonly auditLogService: AuditLogService,
  ) {
    this.userRepository = new UserRepository(db);
    this.sessionRepository = new SessionRepository(db);
  }

  async findAll(query: ListUsersQuery) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });

    const { items, totalItems } = await this.userRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
      search: query.search,
      role: query.role,
      status: query.status,
    });

    return {
      items: items.map(toUserListItem),
      meta: buildPaginationMeta({
        page: pagination.page,
        limit: pagination.limit,
        totalItems,
      }),
    };
  }

  async findById(userId: string): Promise<UserDetailResponse> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return toUserDetail(user);
  }

  async create(input: CreateUserInput, meta: ServiceMeta): Promise<UserDetailResponse> {
    const existingUser = await this.userRepository.findByEmail(input.email);

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const villageId = resolveVillageId(input.role, input.villageId);
    assertVillageAssignment(input.role, villageId);

    const passwordHash = await passwordService.hashPassword(input.password);

    const user = await this.userRepository.create({
      id: randomUUID(),
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      passwordHash,
      role: input.role,
      status: UserStatus.ACTIVE,
      villageId,
      refreshTokenVersion: 1,
    });

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'CREATE_USER',
      module: 'USER_MANAGEMENT',
      entityType: 'users',
      entityId: user.id,
      ipAddress: meta.ipAddress,
      newData: toUserDetail(user),
    });

    return toUserDetail(user);
  }

  async update(userId: string, input: UpdateUserInput, meta: ServiceMeta): Promise<UserDetailResponse> {
    const existingUser = await this.userRepository.findById(userId);

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const nextRole = input.role ?? existingUser.role;
    const nextVillageId =
      input.villageId !== undefined ? resolveVillageId(nextRole, input.villageId) : existingUser.villageId;

    if (input.role !== undefined || input.villageId !== undefined) {
      assertVillageAssignment(nextRole, nextVillageId);
    }

    const updatedUser = await this.userRepository.update(userId, {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.role !== undefined || input.villageId !== undefined ? { villageId: nextVillageId } : {}),
    });

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'UPDATE_USER',
      module: 'USER_MANAGEMENT',
      entityType: 'users',
      entityId: updatedUser.id,
      ipAddress: meta.ipAddress,
      oldData: toUserDetail(existingUser),
      newData: toUserDetail(updatedUser),
    });

    return toUserDetail(updatedUser);
  }

  async resetPassword(userId: string, input: ResetPasswordInput, meta: ServiceMeta): Promise<void> {
    const existingUser = await this.userRepository.findById(userId);

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await passwordService.hashPassword(input.newPassword);

    const updatedUser = await this.userRepository.update(userId, { passwordHash });

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.incrementRefreshTokenVersion(userId);
    await this.sessionRepository.deleteAllByUserId(userId);

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'RESET_PASSWORD',
      module: 'USER_MANAGEMENT',
      entityType: 'users',
      entityId: userId,
      ipAddress: meta.ipAddress,
    });
  }

  async delete(userId: string, meta: ServiceMeta): Promise<void> {
    const existingUser = await this.userRepository.findById(userId);

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const deletedUser = await this.userRepository.softDelete(userId);

    if (!deletedUser) {
      throw new NotFoundException('User not found');
    }

    await this.sessionRepository.deleteAllByUserId(userId);

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'DELETE_USER',
      module: 'USER_MANAGEMENT',
      entityType: 'users',
      entityId: userId,
      ipAddress: meta.ipAddress,
      oldData: toUserDetail(existingUser),
    });
  }
}
