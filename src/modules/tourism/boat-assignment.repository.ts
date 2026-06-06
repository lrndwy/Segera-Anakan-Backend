import { eq } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { boatAssignments, boatOwners, type BoatAssignmentRow } from '../../db/schema';

export class BoatAssignmentRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findByBookingId(bookingId: string) {
    return this.db
      .select({
        assignment: boatAssignments,
        boatOwnerName: boatOwners.fullName,
        boatName: boatOwners.boatName,
      })
      .from(boatAssignments)
      .innerJoin(boatOwners, eq(boatAssignments.boatOwnerId, boatOwners.id))
      .where(eq(boatAssignments.bookingId, bookingId));
  }

  async create(input: typeof boatAssignments.$inferInsert): Promise<BoatAssignmentRow> {
    const rows = await this.db.insert(boatAssignments).values(input).returning();
    return rows[0] as BoatAssignmentRow;
  }
}
