import type { LowSync } from 'lowdb';
import type { Database } from '../db/types.js';
import type { Customer } from '../../shared/types.js';

export function ensureCustomer(
  db: LowSync<Database>,
  ownerPhone: string,
  ownerName: string,
): void {
  if (!ownerPhone || !ownerName) return;

  const exists = db.data.customers.some((c) => c.ownerPhone === ownerPhone);
  if (exists) return;

  const newCustomer: Customer = {
    ownerPhone,
    ownerName,
    tags: [],
    notes: '',
    createdAt: new Date().toISOString(),
  };

  db.data.customers.push(newCustomer);
}

export default ensureCustomer;
