import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/index.js';
import { success, error } from '../utils/response.js';
import type {
  Customer,
  CustomerDetail,
  FollowUpRecord,
  CustomerSegmentList,
  CustomerConsumptionTrend,
  CustomerPreference,
} from '../../shared/types.js';

const router = Router();

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface CustomerOverview extends Customer {
  totalSpent: number;
  petCount: number;
  lastVisit: string;
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const search = (req.query.search as string) || '';

  let customers = [...db.data.customers];

  if (search) {
    const keyword = search.toLowerCase();
    customers = customers.filter(
      (c) =>
        c.ownerName.toLowerCase().includes(keyword) ||
        c.ownerPhone.toLowerCase().includes(keyword),
    );
  }

  const result: CustomerOverview[] = customers.map((customer) => {
    const boardingOrders = db.data.boardingOrders.filter(
      (b) => b.ownerPhone === customer.ownerPhone,
    );

    const paymentsByBoarding = new Map<string, number>();
    for (const p of db.data.payments) {
      paymentsByBoarding.set(p.boardingId, p.totalAmount);
    }

    let totalSpent = 0;
    for (const b of boardingOrders) {
      const paid = paymentsByBoarding.get(b.id);
      if (paid !== undefined) {
        totalSpent += paid;
      }
    }

    const petSet = new Set<string>();
    for (const b of boardingOrders) {
      petSet.add(b.petName);
    }
    const petCount = petSet.size;

    let lastVisit = '';
    let lastTime = 0;
    for (const b of boardingOrders) {
      const dateStr = b.checkOutDate || b.checkInDate;
      const t = new Date(dateStr).getTime();
      if (t > lastTime) {
        lastTime = t;
        lastVisit = dateStr;
      }
    }
    for (const p of db.data.payments) {
      const boarding = db.data.boardingOrders.find((b) => b.id === p.boardingId);
      if (!boarding || boarding.ownerPhone !== customer.ownerPhone) continue;
      const t = new Date(p.paidAt).getTime();
      if (t > lastTime) {
        lastTime = t;
        lastVisit = formatDate(new Date(p.paidAt));
      }
    }

    return {
      ...customer,
      totalSpent,
      petCount,
      lastVisit,
    };
  });

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(success(result));
});

function buildCustomerProfile(
  customer: Customer,
  db: ReturnType<typeof getDb>['data'],
): Customer & { totalSpent: number; petCount: number; lastVisit: string } {
  const boardingOrders = db.boardingOrders.filter(
    (b) => b.ownerPhone === customer.ownerPhone,
  );

  const paymentsByBoarding = new Map<string, number>();
  for (const p of db.payments) {
    paymentsByBoarding.set(p.boardingId, p.totalAmount);
  }

  let totalSpent = 0;
  for (const b of boardingOrders) {
    const paid = paymentsByBoarding.get(b.id);
    if (paid !== undefined) {
      totalSpent += paid;
    }
  }

  const petSet = new Set<string>();
  for (const b of boardingOrders) {
    petSet.add(b.petName);
  }
  const petCount = petSet.size;

  let lastVisit = '';
  let lastTime = 0;
  for (const b of boardingOrders) {
    const dateStr = b.checkOutDate || b.checkInDate;
    const t = new Date(dateStr).getTime();
    if (t > lastTime) {
      lastTime = t;
      lastVisit = dateStr;
    }
  }
  for (const p of db.payments) {
    const boarding = db.boardingOrders.find((b) => b.id === p.boardingId);
    if (!boarding || boarding.ownerPhone !== customer.ownerPhone) continue;
    const t = new Date(p.paidAt).getTime();
    if (t > lastTime) {
      lastTime = t;
      lastVisit = formatDate(new Date(p.paidAt));
    }
  }

  return {
    ...customer,
    totalSpent,
    petCount,
    lastVisit,
  };
}

router.get('/follow-ups/upcoming', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const today = new Date();
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in7DaysStr = formatDate(in7Days);
  const todayStr = formatDate(today);

  const upcoming = db.data.followUps
    .filter((f) => f.status === 'pending' && f.followDate <= in7DaysStr && f.followDate >= todayStr)
    .map((f) => {
      const owner = db.data.customers.find((c) => c.ownerPhone === f.ownerPhone);
      return {
        ...f,
        ownerName: owner?.ownerName || '',
      };
    })
    .sort((a, b) => a.followDate.localeCompare(b.followDate));

  res.json(success(upcoming));
});

router.get('/segments/lists', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const now = new Date();
  const nowMs = now.getTime();
  const sixtyDaysAgo = nowMs - 60 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = nowMs - 30 * 24 * 60 * 60 * 1000;

  const inactive60dPhones = new Set<string>();
  const repurchase30dPhones = new Set<string>();

  const paymentDatesByPhone = new Map<string, Set<string>>();
  const hasHistoryPhones = new Set<string>();

  for (const p of db.data.payments) {
    const boarding = db.data.boardingOrders.find((b) => b.id === p.boardingId);
    if (!boarding) continue;
    const phone = boarding.ownerPhone;
    if (!paymentDatesByPhone.has(phone)) {
      paymentDatesByPhone.set(phone, new Set());
    }
    const paidDate = formatDate(new Date(p.paidAt));
    paymentDatesByPhone.get(phone)!.add(paidDate);
    hasHistoryPhones.add(phone);
  }

  for (const b of db.data.boardingOrders) {
    if (b.status === 'completed') {
      hasHistoryPhones.add(b.ownerPhone);
    }
  }

  for (const [phone, dateSet] of paymentDatesByPhone.entries()) {
    const lastPaymentDate = Array.from(dateSet)
      .map((d) => new Date(d).getTime())
      .sort((a, b) => b - a)[0];

    if (lastPaymentDate < sixtyDaysAgo && hasHistoryPhones.has(phone)) {
      inactive60dPhones.add(phone);
    }

    const recentDates = Array.from(dateSet).filter(
      (d) => new Date(d).getTime() >= thirtyDaysAgo,
    );
    if (recentDates.length >= 2) {
      repurchase30dPhones.add(phone);
    }
  }

  for (const phone of hasHistoryPhones) {
    const dateSet = paymentDatesByPhone.get(phone);
    if (dateSet && dateSet.size > 0) continue;

    let lastCompletedDate = 0;
    for (const b of db.data.boardingOrders) {
      if (b.ownerPhone === phone && b.status === 'completed') {
        const d = new Date(b.checkOutDate || b.checkInDate).getTime();
        if (d > lastCompletedDate) lastCompletedDate = d;
      }
    }
    if (lastCompletedDate > 0 && lastCompletedDate < sixtyDaysAgo) {
      inactive60dPhones.add(phone);
    }
  }

  const inactive60d = db.data.customers
    .filter((c) => inactive60dPhones.has(c.ownerPhone))
    .map((c) => buildCustomerProfile(c, db.data));

  const repurchase30d = db.data.customers
    .filter((c) => repurchase30dPhones.has(c.ownerPhone))
    .map((c) => buildCustomerProfile(c, db.data));

  const result: CustomerSegmentList = {
    inactive60d,
    repurchase30d,
  };

  res.json(success(result));
});

router.put('/follow-ups/:id', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const { id } = req.params;
  const idx = db.data.followUps.findIndex((f) => f.id === id);

  if (idx === -1) {
    res.status(404).json(error('回访记录不存在'));
    return;
  }

  const { status, note, handledAt } = req.body;

  if (status !== undefined) {
    db.data.followUps[idx].status = status;
    if (status === 'done' && !db.data.followUps[idx].handledAt && !handledAt) {
      db.data.followUps[idx].handledAt = new Date().toISOString();
    }
  }
  if (note !== undefined) {
    db.data.followUps[idx].note = note;
  }
  if (handledAt !== undefined) {
    db.data.followUps[idx].handledAt = handledAt;
  }

  db.write();

  res.json(success(db.data.followUps[idx]));
});

router.post('/:phone/follow-ups', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const { phone } = req.params;

  const customer = db.data.customers.find((c) => c.ownerPhone === phone);
  if (!customer) {
    res.status(404).json(error('客户不存在'));
    return;
  }

  const { followDate, reason, note } = req.body;

  if (!followDate || !reason) {
    res.status(400).json(error('缺少必填字段: followDate, reason'));
    return;
  }

  const newFollowUp: FollowUpRecord = {
    id: 'f' + Date.now(),
    ownerPhone: phone,
    followDate,
    reason,
    status: 'pending',
    note,
    createdAt: new Date().toISOString(),
  };

  db.data.followUps.push(newFollowUp);
  db.write();

  res.json(success(newFollowUp));
});

router.get('/:phone/trend', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const { phone } = req.params;

  const customer = db.data.customers.find((c) => c.ownerPhone === phone);
  if (!customer) {
    res.status(404).json(error('客户不存在'));
    return;
  }

  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const trend: CustomerConsumptionTrend[] = months.map((month) => ({
    month,
    totalAmount: 0,
    boardingCount: 0,
    groomingCount: 0,
  }));

  const trendMap = new Map(trend.map((t) => [t.month, t]));

  const boardingIds = new Set<string>();

  for (const b of db.data.boardingOrders) {
    if (b.ownerPhone !== phone) continue;
    boardingIds.add(b.id);
    if (b.status === 'completed') {
      const monthKey = (b.checkOutDate || b.checkInDate).slice(0, 7);
      const t = trendMap.get(monthKey);
      if (t) t.boardingCount++;
    }
  }

  for (const p of db.data.payments) {
    const boarding = db.data.boardingOrders.find((b) => b.id === p.boardingId);
    if (!boarding || boarding.ownerPhone !== phone) continue;
    const monthKey = formatDate(new Date(p.paidAt)).slice(0, 7);
    const t = trendMap.get(monthKey);
    if (t) t.totalAmount += p.totalAmount;
  }

  const groomingCompletedByMonth = new Map<string, number>();
  const serviceCounter = new Map<string, number>();
  let totalCompletedBoarding = 0;
  let totalCompletedGrooming = 0;
  let totalSpendForAvg = 0;
  let paymentCount = 0;

  for (const a of db.data.groomingAppointments) {
    let aptPhone: string | undefined;
    if (a.ownerPhone) {
      aptPhone = a.ownerPhone;
    } else if (a.boardingId) {
      const b = db.data.boardingOrders.find((bo) => bo.id === a.boardingId);
      if (b) aptPhone = b.ownerPhone;
    }
    if (aptPhone !== phone) continue;

    if (a.status === 'completed') {
      totalCompletedGrooming++;
      const monthKey = a.appointmentDate.slice(0, 7);
      groomingCompletedByMonth.set(
        monthKey,
        (groomingCompletedByMonth.get(monthKey) || 0) + 1,
      );
      for (const sid of a.serviceIds) {
        const svc = db.data.groomingServices.find((s) => s.id === sid);
        if (svc) {
          serviceCounter.set(svc.name, (serviceCounter.get(svc.name) || 0) + 1);
        }
      }
    }
  }

  for (const [monthKey, count] of groomingCompletedByMonth.entries()) {
    const t = trendMap.get(monthKey);
    if (t) t.groomingCount = count;
  }

  for (const b of db.data.boardingOrders) {
    if (b.ownerPhone === phone && b.status === 'completed') {
      totalCompletedBoarding++;
    }
  }

  for (const p of db.data.payments) {
    const boarding = db.data.boardingOrders.find((b) => b.id === p.boardingId);
    if (!boarding || boarding.ownerPhone !== phone) continue;
    totalSpendForAvg += p.totalAmount;
    paymentCount++;
  }

  const topServices = Array.from(serviceCounter.entries())
    .map(([serviceName, count]) => ({ serviceName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const preference: CustomerPreference = {
    topServices,
    averageSpend: paymentCount > 0 ? totalSpendForAvg / paymentCount : 0,
    totalVisits: totalCompletedBoarding + totalCompletedGrooming,
  };

  res.json(success({ trend, preference }));
});

router.get('/:phone', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const { phone } = req.params;

  const customer = db.data.customers.find((c) => c.ownerPhone === phone);
  if (!customer) {
    res.status(404).json(error('客户不存在'));
    return;
  }

  const boardingHistory = db.data.boardingOrders.filter(
    (b) => b.ownerPhone === phone,
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const petMap = new Map<string, { petName: string; petBreed: string; petType: 'dog' | 'cat' | 'other' }>();
  for (const b of boardingHistory) {
    if (!petMap.has(b.petName)) {
      petMap.set(b.petName, {
        petName: b.petName,
        petBreed: b.petBreed,
        petType: b.petType,
      });
    }
  }
  const pets = Array.from(petMap.values());

  const boardingIds = new Set(boardingHistory.map((b) => b.id));
  const groomingHistorySet = new Map<string, typeof db.data.groomingAppointments[number]>();

  for (const a of db.data.groomingAppointments) {
    if (a.boardingId && boardingIds.has(a.boardingId)) {
      groomingHistorySet.set(a.id, a);
    }
    if (a.ownerPhone === phone) {
      groomingHistorySet.set(a.id, a);
    }
  }

  const groomingHistory = Array.from(groomingHistorySet.values()).sort(
    (a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime(),
  );

  const followUps = db.data.followUps
    .filter((f) => f.ownerPhone === phone)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  let totalSpent = 0;
  let lastVisit = '';
  let lastTime = 0;

  for (const p of db.data.payments) {
    const boarding = db.data.boardingOrders.find((b) => b.id === p.boardingId);
    if (!boarding || boarding.ownerPhone !== phone) continue;
    totalSpent += p.totalAmount;
    const t = new Date(p.paidAt).getTime();
    if (t > lastTime) {
      lastTime = t;
      lastVisit = formatDate(new Date(p.paidAt));
    }
  }

  for (const b of boardingHistory) {
    if (b.status !== 'completed') continue;
    const dateStr = b.checkOutDate || b.checkInDate;
    const t = new Date(dateStr).getTime();
    if (t > lastTime) {
      lastTime = t;
      lastVisit = dateStr;
    }
  }

  const detail: CustomerDetail = {
    ...customer,
    pets,
    petCount: pets.length,
    boardingHistory,
    groomingHistory,
    followUps,
    totalSpent,
    lastVisit,
  };

  res.json(success(detail));
});

router.put('/:phone', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const { phone } = req.params;

  const idx = db.data.customers.findIndex((c) => c.ownerPhone === phone);
  if (idx === -1) {
    res.status(404).json(error('客户不存在'));
    return;
  }

  const { tags, notes } = req.body;

  if (tags !== undefined) {
    db.data.customers[idx].tags = tags;
  }
  if (notes !== undefined) {
    db.data.customers[idx].notes = notes;
  }

  db.write();

  res.json(success(db.data.customers[idx]));
});

export default router;
