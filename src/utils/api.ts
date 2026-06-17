import type {
  ApiResponse,
  BoardingOrder,
  Groomer,
  GroomingAppointment,
  GroomingService,
  CareRecord,
  Payment,
  FeeCalculation,
  Statistics,
  CompletedCheckout,
  GroomingTimeSlotsResponse,
  ReceiptData,
  Trend30DaysResponse,
  Customer,
  CustomerProfile,
  CustomerDetail,
  CustomerRepurchaseStats,
} from '../../shared/types';

const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });
  const data = await response.json();
  return { ...(data as ApiResponse<T>), status: response.status } as ApiResponse<T> & { status: number };
}

export async function getBoarding(status?: 'active' | 'completed'): Promise<BoardingOrder[]> {
  const path = status ? `/boarding?status=${status}` : '/boarding';
  const res = await request<BoardingOrder[]>(path);
  return res.data || [];
}

export async function getBoardingById(id: string): Promise<BoardingOrder> {
  const res = await request<BoardingOrder>(`/boarding/${id}`);
  return res.data as BoardingOrder;
}

export async function createBoarding(data: Omit<BoardingOrder, 'id' | 'createdAt'>): Promise<BoardingOrder> {
  const res = await request<BoardingOrder>('/boarding', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data as BoardingOrder;
}

export async function updateBoarding(id: string, data: Partial<BoardingOrder>): Promise<BoardingOrder> {
  const res = await request<BoardingOrder>(`/boarding/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data as BoardingOrder;
}

export async function deleteBoarding(id: string): Promise<void> {
  await request<void>(`/boarding/${id}`, {
    method: 'DELETE',
  });
}

export async function getGroomers(): Promise<Groomer[]> {
  const res = await request<Groomer[]>('/grooming/groomers');
  return res.data || [];
}

export async function getGroomingServices(): Promise<GroomingService[]> {
  const res = await request<GroomingService[]>('/grooming/services');
  return res.data || [];
}

export async function getAppointments(date?: string): Promise<GroomingAppointment[]> {
  const path = date ? `/grooming/appointments?date=${date}` : '/grooming/appointments';
  const res = await request<GroomingAppointment[]>(path);
  return res.data || [];
}

export async function createAppointment(data: Omit<GroomingAppointment, 'id'>): Promise<GroomingAppointment> {
  const res = await request<GroomingAppointment>('/grooming/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data as GroomingAppointment;
}

export async function updateAppointment(id: string, data: Partial<GroomingAppointment>): Promise<void> {
  await request<void>(`/grooming/appointments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAppointment(id: string): Promise<void> {
  await request<void>(`/grooming/appointments/${id}`, {
    method: 'DELETE',
  });
}

export async function getAvailableGroomers(date: string, startTime: string, duration: number): Promise<Groomer[]> {
  const path = `/grooming/available?date=${date}&startTime=${startTime}&duration=${duration}`;
  const res = await request<Groomer[]>(path);
  return res.data || [];
}

interface GetCareRecordsParams {
  boardingId?: string;
  date?: string;
  from?: string;
  to?: string;
}

export async function getCareRecords(params?: GetCareRecordsParams): Promise<CareRecord[]> {
  const queryParts: string[] = [];
  if (params?.boardingId) queryParts.push(`boardingId=${params.boardingId}`);
  if (params?.date) queryParts.push(`date=${params.date}`);
  if (params?.from) queryParts.push(`from=${params.from}`);
  if (params?.to) queryParts.push(`to=${params.to}`);
  const path = queryParts.length > 0 ? `/care?${queryParts.join('&')}` : '/care';
  const res = await request<CareRecord[]>(path);
  return res.data || [];
}

export async function createCareRecord(data: Omit<CareRecord, 'id'>): Promise<CareRecord> {
  const res = await request<CareRecord>('/care', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data as CareRecord;
}

export async function deleteCareRecord(id: string): Promise<void> {
  await request<void>(`/care/${id}`, {
    method: 'DELETE',
  });
}

export async function getPendingCheckout(): Promise<BoardingOrder[]> {
  const res = await request<BoardingOrder[]>('/checkout/pending');
  return res.data || [];
}

export async function getCompletedCheckout(): Promise<CompletedCheckout[]> {
  const res = await request<CompletedCheckout[]>('/checkout/completed');
  return res.data || [];
}

export async function getPaymentByBoardingId(boardingId: string): Promise<Payment | null> {
  const res = await request<Payment>(`/checkout/payment/${boardingId}`);
  return res.data || null;
}

export async function calculateFee(id: string): Promise<FeeCalculation> {
  const res = await request<FeeCalculation>(`/checkout/calculate/${id}`);
  return res.data as FeeCalculation;
}

export async function pay(data: Omit<Payment, 'id' | 'paidAt'>): Promise<Payment> {
  const res = await request<Payment>('/checkout/pay', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data as Payment;
}

export async function getStatistics(month?: string): Promise<Statistics> {
  const path = month ? `/statistics?month=${month}` : '/statistics';
  const res = await request<Statistics>(path);
  return res.data as Statistics;
}

export async function getTimeSlots(date: string, duration: number): Promise<GroomingTimeSlotsResponse> {
  const path = `/grooming/time-slots?date=${date}&duration=${duration}`;
  const res = await request<GroomingTimeSlotsResponse>(path);
  return res.data as GroomingTimeSlotsResponse;
}

export async function getReceipt(boardingId: string): Promise<ReceiptData> {
  const res = await request<ReceiptData>(`/checkout/receipt/${boardingId}`);
  return res.data as ReceiptData;
}

export async function getTrend30Days(): Promise<Trend30DaysResponse> {
  const res = await request<Trend30DaysResponse>('/statistics/trend-30days');
  return res.data as Trend30DaysResponse;
}

export async function getCustomers(search?: string): Promise<CustomerProfile[]> {
  const path = search ? `/customers?search=${encodeURIComponent(search)}` : '/customers';
  const res = await request<CustomerProfile[]>(path);
  return res.data || [];
}

export async function getCustomerByPhone(phone: string): Promise<CustomerDetail | null> {
  const res = await request<CustomerDetail>(`/customers/${encodeURIComponent(phone)}`);
  return res.data || null;
}

export async function updateCustomer(phone: string, data: { tags: string[]; notes: string }): Promise<Customer> {
  const res = await request<Customer>(`/customers/${encodeURIComponent(phone)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data as Customer;
}

export async function getRepurchaseStats(): Promise<CustomerRepurchaseStats> {
  const res = await request<CustomerRepurchaseStats>('/statistics/repurchase-30days');
  return res.data as CustomerRepurchaseStats;
}

export async function createAppointmentWithStatus(data: Omit<GroomingAppointment, 'id'>): Promise<{ appointment: GroomingAppointment | null; status: number; error?: string }> {
  const res = await request<GroomingAppointment>('/grooming/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const status = (res as unknown as { status: number }).status || 200;
  return {
    appointment: res.data || null,
    status,
    error: res.error,
  };
}
