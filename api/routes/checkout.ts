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

function ceilDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const diffMs = end.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.ceil(diffDays));
}

router.get('/completed', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const result = db.data.payments.map((payment) => {
    const boarding = db.data.boardingOrders.find((b) => b.id === payment.boardingId);
    if (!boarding) return null;

    const checkOutDate = boarding.checkOutDate || getToday();
    const boardingDays = ceilDays(boarding.checkInDate, checkOutDate);

    const appointments = db.data.groomingAppointments.filter(
      (a) => a.boardingId === boarding.id && a.status !== 'cancelled',
    );
    const groomingItemsCount = appointments.reduce((sum, apt) => sum + apt.serviceIds.length, 0);

    return {
      boardingId: boarding.id,
      petName: boarding.petName,
      petBreed: boarding.petBreed,
      petType: boarding.petType,
      ownerName: boarding.ownerName,
      ownerPhone: boarding.ownerPhone,
      checkInDate: boarding.checkInDate,
      checkOutDate,
      boardingDays,
      groomingItemsCount,
      payment,
    };
  }).filter(Boolean);

  res.json(success(result));
});

router.get('/payment/:boardingId', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const payment = db.data.payments.find((p) => p.boardingId === req.params.boardingId);

  if (!payment) {
    res.status(404).json(error('未找到支付记录'));
    return;
  }

  res.json(success(payment));
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

router.get('/receipt/:boardingId', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const { boardingId } = req.params;

  const boarding = db.data.boardingOrders.find((b) => b.id === boardingId);
  if (!boarding) {
    res.status(404).json(error('订单不存在'));
    return;
  }

  const payment = db.data.payments.find((p) => p.boardingId === boardingId);
  if (!payment) {
    res.status(404).json(error('尚未支付，无法生成小票'));
    return;
  }

  const appointments = db.data.groomingAppointments.filter(
    (a) => a.boardingId === boardingId && a.status === 'completed',
  );

  const groomingItems: Array<{ serviceName: string; price: number }> = [];
  for (const apt of appointments) {
    for (const serviceId of apt.serviceIds) {
      const svc = db.data.groomingServices.find((s) => s.id === serviceId);
      if (svc) {
        groomingItems.push({ serviceName: svc.name, price: svc.price });
      }
    }
  }

  const checkOutDate = boarding.checkOutDate || getToday();
  const boardingDays = ceilDays(boarding.checkInDate, checkOutDate);

  res.json(
    success({
      boardingId,
      petName: boarding.petName,
      petBreed: boarding.petBreed,
      petType: boarding.petType,
      ownerName: boarding.ownerName,
      ownerPhone: boarding.ownerPhone,
      checkInDate: boarding.checkInDate,
      checkOutDate,
      boardingDays,
      dailyPrice: boarding.dailyPrice,
      boardingFee: payment.boardingFee,
      groomingItems,
      groomingFee: payment.groomingFee,
      discount: payment.discount,
      totalAmount: payment.totalAmount,
      paymentMethod: payment.paymentMethod,
      paidAt: payment.paidAt,
      remarks: payment.remarks,
    }),
  );
});

export default router;
