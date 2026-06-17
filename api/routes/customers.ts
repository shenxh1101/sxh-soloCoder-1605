import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/index.js';
import { success, error } from '../utils/response.js';
import type { Customer, CustomerDetail } from '../../shared/types.js';

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
  const groomingHistory = db.data.groomingAppointments
    .filter((a) => a.boardingId && boardingIds.has(a.boardingId))
    .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());

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
