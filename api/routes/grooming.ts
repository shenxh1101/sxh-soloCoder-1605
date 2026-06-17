import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/index.js';
import { success, error } from '../utils/response.js';
import type { GroomingAppointment } from '../types/index.js';

const router = Router();

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  return sA < eB && sB < eA;
}

router.get('/services', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();
  res.json(success(db.data.groomingServices));
});

router.get('/groomers', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();
  res.json(success(db.data.groomers));
});

router.get('/appointments', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  let appointments = [...db.data.groomingAppointments];

  const date = req.query.date as string | undefined;
  if (date) {
    appointments = appointments.filter((a) => a.appointmentDate === date);
  }

  res.json(success(appointments));
});

router.get('/appointments/:id', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const apt = db.data.groomingAppointments.find((a) => a.id === req.params.id);
  if (!apt) {
    res.status(404).json(error('预约不存在'));
    return;
  }

  res.json(success(apt));
});

router.post('/appointments', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const serviceIds: string[] = req.body.serviceIds || [];
  let totalPrice = 0;
  let totalDuration = 0;

  for (const sid of serviceIds) {
    const svc = db.data.groomingServices.find((s) => s.id === sid);
    if (svc) {
      totalPrice += svc.price;
      totalDuration += svc.duration;
    }
  }

  const startTime = req.body.startTime;
  const endTime = req.body.endTime || addMinutes(startTime, totalDuration);
  const groomerId = req.body.groomerId;
  const appointmentDate = req.body.appointmentDate;

  const hasConflict = db.data.groomingAppointments.some((apt) => {
    if (apt.groomerId !== groomerId) return false;
    if (apt.appointmentDate !== appointmentDate) return false;
    if (apt.status === 'cancelled' || apt.status === 'completed') return false;
    return timesOverlap(startTime, endTime, apt.startTime, apt.endTime);
  });

  if (hasConflict) {
    res.status(409).json(error('该美容师在该时段已有预约，请更换时间或美容师'));
    return;
  }

  const id = 'a' + Date.now();
  const newApt: GroomingAppointment = {
    id,
    boardingId: req.body.boardingId,
    petName: req.body.petName,
    petBreed: req.body.petBreed,
    serviceIds,
    groomerId,
    appointmentDate,
    startTime,
    endTime,
    status: req.body.status || 'pending',
    totalPrice,
    notes: req.body.notes,
  };

  db.data.groomingAppointments.push(newApt);
  db.write();

  res.json(success(newApt));
});

router.put('/appointments/:id', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const idx = db.data.groomingAppointments.findIndex((a) => a.id === req.params.id);
  if (idx === -1) {
    res.status(404).json(error('预约不存在'));
    return;
  }

  const existing = db.data.groomingAppointments[idx];
  const serviceIds: string[] = req.body.serviceIds || existing.serviceIds;

  let totalPrice = 0;
  for (const sid of serviceIds) {
    const svc = db.data.groomingServices.find((s) => s.id === sid);
    if (svc) {
      totalPrice += svc.price;
    }
  }

  db.data.groomingAppointments[idx] = {
    ...existing,
    ...req.body,
    id: existing.id,
    serviceIds,
    totalPrice,
  };
  db.write();

  res.json(success(db.data.groomingAppointments[idx]));
});

router.delete('/appointments/:id', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const idx = db.data.groomingAppointments.findIndex((a) => a.id === req.params.id);
  if (idx === -1) {
    res.status(404).json(error('预约不存在'));
    return;
  }

  const [deleted] = db.data.groomingAppointments.splice(idx, 1);
  db.write();

  res.json(success(deleted));
});

router.get('/available', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const date = req.query.date as string;
  const startTime = req.query.startTime as string;
  const duration = Number(req.query.duration);

  if (!date || !startTime || !duration) {
    res.status(400).json(error('缺少必要参数: date, startTime, duration'));
    return;
  }

  const endTime = addMinutes(startTime, duration);

  const busyGroomerIds = new Set<string>();
  for (const apt of db.data.groomingAppointments) {
    if (apt.appointmentDate !== date) continue;
    if (apt.status === 'cancelled' || apt.status === 'completed') continue;
    if (timesOverlap(startTime, endTime, apt.startTime, apt.endTime)) {
      busyGroomerIds.add(apt.groomerId);
    }
  }

  const availableGroomers = db.data.groomers.filter(
    (g) => !busyGroomerIds.has(g.id),
  );

  res.json(success(availableGroomers));
});

function generateTimeSlots(): Array<{ startTime: string; endTime: string }> {
  const slots: Array<{ startTime: string; endTime: string }> = [];
  const startMinutes = 9 * 60;
  const endMinutes = 20 * 60;
  for (let t = startMinutes; t < endMinutes; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const eh = Math.floor((t + 30) / 60);
    const em = (t + 30) % 60;
    slots.push({
      startTime: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      endTime: `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`,
    });
  }
  return slots;
}

router.get('/time-slots', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const date = req.query.date as string;
  const duration = Number(req.query.duration);

  if (!date || !duration) {
    res.status(400).json(error('缺少必要参数: date, duration'));
    return;
  }

  const allGroomers = db.data.groomers;
  const allGroomerCount = allGroomers.length;

  const dayAppointments = db.data.groomingAppointments.filter(
    (a) => a.appointmentDate === date && a.status !== 'cancelled' && a.status !== 'completed',
  );

  const groomerSchedules = allGroomers.map((g) => {
    const busySlots = dayAppointments
      .filter((a) => a.groomerId === g.id)
      .map((a) => ({
        startTime: a.startTime,
        endTime: a.endTime,
        petName: a.petName,
      }))
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    return {
      groomerId: g.id,
      groomerName: g.name,
      busySlots,
    };
  });

  function isGroomerBusyAt(groomerId: string, slotStart: string, slotEnd: string): boolean {
    for (const apt of dayAppointments) {
      if (apt.groomerId !== groomerId) continue;
      if (timesOverlap(slotStart, slotEnd, apt.startTime, apt.endTime)) {
        return true;
      }
    }
    return false;
  }

  function canAccommodate(slotStartTime: string): boolean {
    const slotStartMin = timeToMinutes(slotStartTime);
    const slotEndMin = slotStartMin + duration;
    if (slotEndMin > 20 * 60) return false;
    return true;
  }

  const allSlots = generateTimeSlots();
  const availableSlots: Array<{ startTime: string; endTime: string }> = [];
  const partialSlots: Array<{ startTime: string; endTime: string; availableCount: number }> = [];

  for (const slot of allSlots) {
    if (!canAccommodate(slot.startTime)) continue;

    const busyCount = allGroomers.filter((g) => {
      const requiredEnd = addMinutes(slot.startTime, duration);
      return isGroomerBusyAt(g.id, slot.startTime, requiredEnd);
    }).length;
    const availableCount = allGroomerCount - busyCount;

    if (availableCount === allGroomerCount) {
      availableSlots.push({
        startTime: slot.startTime,
        endTime: addMinutes(slot.startTime, duration),
      });
    } else if (availableCount > 0) {
      partialSlots.push({
        startTime: slot.startTime,
        endTime: addMinutes(slot.startTime, duration),
        availableCount,
      });
    }
  }

  res.json(
    success({
      allGroomerCount,
      availableSlots,
      partialSlots,
      groomerSchedules,
    }),
  );
});

export default router;
