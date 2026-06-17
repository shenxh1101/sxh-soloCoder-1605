import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/index.js';
import { success, error } from '../utils/response.js';
import type { CareRecord } from '../types/index.js';

const router = Router();

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentTime(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  let records = [...db.data.careRecords];

  const boardingId = req.query.boardingId as string | undefined;
  if (boardingId) {
    records = records.filter((r) => r.boardingId === boardingId);
  }

  records.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.time.localeCompare(a.time);
  });

  res.json(success(records));
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const id = 'c' + Date.now();
  const newRecord: CareRecord = {
    id,
    boardingId: req.body.boardingId,
    date: req.body.date || getToday(),
    type: req.body.type,
    time: req.body.time || getCurrentTime(),
    note: req.body.note,
    operator: req.body.operator,
  };

  db.data.careRecords.push(newRecord);
  db.write();

  res.json(success(newRecord));
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const db = getDb();
  db.read();

  const idx = db.data.careRecords.findIndex((r) => r.id === req.params.id);
  if (idx === -1) {
    res.status(404).json(error('照护记录不存在'));
    return;
  }

  const [deleted] = db.data.careRecords.splice(idx, 1);
  db.write();

  res.json(success(deleted));
});

export default router;
