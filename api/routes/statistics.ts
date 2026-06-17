import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/index.js';
import { success } from '../utils/response.js';

const router = Router();

function getDefaultMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function parseMonth(monthStr: string): { year: number; month: number } {
  const [year, month] = monthStr.split('-').map(Number);
  return { year, month };
}

function isDateInMonth(dateStr: string, year: number, month: number): boolean {
  const d = new Date(dateStr);
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

function ceilDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const diffMs = end.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.ceil(diffDays));
}

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLast6Months(baseYear: number, baseMonth: number): Array<{ year: number; month: number; label: string }> {
  const months: Array<{ year: number; month: number; label: string }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(baseYear, baseMonth - 1 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    months.push({
      year: y,
      month: m,
      label: `${y}-${String(m).padStart(2, '0')}`,
    });
  }
  return months;
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const monthParam = (req.query.month as string) || getDefaultMonth();
  const { year, month } = parseMonth(monthParam);

  const boardingByBreedMap = new Map<string, { count: number; days: number }>();
  for (const b of db.data.boardingOrders) {
    if (!isDateInMonth(b.checkInDate, year, month)) continue;

    const endDate = b.status === 'completed' && b.checkOutDate ? b.checkOutDate : getToday();
    const days = ceilDays(b.checkInDate, endDate);

    const existing = boardingByBreedMap.get(b.petBreed);
    if (existing) {
      existing.count += 1;
      existing.days += days;
    } else {
      boardingByBreedMap.set(b.petBreed, { count: 1, days });
    }
  }

  const boardingByBreed = Array.from(boardingByBreedMap.entries()).map(([breed, data]) => ({
    breed,
    count: data.count,
    days: data.days,
  }));

  const serviceCountMap = new Map<string, number>();
  for (const apt of db.data.groomingAppointments) {
    if (apt.status === 'cancelled') continue;
    if (!isDateInMonth(apt.appointmentDate, year, month)) continue;

    for (const sid of apt.serviceIds) {
      serviceCountMap.set(sid, (serviceCountMap.get(sid) || 0) + 1);
    }
  }

  const groomingByService = Array.from(serviceCountMap.entries()).map(([serviceId, count]) => {
    const svc = db.data.groomingServices.find((s) => s.id === serviceId);
    return {
      serviceId,
      serviceName: svc?.name || serviceId,
      count,
    };
  });

  let boardingFeeTotal = 0;
  let groomingFeeTotal = 0;
  let totalAmountTotal = 0;

  for (const p of db.data.payments) {
    if (!isDateInMonth(p.paidAt, year, month)) continue;
    boardingFeeTotal += p.boardingFee;
    groomingFeeTotal += p.groomingFee;
    totalAmountTotal += p.totalAmount;
  }

  const last6Months = getLast6Months(year, month);
  const monthlyRevenue = last6Months.map(({ year: y, month: m, label }) => {
    let monthTotal = 0;
    let monthBoarding = 0;
    let monthGrooming = 0;
    for (const p of db.data.payments) {
      if (!isDateInMonth(p.paidAt, y, m)) continue;
      monthTotal += p.totalAmount;
      monthBoarding += p.boardingFee;
      monthGrooming += p.groomingFee;
    }
    return {
      month: label,
      totalAmount: monthTotal,
      boardingFee: monthBoarding,
      groomingFee: monthGrooming,
    };
  });

  let completedBoardings = 0;
  for (const b of db.data.boardingOrders) {
    if (b.status !== 'completed') continue;
    if (!b.checkOutDate) continue;
    if (!isDateInMonth(b.checkOutDate, year, month)) continue;
    completedBoardings += 1;
  }

  let completedGroomings = 0;
  for (const apt of db.data.groomingAppointments) {
    if (apt.status !== 'completed') continue;
    if (!isDateInMonth(apt.appointmentDate, year, month)) continue;
    completedGroomings += 1;
  }

  const paidBoardingIds = new Set(db.data.payments.map((p) => p.boardingId));
  let pendingCheckout = 0;
  for (const b of db.data.boardingOrders) {
    if (b.status !== 'active') continue;
    if (paidBoardingIds.has(b.id)) continue;
    pendingCheckout += 1;
  }

  res.json(
    success({
      month: monthParam,
      boardingByBreed,
      groomingByService,
      revenue: {
        boardingTotal: boardingFeeTotal,
        groomingTotal: groomingFeeTotal,
        total: totalAmountTotal,
        monthly: monthlyRevenue.map((m) => ({
          month: m.month,
          amount: m.totalAmount,
          boardingTotal: m.boardingFee,
          groomingTotal: m.groomingFee,
        })),
      },
      summary: {
        completedBoardings,
        completedGroomings,
        pendingCheckout,
      },
    }),
  );
});

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

router.get('/trend-30days', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daily: Array<{
    date: string;
    revenue: number;
    completedBoardings: number;
    completedGroomings: number;
    pendingCheckout: number;
  }> = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDate(d);

    let revenue = 0;
    for (const p of db.data.payments) {
      const paidDate = formatDate(new Date(p.paidAt));
      if (paidDate === dateStr) {
        revenue += p.totalAmount;
      }
    }

    let completedBoardings = 0;
    for (const b of db.data.boardingOrders) {
      if (b.status !== 'completed') continue;
      if (b.checkOutDate === dateStr) {
        completedBoardings += 1;
      }
    }

    let completedGroomings = 0;
    for (const apt of db.data.groomingAppointments) {
      if (apt.status !== 'completed') continue;
      if (apt.appointmentDate === dateStr) {
        completedGroomings += 1;
      }
    }

    const paidBoardingIds = new Set(db.data.payments.map((p) => p.boardingId));
    let pendingCheckout = 0;
    for (const b of db.data.boardingOrders) {
      if (b.status !== 'active') continue;
      if (paidBoardingIds.has(b.id)) continue;
      if (b.checkInDate <= dateStr) {
        pendingCheckout += 1;
      }
    }

    daily.push({
      date: dateStr,
      revenue,
      completedBoardings,
      completedGroomings,
      pendingCheckout,
    });
  }

  res.json(success({ daily }));
});

interface ConsumeRecord {
  ownerPhone: string;
  ownerName: string;
  date: string;
  time: number;
  totalAmount: number;
}

function getAllConsumeRecords(db: ReturnType<typeof getDb>): ConsumeRecord[] {
  const records: ConsumeRecord[] = [];

  const boardingByPhone = new Map<string, string>();
  for (const b of db.data.boardingOrders) {
    boardingByPhone.set(b.id, b.ownerPhone);
  }
  const boardingOwnerName = new Map<string, string>();
  for (const b of db.data.boardingOrders) {
    boardingOwnerName.set(b.id, b.ownerName);
  }

  for (const p of db.data.payments) {
    const ownerPhone = boardingByPhone.get(p.boardingId) || `unknown_${p.boardingId}`;
    const ownerName = boardingOwnerName.get(p.boardingId) || '散客';
    records.push({
      ownerPhone,
      ownerName,
      date: formatDate(new Date(p.paidAt)),
      time: new Date(p.paidAt).getTime(),
      totalAmount: p.totalAmount,
    });
  }

  for (const b of db.data.boardingOrders) {
    if (b.status !== 'completed') continue;
    const dateStr = b.checkOutDate || b.checkInDate;
    const hasPayment = db.data.payments.some((p) => p.boardingId === b.id);
    if (!hasPayment) {
      records.push({
        ownerPhone: b.ownerPhone,
        ownerName: b.ownerName,
        date: dateStr,
        time: new Date(dateStr).getTime(),
        totalAmount: 0,
      });
    }
  }

  return records.sort((a, b) => a.time - b.time);
}

router.get('/repurchase-30days', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  const thirtyDaysAgoTime = thirtyDaysAgo.getTime();

  const allRecords = getAllConsumeRecords(db);

  const firstConsumeMap = new Map<string, number>();
  for (const r of allRecords) {
    if (!firstConsumeMap.has(r.ownerPhone)) {
      firstConsumeMap.set(r.ownerPhone, r.time);
    }
  }

  const last30DaysRecords = allRecords.filter(
    (r) => r.time >= thirtyDaysAgoTime && r.time <= todayTime + 24 * 60 * 60 * 1000 - 1,
  );

  const customerOrderCountIn30d = new Map<string, number>();
  for (const r of last30DaysRecords) {
    customerOrderCountIn30d.set(
      r.ownerPhone,
      (customerOrderCountIn30d.get(r.ownerPhone) || 0) + 1,
    );
  }

  let newCustomers30d = 0;
  let returningCustomers30d = 0;
  let repurchaseCount30d = 0;
  let totalAmount30d = 0;
  let orderCount30d = 0;

  const processedCustomers = new Set<string>();

  for (const r of last30DaysRecords) {
    totalAmount30d += r.totalAmount;
    orderCount30d += 1;

    if (processedCustomers.has(r.ownerPhone)) continue;
    processedCustomers.add(r.ownerPhone);

    const firstConsumeTime = firstConsumeMap.get(r.ownerPhone);
    if (firstConsumeTime !== undefined && firstConsumeTime >= thirtyDaysAgoTime) {
      newCustomers30d += 1;
    } else {
      returningCustomers30d += 1;
      const orderCount = customerOrderCountIn30d.get(r.ownerPhone) || 0;
      if (orderCount >= 2) {
        repurchaseCount30d += orderCount - 1;
      }
    }
  }

  const avgOrderValue30d = orderCount30d > 0 ? totalAmount30d / orderCount30d : 0;

  const daily: Array<{
    date: string;
    newCustomers: number;
    returningCustomers: number;
    repurchases: number;
    avgOrderValue: number;
  }> = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDate(d);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

    const dayRecords = allRecords.filter((r) => r.time >= dayStart && r.time <= dayEnd);

    const dayCustomerOrderCount = new Map<string, number>();
    const dayProcessed = new Set<string>();
    let newCustomers = 0;
    let returningCustomers = 0;
    let repurchases = 0;
    let dayTotalAmount = 0;

    for (const r of dayRecords) {
      dayTotalAmount += r.totalAmount;
      const prevCount = dayCustomerOrderCount.get(r.ownerPhone) || 0;
      dayCustomerOrderCount.set(r.ownerPhone, prevCount + 1);

      if (prevCount === 0) {
        const firstConsumeTime = firstConsumeMap.get(r.ownerPhone);
        if (firstConsumeTime !== undefined && firstConsumeTime >= dayStart && firstConsumeTime <= dayEnd) {
          newCustomers += 1;
        } else {
          returningCustomers += 1;
        }
      } else {
        repurchases += 1;
      }
    }

    const dayOrderCount = dayRecords.length;
    const avgOrderValue = dayOrderCount > 0 ? dayTotalAmount / dayOrderCount : 0;

    daily.push({
      date: dateStr,
      newCustomers,
      returningCustomers,
      repurchases,
      avgOrderValue,
    });
  }

  res.json(
    success({
      newCustomers30d,
      returningCustomers30d,
      repurchaseCount30d,
      avgOrderValue30d,
      daily,
    }),
  );
});

export default router;
