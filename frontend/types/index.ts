export interface MeterData {
  contractStatus: string;
  address: string;
  offeredService: string;
  connectionType: string | null;
}

export interface TokenBill {
  meter_number: string;
  timestamp: string;
  tokenNo: string;
  amount: number;
  units: string;
}

export interface PaginatedBillsResponse {
  bills: TokenBill[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ChartDataPoint {
  date: string;
  amount: number;
  units: number;
}

export interface PeriodAnalytics {
  data: ChartDataPoint[];
  total_amount: number;
  total_units: number;
  count: number;
  label: string;
}

export interface AnalyticsData {
  total_amount: number;
  total_units: number;
  total_transactions: number;
  daily: PeriodAnalytics;
  weekly: PeriodAnalytics;
  monthly: PeriodAnalytics;
  yearly: PeriodAnalytics;
}

export interface ApiError {
  error: string;
}

export interface ApiResponse {
  data?: MeterData;
  error?: string;
}

