/**
 * Business banking wire tools.
 *
 * Note what the bank can and cannot tell you. `get_return_code` knows the
 * beneficiary bank rejected the payment for incomplete beneficiary details,
 * and explicitly does not know which field. That is true of real return codes
 * and it is why the demo needs memory.
 */
import business from '@/data/seed/business_customers.json';
import beneficiaries from '@/data/seed/beneficiaries.json';
import wires from '@/data/seed/wires.json';
import returnCodes from '@/data/seed/return_codes.json';
import corridors from '@/data/seed/corridor_requirements.json';
import deleted from '@/data/seed/deleted_beneficiaries.json';
import type { BusinessCustomer, Beneficiary, Wire, ReturnCode, CorridorRequirement } from './wire-types';

const B = business as BusinessCustomer[];
const BEN = beneficiaries as Beneficiary[];
const W = wires as Wire[];
const RC = returnCodes as ReturnCode[];
const CR = corridors as CorridorRequirement[];
const DEL = deleted as { beneficiary_id: string; name: string; deleted_date: string; deleted_by: string }[];

export const wireTools = {
  get_wire: ({ wire_id }: { wire_id: string }) => W.find((w) => w.wire_id === wire_id) ?? { error: 'not_found' },

  get_wire_history: ({ customer_id }: { customer_id: string }) => {
    const rows = W.filter((w) => w.customer_id === customer_id)
      .sort((a, b) => b.value_date.localeCompare(a.value_date));
    return { count: rows.length, wires: rows };
  },

  get_beneficiary: ({ beneficiary_id }: { beneficiary_id: string }) => {
    const hit = BEN.find((b) => b.beneficiary_id === beneficiary_id);
    if (hit) return hit;
    // Deleted records keep their identifier so historical wires resolve. The
    // address they carried is gone, which is why the bank cannot say what
    // made an earlier payment succeed.
    const gone = DEL.find((d) => d.beneficiary_id === beneficiary_id);
    if (gone) return { error: 'record_deleted', beneficiary_id, name: gone.name, deleted_date: gone.deleted_date, deleted_by: gone.deleted_by, note: 'Beneficiary record deleted. Address details were not retained.' };
    return { error: 'not_found' };
  },

  /** Lets the agent notice the same counterparty exists twice. */
  list_beneficiaries: ({ customer_id }: { customer_id: string }) => {
    const rows = BEN.filter((b) => b.customer_id === customer_id);
    return { count: rows.length, beneficiaries: rows };
  },

  get_return_code: ({ code }: { code: string }) =>
    RC.find((r) => r.code === code.trim().toUpperCase()) ?? { error: 'not_found' },

  get_corridor_requirements: ({ corridor }: { corridor: string }) =>
    CR.find((c) => c.corridor.toUpperCase() === corridor.trim().toUpperCase()) ?? { error: 'not_found' },

  get_business_customer: ({ customer_id }: { customer_id: string }) =>
    B.find((c) => c.customer_id === customer_id) ?? { error: 'not_found' },

  /**
   * Prepares a corrected wire. Prepares only: nothing is submitted, and the
   * customer still has to review and send it. An agent that could move
   * $420,000 on its own conclusion is not a demo a bank wants to watch.
   */
  prepare_corrected_wire: (args: Record<string, unknown>) => {
    const source = W.find((w) => w.wire_id === String(args.source_wire_id ?? ''));
    if (!source) return { error: 'source_wire_not_found' };
    return {
      status: 'DRAFT_PREPARED',
      submitted: false,
      draft: {
        based_on: source.wire_id,
        amount: source.amount,
        debit_currency: source.debit_currency,
        credit_currency: source.credit_currency,
        corridor: source.corridor,
        beneficiary_name: args.beneficiary_name,
        beneficiary_tax_id: args.beneficiary_tax_id,
        beneficiary_account: args.beneficiary_account,
        beneficiary_bank: args.beneficiary_bank,
        swift: args.swift,
        address: {
          line1: args.address_line1,
          neighbourhood: args.address_neighbourhood,
          postal_code: args.address_postal_code,
          city: args.address_city,
          country: args.address_country,
        },
        corrected_fields: args.corrected_fields,
      },
      note: 'Draft prepared for customer review. Not submitted.',
    };
  },
};

export function callWireTool(name: string, args: Record<string, unknown>) {
  const fn = (wireTools as Record<string, (a: never) => unknown>)[name];
  if (!fn) return { error: `unknown_tool:${name}` };
  return fn(args as never);
}

/** The customer-facing payments view for the portal page. */
export function getWireView(customer_id: string) {
  const customer = B.find((c) => c.customer_id === customer_id)!;
  const rows = W.filter((w) => w.customer_id === customer_id)
    .sort((a, b) => b.value_date.localeCompare(a.value_date))
    .map((w) => {
      const ben = BEN.find((b) => b.beneficiary_id === w.beneficiary_id);
      const gone = DEL.find((d) => d.beneficiary_id === w.beneficiary_id);
      return { ...w, beneficiary_name: ben?.name ?? gone?.name ?? w.beneficiary_id };
    });
  return { customer, rows };
}
