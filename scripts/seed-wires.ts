/**
 * Demo #4 — wire transfer data. Entirely authored: every record carries
 * narrative weight, so none of it is generated.
 *
 * The spine: Brightmoor keyed the same beneficiary twice. The 2025 record is
 * complete and its wire cleared. The 2026 record, created by a different
 * person out of a new AP export, lost the neighbourhood and postal code —
 * and its wire was returned. Nothing in the bank says those two records are
 * the same counterparty, or that the missing fields are why.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { BusinessCustomer, Beneficiary, Wire, ReturnCode, CorridorRequirement } from '../lib/bank/wire-types';

const business_customers: BusinessCustomer[] = [
  {
    customer_id: 'CORP-014',
    legal_name: 'Brightmoor Industrial Supply Inc',
    users: [
      { user_id: 'U-331', name: 'Renata Alves', role: 'Treasury Manager' },
      { user_id: 'U-402', name: 'Doug Pyne', role: 'Accounts Payable' },
    ],
  },
];

const beneficiaries: Beneficiary[] = [
  {
    // The record Renata keyed in 2025 and fixed in March. Still on file: the
    // August migration created a duplicate rather than replacing it, which is
    // what duplicates usually do.
    beneficiary_id: 'BEN-7781',
    customer_id: 'CORP-014',
    name: 'Cementos Pacifico S.A. de C.V.',
    bank_name: 'Banco del Norte',
    swift: 'BDNRMXMM',
    account: '012180001234567895',
    country: 'MX',
    address: {
      line1: 'Av. Constituyentes 455',
      neighbourhood: 'Col. Del Valle',
      postal_code: '64220',
      city: 'Monterrey',
      region: 'N.L.',
      country: 'MX',
    },
    tax_id: 'CPA920314K21',
    created_date: '2025-06-02',
    created_by: 'U-331',
  },
  {
    // Re-keyed from the new AP export in August. Address came across
    // complete; the RFC did not, because the export has no column for it.
    // Nothing flags this record as a duplicate of BEN-7781, and nothing
    // records that the RFC is why the March payment finally cleared.
    beneficiary_id: 'BEN-7902',
    customer_id: 'CORP-014',
    name: 'Cementos Pacifico SA de CV',
    bank_name: 'Banco del Norte',
    swift: 'BDNRMXMM',
    account: '012180001234567895',
    country: 'MX',
    address: {
      line1: 'Av. Constituyentes 455',
      neighbourhood: 'Col. Del Valle',
      postal_code: '64220',
      city: 'Monterrey',
      region: 'N.L.',
      country: 'MX',
    },
    // The AP export has no tax-identifier column, so the RFC was lost.
    created_date: '2026-08-14',
    created_by: 'U-402',
  },
  {
    beneficiary_id: 'BEN-6610',
    customer_id: 'CORP-014',
    name: 'Halvorsen Maskin AS',
    bank_name: 'Nordbanken',
    swift: 'NDEANOKK',
    account: 'NO9386011117947',
    country: 'NO',
    address: { line1: 'Storgata 18', postal_code: '0184', city: 'Oslo', country: 'NO' },
    created_date: '2024-11-20',
    created_by: 'U-331',
  },
];

const wires: Wire[] = [
  // --- the demo case -------------------------------------------------------
  {
    wire_id: 'WIRE-48271', customer_id: 'CORP-014', beneficiary_id: 'BEN-7902',
    value_date: '2026-09-28', amount: 420000, debit_currency: 'USD', credit_currency: 'MXN',
    corridor: 'US->MX', status: 'RETURNED', return_code: 'BNF_INFO_17',
    returned_date: '2026-09-29',
    return_text: 'RETURNED BY BENEFICIARY BANK. BNF INFO INCOMPLETE. REF BDNRMXMM.',
    initiated_by: 'U-402',
  },
  // --- March: the same failure, and the fix that worked --------------------
  {
    wire_id: 'WIRE-41092', customer_id: 'CORP-014', beneficiary_id: 'BEN-7781',
    value_date: '2026-03-11', amount: 185000, debit_currency: 'USD', credit_currency: 'MXN',
    corridor: 'US->MX', status: 'RETURNED', return_code: 'BNF_INFO_17',
    returned_date: '2026-03-12',
    return_text: 'RETURNED BY BENEFICIARY BANK. BNF INFO INCOMPLETE. REF BDNRMXMM.',
    initiated_by: 'U-331',
  },
  {
    wire_id: 'WIRE-41118', customer_id: 'CORP-014', beneficiary_id: 'BEN-7781',
    value_date: '2026-03-13', amount: 185000, debit_currency: 'USD', credit_currency: 'MXN',
    corridor: 'US->MX', status: 'COMPLETED', initiated_by: 'U-331',
  },
  // --- ambient, so the history is not a two-row lookup ---------------------
  { wire_id: 'WIRE-44907', customer_id: 'CORP-014', beneficiary_id: 'BEN-6610', value_date: '2026-05-19', amount: 62400, debit_currency: 'USD', credit_currency: 'NOK', corridor: 'US->NO', status: 'COMPLETED', initiated_by: 'U-331' },
  { wire_id: 'WIRE-46330', customer_id: 'CORP-014', beneficiary_id: 'BEN-6610', value_date: '2026-07-02', amount: 71850, debit_currency: 'USD', credit_currency: 'NOK', corridor: 'US->NO', status: 'COMPLETED', initiated_by: 'U-331' },
  { wire_id: 'WIRE-47215', customer_id: 'CORP-014', beneficiary_id: 'BEN-7781', value_date: '2026-08-05', amount: 240000, debit_currency: 'USD', credit_currency: 'MXN', corridor: 'US->MX', status: 'COMPLETED', initiated_by: 'U-331' },
  { wire_id: 'WIRE-48004', customer_id: 'CORP-014', beneficiary_id: 'BEN-6610', value_date: '2026-09-09', amount: 58900, debit_currency: 'USD', credit_currency: 'NOK', corridor: 'US->NO', status: 'COMPLETED', initiated_by: 'U-402' },
];

const return_codes: ReturnCode[] = [
  {
    code: 'BNF_INFO_17',
    title: 'Beneficiary information incomplete',
    description:
      'The beneficiary bank rejected the payment because the beneficiary details supplied did not meet its requirements. '
      + 'The beneficiary bank does not state which field was deficient.',
    repairable: false,
  },
  { code: 'FMT_09', title: 'Message format error', description: 'The payment message failed validation at the receiving institution.', repairable: true },
  { code: 'ACC_CLOSED_04', title: 'Beneficiary account closed', description: 'The beneficiary account is no longer open.', repairable: false },
];

const corridor_requirements: CorridorRequirement[] = [
  {
    corridor: 'US->MX',
    beneficiary_bank_country: 'MX',
    // The bank's form does not require colonia or postal code. Individual
    // receiving banks reject without them, but the bank holds no record of
    // which ones. That gap is the demo.
    required_beneficiary_fields: ['name', 'account (CLABE)', 'address.line1', 'address.neighbourhood', 'address.postal_code', 'address.city', 'address.country'],
    optional_beneficiary_fields: ['tax_id (RFC)'],
    notes:
      'A returned wire cannot be repaired and must be resubmitted as a new payment. '
      + 'Individual beneficiary banks may apply stricter beneficiary detail requirements than the corridor minimum, '
      + 'including value thresholds above which additional identifiers are demanded. '
      + 'Crestline does not hold per-institution requirements or thresholds.',
  },
  {
    corridor: 'US->NO',
    beneficiary_bank_country: 'NO',
    required_beneficiary_fields: ['name', 'account (IBAN)', 'address.line1', 'address.postal_code', 'address.city'],
    optional_beneficiary_fields: [],
    notes: 'IBAN required.',
  },
];

const deleted_beneficiaries: { beneficiary_id: string; customer_id: string; name: string; deleted_date: string; deleted_by: string }[] = [];

const out = join(process.cwd(), 'data', 'seed');
mkdirSync(out, { recursive: true });
const files = { business_customers, beneficiaries, deleted_beneficiaries, wires, return_codes, corridor_requirements };
for (const [k, v] of Object.entries(files)) writeFileSync(join(out, `${k}.json`), JSON.stringify(v, null, 2) + '\n');
console.log('seeded wires:', Object.entries(files).map(([k, v]) => `${k}=${v.length}`).join('  '));
