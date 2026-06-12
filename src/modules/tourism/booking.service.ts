import { randomUUID } from 'crypto';

import { BookingStatus, PaymentStatus, UserRole } from '../../constants';
import type { Database } from '../../db/client';
import { NotFoundException, ValidationException } from '../../lib/exceptions';
import { buildPaginationMeta, normalizePagination } from '../../lib/pagination';
import { assertVillageAccess } from '../../policies/village-access.policy';
import { runTransaction } from '../../lib/transaction';
import type { AuditLogService } from '../../services/audit-log.service';
import type { CurrentUser } from '../../types/current-user';
import { buildFileDownloadUrl } from '../../utils/file-url';
import { FileRepository } from '../file/file.repository';
import { VillageRepository } from '../village/village.repository';
import { BoatAssignmentService } from './boat-assignment.service';
import { BookingPaymentRepository } from './booking-payment.repository';
import { BookingRepository } from './booking.repository';
import { DestinationRepository } from './destination.repository';
import type { CreateBookingInput, CreateBookingPaymentInput, ListBookingsQuery } from './tourism.schema';
import type { BookingListItemResponse, BookingPaymentResponse, CreateBookingResponse, TourismServiceMeta } from './tourism.types';
import { buildInvoiceNumber, calculateTotalAmount } from './tourism.utils';

const toListItem = (row: {
  booking: {
    id: string;
    invoiceNumber: string;
    villageId: string;
    destinationId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    bookingDate: string;
    totalPeople: number;
    totalAmount: string | number;
    status: string;
    createdAt: Date;
  };
  destinationName: string;
}): BookingListItemResponse => ({
  id: row.booking.id,
  invoiceNumber: row.booking.invoiceNumber,
  villageId: row.booking.villageId,
  destinationId: row.booking.destinationId,
  destinationName: row.destinationName,
  customerName: row.booking.customerName,
  customerEmail: row.booking.customerEmail,
  customerPhone: row.booking.customerPhone,
  bookingDate: row.booking.bookingDate,
  totalPeople: row.booking.totalPeople,
  totalAmount: Number(row.booking.totalAmount),
  status: row.booking.status,
  createdAt: row.booking.createdAt.toISOString(),
});

export class BookingService {
  private readonly bookingRepository: BookingRepository;
  private readonly bookingPaymentRepository: BookingPaymentRepository;
  private readonly destinationRepository: DestinationRepository;
  private readonly villageRepository: VillageRepository;
  private readonly fileRepository: FileRepository;
  private readonly boatAssignmentService: BoatAssignmentService;

  constructor(
    private readonly db: Database,
    private readonly auditLogService: AuditLogService,
  ) {
    this.bookingRepository = new BookingRepository(db);
    this.bookingPaymentRepository = new BookingPaymentRepository(db);
    this.destinationRepository = new DestinationRepository(db);
    this.villageRepository = new VillageRepository(db);
    this.fileRepository = new FileRepository(db);
    this.boatAssignmentService = new BoatAssignmentService(db);
  }

  private resolveVillageScope(currentUser: CurrentUser): string | undefined {
    if (currentUser.role === UserRole.ADMIN_KECAMATAN) {
      return undefined;
    }

    return currentUser.villageId ?? undefined;
  }

  async findAll(query: ListBookingsQuery, currentUser: CurrentUser) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });
    const villageScope = this.resolveVillageScope(currentUser);

    if (currentUser.role !== UserRole.ADMIN_KECAMATAN && !villageScope) {
      return {
        items: [] as BookingListItemResponse[],
        meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems: 0 }),
      };
    }

    const { items, totalItems } = await this.bookingRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
      villageId: villageScope,
      status: query.status,
    });

    return {
      items: items.map(toListItem),
      meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems }),
    };
  }

  async createPublic(input: CreateBookingInput, meta: TourismServiceMeta): Promise<CreateBookingResponse> {
    const destination = await this.destinationRepository.findById(input.destinationId);

    if (!destination || !destination.isActive) {
      throw new NotFoundException('Destination not found');
    }

    if (input.totalPeople > destination.maxPeoplePerBooking) {
      throw new ValidationException('Validation failed', [
        { field: 'totalPeople', message: `Maximum ${destination.maxPeoplePerBooking} people per booking` },
      ]);
    }

    const bookedPeople = await this.bookingRepository.sumPeopleOnDate(destination.id, input.bookingDate);

    if (bookedPeople + input.totalPeople > destination.capacityPerDay) {
      throw new ValidationException('Validation failed', [
        { field: 'bookingDate', message: 'Destination capacity for this date is full' },
      ]);
    }

    const pricePerPerson = Number(destination.pricePerPerson);
    const totalAmount = calculateTotalAmount(pricePerPerson, input.totalPeople);
    const datePrefix = input.bookingDate.replace(/-/g, '');
    const sequence = (await this.bookingRepository.countByInvoiceDatePrefix(datePrefix)) + 1;
    const invoiceNumber = buildInvoiceNumber(input.bookingDate, sequence);

    const booking = await this.bookingRepository.create({
      id: randomUUID(),
      invoiceNumber,
      villageId: destination.villageId,
      destinationId: destination.id,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      bookingDate: input.bookingDate,
      totalPeople: input.totalPeople,
      totalAmount: totalAmount.toString(),
      status: BookingStatus.PENDING_PAYMENT,
    });

    const village = await this.villageRepository.findByIdWithQris(destination.villageId);

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'CREATE_BOOKING',
      module: 'TOURISM',
      entityType: 'bookings',
      entityId: booking.id,
      ipAddress: meta.ipAddress,
      newData: {
        invoiceNumber: booking.invoiceNumber,
        totalAmount,
        status: booking.status,
      },
    });

    const hasQris = Boolean(village?.qrisFileIdValue);

    return {
      bookingId: booking.id,
      invoiceNumber: booking.invoiceNumber,
      totalAmount,
      qris:
        hasQris && village?.qrisFileIdValue
          ? {
              villageId: destination.villageId,
              url: buildFileDownloadUrl(village.qrisFileIdValue),
            }
          : null,
      qrisPayload: null,
    };
  }

  async submitPayment(input: CreateBookingPaymentInput, meta: TourismServiceMeta): Promise<BookingPaymentResponse> {
    const booking = await this.bookingRepository.findById(input.bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new ValidationException('Validation failed', [
        { field: 'bookingId', message: 'Booking is not awaiting payment' },
      ]);
    }

    const file = await this.fileRepository.findById(input.fileId);

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const payment = await this.bookingPaymentRepository.create({
      id: randomUUID(),
      bookingId: booking.id,
      fileId: input.fileId,
      senderName: input.senderName,
      paymentStatus: PaymentStatus.PENDING,
    });

    await this.bookingRepository.updateStatus(booking.id, BookingStatus.WAITING_VERIFICATION);

    return {
      id: payment.id,
      bookingId: payment.bookingId,
      senderName: payment.senderName,
      paymentStatus: payment.paymentStatus,
      createdAt: payment.createdAt.toISOString(),
    };
  }

  async verifyPayment(bookingId: string, currentUser: CurrentUser, meta: TourismServiceMeta): Promise<void> {
    const record = await this.bookingRepository.findById(bookingId);

    if (!record) {
      throw new NotFoundException('Booking not found');
    }

    assertVillageAccess(currentUser, record.villageId);

    if (record.status !== BookingStatus.WAITING_VERIFICATION) {
      throw new ValidationException('Validation failed', [
        { field: 'status', message: 'Booking is not waiting for verification' },
      ]);
    }

    const payment = await this.bookingPaymentRepository.findLatestByBookingId(bookingId);

    if (!payment) {
      throw new NotFoundException('Booking payment not found');
    }

    const assignments = await runTransaction(this.db, async (tx) => {
      const bookingPaymentRepo = new BookingPaymentRepository(tx);
      const bookingRepo = new BookingRepository(tx);

      const verifiedPayment = await bookingPaymentRepo.verifyPayment(payment.id, currentUser.id);

      if (!verifiedPayment) {
        throw new NotFoundException('Booking payment not found');
      }

      const updatedBooking = await bookingRepo.updateStatus(bookingId, BookingStatus.CONFIRMED);

      if (!updatedBooking) {
        throw new NotFoundException('Booking not found');
      }

      return this.boatAssignmentService.assignForBooking(tx, updatedBooking, currentUser.id, meta);
    });

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'VERIFY_BOOKING_PAYMENT',
      module: 'TOURISM',
      entityType: 'bookings',
      entityId: bookingId,
      ipAddress: meta.ipAddress,
      newData: { status: BookingStatus.CONFIRMED },
    });

    for (const assignment of assignments) {
      await this.auditLogService.create({
        userId: meta.actorUserId,
        action: 'ASSIGN_BOAT',
        module: 'TOURISM',
        entityType: 'boat_assignments',
        entityId: assignment.assignmentId,
        ipAddress: meta.ipAddress,
        newData: {
          bookingId: assignment.bookingId,
          boatOwnerId: assignment.boatOwnerId,
          assignedPeople: assignment.assignedPeople,
        },
      });
    }
  }
}
