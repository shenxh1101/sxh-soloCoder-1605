import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/index.js';
import { success, error } from '../utils/response.js';
import { calculateFee } from '../services/feeService.js';
import type { Payment } from '../types/index.js';
import { ensureCustomer } from '../utils/customer.js';

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

  const boardingOrder = db.data.boardingOrders[boardingIdx];
  ensureCustomer(db, boardingOrder.ownerPhone, boardingOrder.ownerName);

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
    (a) => a.boardingId === boardingId && a.status !== 'cancelled',
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

  let parsedRemarksNotes: string | undefined;

  if (groomingItems.length === 0 && payment.groomingFee > 0 && payment.remarks) {
    const knownServices: Array<{ name: string; price: number }> = [
      { name: '基础洗澡', price: 80 },
      { name: '精致洗护', price: 150 },
      { name: '美容造型', price: 200 },
      { name: 'SPA护理', price: 180 },
      { name: '局部修剪', price: 60 },
      { name: '药浴', price: 120 },
    ];

    const matchedServices: Array<{ name: string; price: number }> = [];
    for (const svc of knownServices) {
      if (payment.remarks.includes(svc.name)) {
        matchedServices.push(svc);
      }
    }

    if (matchedServices.length > 0) {
      const matchedTotal = matchedServices.reduce((sum, s) => sum + s.price, 0);
      if (matchedTotal <= payment.groomingFee && matchedTotal > 0) {
        for (const s of matchedServices) {
          groomingItems.push({
            serviceName: s.name,
            price: s.price,
          });
        }
        const remaining = payment.groomingFee - matchedTotal;
        if (remaining > 0) {
          groomingItems.push({
            serviceName: '其他美容服务',
            price: remaining,
          });
        }
      } else {
        const avgPrice = Math.floor(payment.groomingFee / matchedServices.length);
        const remainder = payment.groomingFee - avgPrice * matchedServices.length;
        for (let i = 0; i < matchedServices.length; i++) {
          groomingItems.push({
            serviceName: matchedServices[i].name,
            price: i === 0 ? avgPrice + remainder : avgPrice,
          });
        }
      }
    } else {
      let remarksText = payment.remarks;
      remarksText = remarksText.replace(/寄养\d+天[+]?/g, '').trim();
      remarksText = remarksText.replace(/散客[:：]?[^+]*[+]?/g, '').trim();
      remarksText = remarksText.replace(/^[+]/, '').trim();

      if (remarksText) {
        parsedRemarksNotes = remarksText;
        groomingItems.push({
          serviceName: `美容服务（备注：${remarksText}）`,
          price: payment.groomingFee,
        });
      } else {
        groomingItems.push({
          serviceName: `美容服务（备注）`,
          price: payment.groomingFee,
        });
      }
    }
  } else if (groomingItems.length === 0 && payment.groomingFee > 0) {
    groomingItems.push({
      serviceName: `美容服务（备注）`,
      price: payment.groomingFee,
    });
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
      remarksFromPayment: payment.remarks,
      parsedRemarksNotes,
    }),
  );
});

export default router;
