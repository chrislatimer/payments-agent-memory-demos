import transactions from '@/data/seed/transactions.json';
import customers from '@/data/seed/customers.json';
import disputes from '@/data/seed/disputes.json';
import type { Transaction, Customer, Dispute } from './types';

export type StatementRow = {
  transaction_id: string;
  posted_date: string;
  descriptor: string;
  amount: number;
  channel: string;
  /** The case that already exists for this charge, if the demo opens one. */
  dispute_id?: string;
};

/** The customer-facing statement: newest first, raw descriptors, no brand gloss. */
export function getStatement(customer_id: string, limit = 18) {
  const cust = (customers as Customer[]).find((c) => c.customer_id === customer_id)!;
  const open = (disputes as Dispute[]).filter((d) => d.customer_id === customer_id);
  const reported = new Set(open.map((d) => d.transaction_id));
  const rows: StatementRow[] = (transactions as Transaction[])
    .filter((t) => t.customer_id === customer_id)
    .sort((a, b) => {
      // Anything the customer has reported sorts to the top. Banks surface
      // disputed items this way, and it keeps the charge the demo is about
      // on screen instead of fourteen rows down.
      const ra = reported.has(a.transaction_id) ? 1 : 0;
      const rb = reported.has(b.transaction_id) ? 1 : 0;
      if (ra !== rb) return rb - ra;
      return b.posted_date.localeCompare(a.posted_date) || b.transaction_id.localeCompare(a.transaction_id);
    })
    .slice(0, limit)
    .map((t) => ({
      transaction_id: t.transaction_id,
      posted_date: t.posted_date,
      descriptor: t.descriptor,
      amount: t.amount,
      channel: t.channel,
      dispute_id: open.find((d) => d.transaction_id === t.transaction_id)?.dispute_id,
    }));
  // Every card-on-file subscription this cardholder has. A needless reissue
  // breaks all of them, which is the cost the cold path makes visible.
  const subscriptions = [
    ...new Set(
      (transactions as Transaction[])
        .filter((t) => t.customer_id === customer_id && t.recurring)
        .map((t) => t.descriptor),
    ),
  ];
  return { customer: cust, rows, subscriptions };
}
