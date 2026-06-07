import { UserRole } from '../../constants';
import { ValidationException } from '../../lib/exceptions';
import type { DatabaseClient } from '../../db/client';
import type { CurrentUser } from '../../types/current-user';
import type { ReportsQuery } from './reports.schema';
import { ReportsRepository } from './reports.repository';
import type { ReportChartItem, ReportsResponse } from './reports.types';

const enumerateDates = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

export class ReportsService {
  private readonly reportsRepository: ReportsRepository;

  constructor(db: DatabaseClient) {
    this.reportsRepository = new ReportsRepository(db);
  }

  private resolveVillageScope(currentUser: CurrentUser): string | undefined {
    if (currentUser.role === UserRole.ADMIN_KECAMATAN) return undefined;
    return currentUser.villageId ?? undefined;
  }

  async getReports(query: ReportsQuery, currentUser: CurrentUser): Promise<ReportsResponse> {
    if (query.start_date > query.end_date) {
      throw new ValidationException('Validation failed', [
        { field: 'end_date', message: 'end_date must be on or after start_date' },
      ]);
    }

    const villageId = this.resolveVillageScope(currentUser);
    const startDate = new Date(`${query.start_date}T00:00:00.000Z`);
    const endDate = new Date(`${query.end_date}T23:59:59.999Z`);

    const dailyMetrics = await this.reportsRepository.getDailyMetrics(villageId, startDate, endDate);
    const metricsByDate = new Map(dailyMetrics.map((row) => [row.date, row]));

    const chartData: ReportChartItem[] = enumerateDates(query.start_date, query.end_date).map((date) => {
      const metrics = metricsByDate.get(date);
      return {
        date,
        revenue: metrics?.revenue ?? 0,
        visitors: metrics?.visitors ?? 0,
      };
    });

    const totalPeriodRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
    const dayCount = chartData.length;
    const averageDailyRevenue = dayCount === 0 ? 0 : Number((totalPeriodRevenue / dayCount).toFixed(2));

    return {
      chartData,
      summary: {
        averageDailyRevenue,
        totalPeriodRevenue,
      },
    };
  }
}
