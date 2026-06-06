import { randomUUID } from 'crypto';

import { BoatAssignmentStatus } from '../../constants';
import type { DatabaseClient } from '../../db/client';
import { ValidationException } from '../../lib/exceptions';
import type { TransactionClient } from '../../lib/transaction';
import type { BookingRow } from '../../db/schema';
import { BoatAssignmentRepository } from './boat-assignment.repository';
import { BoatOwnerRepository } from './boat-owner.repository';
import type { TourismServiceMeta } from './tourism.types';

export type BoatAssignmentAuditRecord = {
  assignmentId: string;
  bookingId: string;
  boatOwnerId: string;
  assignedPeople: number;
};

export class BoatAssignmentService {
  private readonly boatOwnerRepository: BoatOwnerRepository;
  private readonly boatAssignmentRepository: BoatAssignmentRepository;

  constructor(db: DatabaseClient) {
    this.boatOwnerRepository = new BoatOwnerRepository(db);
    this.boatAssignmentRepository = new BoatAssignmentRepository(db);
  }

  async assignForBooking(
    tx: TransactionClient,
    booking: BookingRow,
    assignedByUserId: string,
    _meta: TourismServiceMeta,
  ): Promise<BoatAssignmentAuditRecord[]> {
    const boatOwnerRepo = new BoatOwnerRepository(tx);
    const boatAssignmentRepo = new BoatAssignmentRepository(tx);

    const owners = await boatOwnerRepo.findActiveForRotation(booking.villageId);

    if (owners.length === 0) {
      throw new ValidationException('Validation failed', [
        { field: 'boatOwners', message: 'No active boat owners available for assignment' },
      ]);
    }

    let remainingPeople = booking.totalPeople;
    const assignedAt = new Date();
    const ownerPool = [...owners];
    let ownerIndex = 0;
    const assignments: BoatAssignmentAuditRecord[] = [];

    while (remainingPeople > 0) {
      if (ownerIndex >= ownerPool.length) {
        throw new ValidationException('Validation failed', [
          { field: 'boatOwners', message: 'Insufficient boat capacity for this booking' },
        ]);
      }

      const owner = ownerPool[ownerIndex]!;
      const assignedPeople = Math.min(owner.boatCapacity, remainingPeople);

      const assignment = await boatAssignmentRepo.create({
        id: randomUUID(),
        bookingId: booking.id,
        boatOwnerId: owner.id,
        assignedPeople,
        status: BoatAssignmentStatus.CONFIRMED,
        assignedAt,
        assignedBy: assignedByUserId,
      });

      await boatOwnerRepo.updateLastAssignedAt(owner.id, assignedAt);

      assignments.push({
        assignmentId: assignment.id,
        bookingId: booking.id,
        boatOwnerId: owner.id,
        assignedPeople,
      });

      remainingPeople -= assignedPeople;
      ownerIndex += 1;
    }

    return assignments;
  }
}
