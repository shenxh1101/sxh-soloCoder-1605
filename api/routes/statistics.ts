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

export default router;
