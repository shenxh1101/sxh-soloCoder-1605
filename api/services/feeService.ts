import type { LowSync } from 'lowdb';
import type { Database } from '../db/types.js';
import type { FeeCalculation } from '../types/index.js';

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

export async function calculateFee(
  boardingId: string,
  db: LowSync<Database>,
): Promise<FeeCalculation | null> {
  db.read();

  const boarding = db.data.boardingOrders.find((b) => b.id === boardingId);
  if (!boarding) {
    return null;
  }

  const endDate = boarding.status === 'completed' && boarding.checkOutDate
    ? boarding.checkOutDate
    : getToday();

  const boardingDays = ceilDays(boarding.checkInDate, endDate);
  const boardingFee = boardingDays * boarding.dailyPrice;

  const appointments = db.data.groomingAppointments.filter(
    (a) => a.boardingId === boardingId && a.status !== 'cancelled',
  );

  let groomingFee = 0;
  const groomingItems: Array<{ name: string; price: number }> = [];

  for (const apt of appointments) {
    groomingFee += apt.totalPrice;
    for (const serviceId of apt.serviceIds) {
      const svc = db.data.groomingServices.find((s) => s.id === serviceId);
      if (svc) {
        groomingItems.push({ name: svc.name, price: svc.price });
      }
    }
  }

  const discount = 0;
  const totalAmount = boardingFee + groomingFee - discount;

  return {
    boardingDays,
    boardingFee,
    groomingFee,
    discount,
    totalAmount,
    groomingItems,
  };
}
