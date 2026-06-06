import { randomUUID } from 'crypto';

import type { AgencyType } from '../../constants';
import type { DatabaseClient } from '../../db/client';
import { NotFoundException, ValidationException } from '../../lib/exceptions';
import { buildPaginationMeta, normalizePagination } from '../../lib/pagination';
import type { AuditLogService } from '../../services/audit-log.service';
import type { EmailService } from '../../services/email.service';
import type { SettingsService } from '../settings/settings.service';
import { AgencyNotificationService } from './agency-notification.service';
import { AgencyRepository } from './agency.repository';
import type { CreateAgencyInput, ListAgenciesQuery, SendAgencyEmailInput, SendAgencyWhatsAppInput, UpdateAgencyInput } from './agency.schema';
import type { AgencyResponse, AgencyServiceMeta, SendAgencyEmailResponse, SendAgencyWhatsAppResponse } from './agency.types';

const toResponse = (agency: {
  id: string;
  name: string;
  agencyType: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AgencyResponse => ({
  id: agency.id,
  name: agency.name,
  agencyType: agency.agencyType as AgencyType,
  email: agency.email,
  phone: agency.phone,
  isActive: agency.isActive,
  createdAt: agency.createdAt.toISOString(),
  updatedAt: agency.updatedAt.toISOString(),
});

const hasContact = (email: string | null | undefined, phone: string | null | undefined): boolean =>
  Boolean(email?.trim() || phone?.trim());

export class AgencyService {
  private readonly agencyRepository: AgencyRepository;
  private readonly agencyNotificationService: AgencyNotificationService;

  constructor(
    db: DatabaseClient,
    emailService: EmailService,
    private readonly auditLogService: AuditLogService,
    settingsService: SettingsService,
  ) {
    this.agencyRepository = new AgencyRepository(db);
    this.agencyNotificationService = new AgencyNotificationService(db, emailService, auditLogService, settingsService);
  }

  async findAll(query: ListAgenciesQuery) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });
    const { items, totalItems } = await this.agencyRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
      search: query.search,
      agencyType: query.agency_type,
    });

    return {
      items: items.map(toResponse),
      meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems }),
    };
  }

  async findById(agencyId: string): Promise<AgencyResponse> {
    const agency = await this.agencyRepository.findById(agencyId);
    if (!agency) throw new NotFoundException('Agency not found');
    return toResponse(agency);
  }

  async create(input: CreateAgencyInput, meta: AgencyServiceMeta): Promise<AgencyResponse> {
    const agency = await this.agencyRepository.create({
      id: randomUUID(),
      name: input.name,
      agencyType: input.agencyType,
      email: input.email?.trim() ?? null,
      phone: input.phone?.trim() ?? null,
      isActive: input.isActive ?? true,
    });

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'CREATE_AGENCY',
      module: 'AGENCY',
      entityType: 'agencies',
      entityId: agency.id,
      ipAddress: meta.ipAddress,
      newData: toResponse(agency),
    });

    return toResponse(agency);
  }

  async update(agencyId: string, input: UpdateAgencyInput, meta: AgencyServiceMeta): Promise<AgencyResponse> {
    const existing = await this.agencyRepository.findById(agencyId);
    if (!existing) throw new NotFoundException('Agency not found');

    const nextEmail = input.email !== undefined ? input.email : existing.email;
    const nextPhone = input.phone !== undefined ? input.phone : existing.phone;

    if (!hasContact(nextEmail, nextPhone)) {
      throw new ValidationException('Validation failed', [
        { field: 'email', message: 'At least email or phone is required' },
      ]);
    }

    const updated = await this.agencyRepository.update(agencyId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.agencyType !== undefined ? { agencyType: input.agencyType } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });

    if (!updated) throw new NotFoundException('Agency not found');

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'UPDATE_AGENCY',
      module: 'AGENCY',
      entityType: 'agencies',
      entityId: agencyId,
      ipAddress: meta.ipAddress,
      oldData: toResponse(existing),
      newData: toResponse(updated),
    });

    return toResponse(updated);
  }

  async delete(agencyId: string, meta: AgencyServiceMeta): Promise<void> {
    const existing = await this.agencyRepository.findById(agencyId);
    if (!existing) throw new NotFoundException('Agency not found');

    await this.agencyRepository.softDelete(agencyId);

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'DELETE_AGENCY',
      module: 'AGENCY',
      entityType: 'agencies',
      entityId: agencyId,
      ipAddress: meta.ipAddress,
      oldData: toResponse(existing),
    });
  }

  async sendEmail(agencyId: string, input: SendAgencyEmailInput, meta: AgencyServiceMeta): Promise<SendAgencyEmailResponse> {
    return this.agencyNotificationService.sendEmail(agencyId, input, meta);
  }

  async sendWhatsApp(agencyId: string, input: SendAgencyWhatsAppInput, meta: AgencyServiceMeta): Promise<SendAgencyWhatsAppResponse> {
    return this.agencyNotificationService.sendWhatsApp(agencyId, input, meta);
  }
}
