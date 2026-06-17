import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/index.js';
import { success, error } from '../utils/response.js';
import { calculateFee } from '../services/feeService.js';
import type { Payment } from '../types/index.js';

const router = Router();

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

router.get('/pending', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const paidBoardingIds = new Set(db.data.payments.map((p) => p.boardingId));

  const pending = db.data.boardingOrders.filter(
    (b) => b.status === 'active' && !paidBoardingIds.has(b.id),
  );

  res.json(success(pending));
});

router.get('/completed', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const result = db.data.payments.map((payment) => {
    const boarding = db.data.boardingOrders.find((b) => b.id === payment.boardingId);
    return {
      ...boarding,
      payment,
    };
  });

  res.json(success(result));
});

router.get('/calculate/:id', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  const fee = await calculateFee(req.params.id, db);

  if (!fee) {
    res.status(404).json(error('寄养订单不存在'));
    return;
  }

  res.json(success(fee));
});

router.post('/pay', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const { boardingId, discount, paymentMethod, remarks } = req.body;

  const fee = await calculateFee(boardingId, db);
  if (!fee) {
    res.status(404).json(error('寄养订单不存在'));
    return;
  }

  const boardingIdx = db.data.boardingOrders.findIndex((b) => b.id === boardingId);
  if (boardingIdx === -1) {
    res.status(404).json(error('寄养订单不存在'));
    return;
  }

  const finalDiscount = Number(discount) || 0;
  const totalAmount = fee.boardingFee + fee.groomingFee - finalDiscount;

  const paymentId = 'p' + Date.now();
  const payment: Payment = {
    id: paymentId,
    boardingId,
    boardingFee: fee.boardingFee,
    groomingFee: fee.groomingFee,
    discount: finalDiscount,
    totalAmount,
    paymentMethod,
    paidAt: new Date().toISOString(),
    remarks,
  };

  db.data.payments.push(payment);

  db.data.boardingOrders[boardingIdx] = {
    ...db.data.boardingOrders[boardingIdx],
    status: 'completed',
    checkOutDate: getToday(),
  };

  db.write();

  res.json(success({ payment, boarding: db.data.boardingOrders[boardingIdx] }));
});

export default router;
