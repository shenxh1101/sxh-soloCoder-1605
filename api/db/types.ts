import type {
  BoardingOrder,
  Groomer,
  GroomingService,
  GroomingAppointment,
  CareRecord,
  Payment,
  Customer,
} from '../../shared/types.js';

export interface Database {
  boardingOrders: BoardingOrder[];
  groomers: Groomer[];
  groomingServices: GroomingService[];
  groomingAppointments: GroomingAppointment[];
  careRecords: CareRecord[];
  payments: Payment[];
  customers: Customer[];
}
