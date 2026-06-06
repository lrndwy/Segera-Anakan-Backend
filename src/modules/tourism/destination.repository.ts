import { and, count, desc, eq, ilike, isNull, or } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { destinationImages, destinations, files, villages, type DestinationRow } from '../../db/schema';

export type FindDestinationsInput = {
  page: number;
  limit: number;
  offset: number;
  search?: string | undefined;
  villageId?: string | undefined;
  activeOnly?: boolean | undefined;
};

export class DestinationRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(destinationId: string): Promise<DestinationRow | null> {
    const rows = await this.db
      .select()
      .from(destinations)
      .where(and(eq(destinations.id, destinationId), isNull(destinations.deletedAt)))
      .limit(1);

    return rows[0] ?? null;
  }

  async findByIdWithVillage(destinationId: string) {
    const rows = await this.db
      .select({ destination: destinations, villageName: villages.name })
      .from(destinations)
      .innerJoin(villages, eq(destinations.villageId, villages.id))
      .where(and(eq(destinations.id, destinationId), isNull(destinations.deletedAt), isNull(villages.deletedAt)))
      .limit(1);

    return rows[0] ?? null;
  }

  async findAll(input: FindDestinationsInput) {
    const conditions = [isNull(destinations.deletedAt)];

    if (input.villageId) {
      conditions.push(eq(destinations.villageId, input.villageId));
    }

    if (input.activeOnly) {
      conditions.push(eq(destinations.isActive, true));
    }

    if (input.search) {
      const keyword = `%${input.search}%`;
      conditions.push(or(ilike(destinations.name, keyword), ilike(destinations.description, keyword))!);
    }

    const whereClause = and(...conditions);

    const items = await this.db
      .select({
        destination: destinations,
        villageName: villages.name,
      })
      .from(destinations)
      .innerJoin(villages, eq(destinations.villageId, villages.id))
      .where(and(whereClause, isNull(villages.deletedAt)))
      .orderBy(desc(destinations.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    const totalRows = await this.db.select({ count: count() }).from(destinations).where(whereClause);

    return { items, totalItems: totalRows[0]?.count ?? 0 };
  }

  async findImagesByDestinationId(destinationId: string) {
    return this.db
      .select({
        id: destinationImages.id,
        fileId: destinationImages.fileId,
        url: files.url,
      })
      .from(destinationImages)
      .innerJoin(files, eq(destinationImages.fileId, files.id))
      .where(eq(destinationImages.destinationId, destinationId));
  }

  async create(input: typeof destinations.$inferInsert): Promise<DestinationRow> {
    const rows = await this.db.insert(destinations).values(input).returning();
    return rows[0] as DestinationRow;
  }

  async update(destinationId: string, input: Partial<typeof destinations.$inferInsert>): Promise<DestinationRow | null> {
    const rows = await this.db
      .update(destinations)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(destinations.id, destinationId), isNull(destinations.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  async softDelete(destinationId: string): Promise<DestinationRow | null> {
    const rows = await this.db
      .update(destinations)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(destinations.id, destinationId), isNull(destinations.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  async replaceImages(destinationId: string, fileIds: string[]) {
    await this.db.delete(destinationImages).where(eq(destinationImages.destinationId, destinationId));

    if (fileIds.length === 0) {
      return;
    }

    await this.db.insert(destinationImages).values(
      fileIds.map((fileId) => ({
        destinationId,
        fileId,
      })),
    );
  }

  async findFirstImageUrl(destinationId: string): Promise<string | null> {
    const rows = await this.db
      .select({ url: files.url })
      .from(destinationImages)
      .innerJoin(files, eq(destinationImages.fileId, files.id))
      .where(eq(destinationImages.destinationId, destinationId))
      .limit(1);

    return rows[0]?.url ?? null;
  }

  async countBookingsOnDate(destinationId: string, bookingDate: string): Promise<number> {
    const { bookings } = await import('../../db/schema');
    const rows = await this.db
      .select({ count: count() })
      .from(bookings)
      .where(
        and(
          eq(bookings.destinationId, destinationId),
          eq(bookings.bookingDate, bookingDate),
        ),
      );

    return rows[0]?.count ?? 0;
  }
}
