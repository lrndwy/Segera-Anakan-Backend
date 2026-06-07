import { UserRole } from '../../constants';
import type { DatabaseClient } from '../../db/client';
import type { CurrentUser } from '../../types/current-user';
import { DashboardRepository } from './dashboard.repository';
import type { DashboardStatsResponse } from './dashboard.types';

const calcGrowth = (current: number, previous: number): number => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const startOfMonth = (year: number, month: number): Date => new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

const startOfNextMonth = (year: number, month: number): Date => new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

export class DashboardService {
  private readonly dashboardRepository: DashboardRepository;

  constructor(db: DatabaseClient) {
    this.dashboardRepository = new DashboardRepository(db);
  }

  private resolveVillageScope(currentUser: CurrentUser): string | undefined {
    if (currentUser.role === UserRole.ADMIN_KECAMATAN) return undefined;
    return currentUser.villageId ?? undefined;
  }

  async getStats(currentUser: CurrentUser): Promise<DashboardStatsResponse> {
    const villageId = this.resolveVillageScope(currentUser);
    const now = new Date();
    const thisMonthStart = startOfMonth(now.getUTCFullYear(), now.getUTCMonth());
    const nextMonthStart = startOfNextMonth(now.getUTCFullYear(), now.getUTCMonth());
    const lastMonthStart = startOfMonth(now.getUTCFullYear(), now.getUTCMonth() - 1);

    const [
      totalRevenue,
      activeBookings,
      totalFishermen,
      totalCommodities,
      thisMonthRevenue,
      lastMonthRevenue,
      thisMonthBookings,
      lastMonthBookings,
    ] = await Promise.all([
      this.dashboardRepository.sumRevenue(villageId, new Date(0), nextMonthStart),
      this.dashboardRepository.countActiveBookings(villageId),
      this.dashboardRepository.countFishermen(villageId),
      this.dashboardRepository.countCommodities(),
      this.dashboardRepository.sumRevenue(villageId, thisMonthStart, nextMonthStart),
      this.dashboardRepository.sumRevenue(villageId, lastMonthStart, thisMonthStart),
      this.dashboardRepository.countBookings(villageId, thisMonthStart, nextMonthStart),
      this.dashboardRepository.countBookings(villageId, lastMonthStart, thisMonthStart),
    ]);

    return {
      totalRevenue,
      activeBookings,
      totalFishermen,
      totalCommodities,
      revenueGrowth: calcGrowth(thisMonthRevenue, lastMonthRevenue),
      bookingGrowth: calcGrowth(thisMonthBookings, lastMonthBookings),
    };
  }
}
