export type ReportChartItem = {
  date: string;
  revenue: number;
  visitors: number;
  confirmed: number;
};

export type ReportSummary = {
  averageDailyRevenue: number;
  totalPeriodRevenue: number;
};

export type ReportsResponse = {
  chartData: ReportChartItem[];
  summary: ReportSummary;
};
