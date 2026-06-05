export interface WaiterZReport {
  waiterId: number;
  waiterName: string;
  shiftStart: Date;
  shiftEnd: Date;
  totalHours: number;
  totalOrdersClosed: number;
  totalSalesVolume: number;
  baseHourlyEarnings: number;
  percentageEarnings: number;
  finalTotalEarnings: number;
}
