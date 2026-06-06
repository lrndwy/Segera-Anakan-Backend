import { randomUUID } from 'crypto';

import type { DatabaseClient } from '../../db/client';
import { ConflictException, NotFoundException } from '../../lib/exceptions';
import { buildPaginationMeta, normalizePagination } from '../../lib/pagination';
import type { AuditLogService } from '../../services/audit-log.service';
import { isRequiredSettingKey } from './settings.constants';
import type { CreateSettingInput, ListSettingsQuery, UpdateSettingInput } from './settings.schema';
import { SettingsRepository } from './settings.repository';
import type { SettingResponse, SettingsServiceMeta } from './settings.types';

const toResponse = (row: { key: string; value: string; description: string | null; updatedAt: Date }): SettingResponse => ({
  key: row.key,
  value: row.value,
  description: row.description,
  updatedAt: row.updatedAt.toISOString(),
});

export class SettingsService {
  private readonly cache = new Map<string, string>();
  private readonly settingsRepository: SettingsRepository;

  constructor(
    db: DatabaseClient,
    private readonly auditLogService: AuditLogService,
  ) {
    this.settingsRepository = new SettingsRepository(db);
  }

  async get(key: string): Promise<string | null> {
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const row = await this.settingsRepository.findByKey(key);
    if (!row) {
      return null;
    }

    this.cache.set(key, row.value);
    return row.value;
  }

  async getNumber(key: string): Promise<number | null> {
    const value = await this.get(key);
    if (value === null) {
      return null;
    }

    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  async getBoolean(key: string): Promise<boolean | null> {
    const value = await this.get(key);
    if (value === null) {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }

    return null;
  }

  set(key: string, value: string): void {
    this.cache.set(key, value);
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  async findAll(query: ListSettingsQuery) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });
    const { items, totalItems } = await this.settingsRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
      search: query.search,
    });

    return {
      items: items.map(toResponse),
      meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems }),
    };
  }

  async findByKey(key: string): Promise<SettingResponse> {
    const row = await this.settingsRepository.findByKey(key);
    if (!row) {
      throw new NotFoundException('Setting not found');
    }

    return toResponse(row);
  }

  async create(input: CreateSettingInput, meta: SettingsServiceMeta): Promise<SettingResponse> {
    const existing = await this.settingsRepository.findByKey(input.key);
    if (existing) {
      throw new ConflictException('Setting key already exists');
    }

    const row = await this.settingsRepository.create({
      id: randomUUID(),
      key: input.key,
      value: input.value,
      description: input.description ?? null,
    });

    this.set(row.key, row.value);

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'CREATE_SETTING',
      module: 'SETTINGS',
      entityType: 'settings',
      entityId: row.id,
      ipAddress: meta.ipAddress,
      newData: toResponse(row),
    });

    return toResponse(row);
  }

  async update(key: string, input: UpdateSettingInput, meta: SettingsServiceMeta): Promise<SettingResponse> {
    const existing = await this.settingsRepository.findByKey(key);
    if (!existing) {
      throw new NotFoundException('Setting not found');
    }

    const updated = await this.settingsRepository.update(key, {
      ...(input.value !== undefined ? { value: input.value } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    });

    if (!updated) {
      throw new NotFoundException('Setting not found');
    }

    this.invalidate(key);
    this.set(updated.key, updated.value);

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'UPDATE_SETTING',
      module: 'SETTINGS',
      entityType: 'settings',
      entityId: updated.id,
      ipAddress: meta.ipAddress,
      oldData: toResponse(existing),
      newData: toResponse(updated),
    });

    return toResponse(updated);
  }

  async delete(key: string, meta: SettingsServiceMeta): Promise<void> {
    if (isRequiredSettingKey(key)) {
      throw new ConflictException('Required system setting cannot be deleted');
    }

    const existing = await this.settingsRepository.findByKey(key);
    if (!existing) {
      throw new NotFoundException('Setting not found');
    }

    await this.settingsRepository.delete(key);
    this.invalidate(key);

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'DELETE_SETTING',
      module: 'SETTINGS',
      entityType: 'settings',
      entityId: existing.id,
      ipAddress: meta.ipAddress,
      oldData: toResponse(existing),
    });
  }
}
