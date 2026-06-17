import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/index.js';
import { success, error } from '../utils/response.js';
import type { BoardingOrder } from '../types/index.js';
import { ensureCustomer } from '../utils/customer.js';

const router = Router();

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  let orders = [...db.data.boardingOrders];

  const status = req.query.status as 'active' | 'completed' | undefined;
  if (status) {
    orders = orders.filter((o) => o.status === status);
  }

  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(success(orders));
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const order = db.data.boardingOrders.find((o) => o.id === req.params.id);
  if (!order) {
    res.status(404).json(error('寄养订单不存在'));
    return;
  }

  res.json(success(order));
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const id = 'b' + Date.now();
  const newOrder: BoardingOrder = {
    id,
    petName: req.body.petName,
    petBreed: req.body.petBreed,
    petType: req.body.petType,
    ownerName: req.body.ownerName,
    ownerPhone: req.body.ownerPhone,
    checkInDate: req.body.checkInDate || getToday(),
    checkOutDate: req.body.checkOutDate,
    plannedDays: req.body.plannedDays,
    dailyPrice: req.body.dailyPrice,
    feedingInstructions: req.body.feedingInstructions || '',
    specialNeeds: req.body.specialNeeds || '',
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  db.data.boardingOrders.push(newOrder);
  ensureCustomer(db, newOrder.ownerPhone, newOrder.ownerName);
  db.write();

  res.json(success(newOrder));
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const idx = db.data.boardingOrders.findIndex((o) => o.id === req.params.id);
  if (idx === -1) {
    res.status(404).json(error('寄养订单不存在'));
    return;
  }

  db.data.boardingOrders[idx] = {
    ...db.data.boardingOrders[idx],
    ...req.body,
    id: db.data.boardingOrders[idx].id,
    createdAt: db.data.boardingOrders[idx].createdAt,
  };
  db.write();

  res.json(success(db.data.boardingOrders[idx]));
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const idx = db.data.boardingOrders.findIndex((o) => o.id === req.params.id);
  if (idx === -1) {
    res.status(404).json(error('寄养订单不存在'));
    return;
  }

  const [deleted] = db.data.boardingOrders.splice(idx, 1);
  db.write();

  res.json(success(deleted));
});

export default router;
