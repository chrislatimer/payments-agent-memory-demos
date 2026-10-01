/**
 * The bank's systems of record, as agent tools.
 *
 * These are deliberately dumb: they return what an issuer actually holds and
 * nothing more. In particular `lookup_merchant_descriptor` resolves a
 * descriptor to a legal entity and stops there, because no issuer system
 * contains the brand behind a merchant of record. That limit is the premise
 * of the demo and must not be "helpfully" papered over.
 */
import customers from '@/data/seed/customers.json';
import merchants from '@/data/seed/merchants.json';
import descriptors from '@/data/seed/descriptors.json';
import transactions from '@/data/seed/transactions.json';
import disputes from '@/data/seed/disputes.json';
import reasonCodes from '@/data/seed/reason_codes.json';
import policies from '@/data/seed/policies.json';
import type { Customer, Merchant, Transaction, Dispute, ReasonCode, DisputePolicy } from './types';

const C = customers as Customer[];
const M = merchants as Merchant[];
const D = descriptors as { descriptor: string; merchant_id: string }[];
const T = transactions as Transaction[];
const S = disputes as Dispute[];
const R = reasonCodes as ReasonCode[];
const P = policies as DisputePolicy[];

export const bankTools = {
  get_customer: ({ customer_id }: { customer_id: string }) =>
    C.find((x) => x.customer_id === customer_id) ?? { error: 'not_found' },

  get_dispute: ({ dispute_id }: { dispute_id: string }) =>
    S.find((x) => x.dispute_id === dispute_id) ?? { error: 'not_found' },

  get_transaction: ({ transaction_id }: { transaction_id: string }) =>
    T.find((x) => x.transaction_id === transaction_id) ?? { error: 'not_found' },

  /** Date-windowed history. The haystack the hypothesis gets tested against. */
  get_transactions: ({ customer_id, from, to }: { customer_id: string; from: string; to: string }) => {
    const rows = T.filter((x) => x.customer_id === customer_id && x.posted_date >= from && x.posted_date <= to);
    return { count: rows.length, from, to, transactions: rows };
  },

  /**
   * Resolves descriptor -> legal entity. Returns no brand, because the bank
   * holds none. `merchant_of_record: true` is the only hint available.
   */
  lookup_merchant_descriptor: ({ descriptor }: { descriptor: string }) => {
    const hit = D.find((x) => x.descriptor.toUpperCase() === descriptor.trim().toUpperCase());
    if (!hit) return { error: 'descriptor_not_found', descriptor };
    const m = M.find((x) => x.merchant_id === hit.merchant_id)!;
    return {
      descriptor: hit.descriptor,
      merchant_id: m.merchant_id,
      legal_name: m.legal_name,
      mcc: m.mcc,
      mcc_description: m.mcc_description,
      city: m.city,
      state: m.state,
      merchant_of_record: m.merchant_of_record,
      note: m.merchant_of_record
        ? 'This entity bills on behalf of other parties. The bank holds no record of which brand a given charge relates to.'
        : undefined,
    };
  },

  get_merchant: ({ merchant_id }: { merchant_id: string }) =>
    M.find((x) => x.merchant_id === merchant_id) ?? { error: 'not_found' },

  get_customer_dispute_history: ({ customer_id }: { customer_id: string }) => {
    const rows = S.filter((x) => x.customer_id === customer_id);
    return { count: rows.length, disputes: rows };
  },

  get_dispute_policy: ({ reason_code_family }: { reason_code_family: string }) => {
    const pol = P.filter((x) => x.reason_code_family === reason_code_family.toUpperCase());
    return { policies: pol, reason_codes: R.filter((x) => x.family === reason_code_family.toUpperCase()) };
  },

  /** Ship-to vs addresses on file. The guardrail case turns on this. */
  compare_ship_to_addresses: ({ customer_id, postal }: { customer_id: string; postal: string }) => {
    const cust = C.find((x) => x.customer_id === customer_id);
    if (!cust) return { error: 'not_found' };
    const match = cust.addresses.some((a) => a.postal === postal);
    return { postal, matches_address_on_file: match, addresses_on_file: cust.addresses.map((a) => a.postal) };
  },
};

export type BankToolName = keyof typeof bankTools;

export function callBankTool(name: string, args: Record<string, unknown>) {
  const fn = (bankTools as Record<string, (a: never) => unknown>)[name];
  if (!fn) return { error: `unknown_tool:${name}` };
  return fn(args as never);
}
