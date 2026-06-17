export interface BoardingOrder {
  id: string;
  petName: string;
  petBreed: string;
  petType: 'dog' | 'cat' | 'other';
  ownerName: string;
  ownerPhone: string;
  checkInDate: string;
  checkOutDate?: string;
  plannedDays: number;
  dailyPrice: number;
  feedingInstructions: string;
  specialNeeds: string;
  status: 'active' | 'completed';
  createdAt: string;
}

export interface Groomer {
  id: string;
  name: string;
  services: string[];
  avatar?: string;
}

export interface GroomingService {
  id: string;
  name: string;
  price: number;
  duration: number;
}

export interface GroomingAppointment {
  id: string;
  boardingId?: string;
  petName: string;
  petBreed: string;
  serviceIds: string[];
  groomerId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  totalPrice: number;
  notes?: string;
}

export interface CareRecord {
  id: string;
  boardingId: string;
  date: string;
  type: 'feeding_morning' | 'feeding_evening' | 'walk' | 'status_note';
  time: string;
  note?: string;
  operator?: string;
}

export interface Payment {
  id: string;
  boardingId: string;
  boardingFee: number;
  groomingFee: number;
  discount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'wechat' | 'alipay' | 'card';
  paidAt: string;
  remarks?: string;
}

export interface CompletedCheckout {
  boardingId: string;
  petName: string;
  petBreed: string;
  petType: 'dog' | 'cat' | 'other';
  ownerName: string;
  ownerPhone: string;
  checkInDate: string;
  checkOutDate: string;
  boardingDays: number;
  groomingItemsCount: number;
  payment: Payment;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FeeCalculation {
  boardingDays: number;
  boardingFee: number;
  groomingFee: number;
  discount: number;
  totalAmount: number;
  groomingItems: Array<{ name: string; price: number }>;
}

export interface StatisticsSummary {
  completedBoardings: number;
  completedGroomings: number;
  pendingCheckout: number;
}

export interface Statistics {
  boardingByBreed: Array<{ breed: string; count: number; days: number }>;
  groomingByService: Array<{ serviceName: string; count: number }>;
  revenue: {
    total: number;
    boardingTotal: number;
    groomingTotal: number;
    monthly: Array<{ month: string; amount: number }>;
  };
  summary: StatisticsSummary;
}

export interface GroomingTimeSlot {
  startTime: string;
  endTime: string;
}

export interface GroomingPartialSlot extends GroomingTimeSlot {
  availableCount: number;
}

export interface GroomerBusySlot extends GroomingTimeSlot {
  petName: string;
}

export interface GroomerSchedule {
  groomerId: string;
  groomerName: string;
  busySlots: GroomerBusySlot[];
}

export interface GroomingTimeSlotsResponse {
  allGroomerCount: number;
  availableSlots: GroomingTimeSlot[];
  partialSlots: GroomingPartialSlot[];
  groomerSchedules: GroomerSchedule[];
}

export interface ReceiptData {
  boardingId: string;
  petName: string;
  petBreed: string;
  petType: 'dog' | 'cat' | 'other';
  ownerName: string;
  ownerPhone: string;
  checkInDate: string;
  checkOutDate: string;
  boardingDays: number;
  dailyPrice: number;
  boardingFee: number;
  groomingItems: Array<{ serviceName: string; price: number }>;
  groomingFee: number;
  discount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'wechat' | 'alipay' | 'card';
  paidAt: string;
  remarks?: string;
}

export interface Trend30DaysItem {
  date: string;
  revenue: number;
  completedBoardings: number;
  completedGroomings: number;
  pendingCheckout: number;
}

export interface Trend30DaysResponse {
  daily: Trend30DaysItem[];
}
