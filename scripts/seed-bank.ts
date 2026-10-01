/**
 * Crestline National Bank — deterministic seed generator.
 *
 * Authored where it carries narrative weight, seeded-random for ambient noise.
 * `npm run seed:bank` must regenerate byte-identical output.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type {
  BankSeed, Customer, Merchant, Descriptor, Transaction, Dispute, ReasonCode, DisputePolicy,
} from '../lib/bank/types';

// ---------------------------------------------------------------- determinism
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260930);
const pick = <T>(a: T[]): T => a[Math.floor(rng() * a.length)];
const money = (lo: number, hi: number) => Math.round((lo + rng() * (hi - lo)) * 100) / 100;

const TODAY = new Date('2026-09-30T00:00:00Z');
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(TODAY.getTime() - n * 86400000));

// ------------------------------------------------------------------ merchants
// Three merchant-of-record billing intermediaries. The bank can resolve a
// descriptor to one of these legal entities and no further: there is no brand
// table anywhere in the bank. That absence is the premise of demo #5.
const merchants: Merchant[] = [
  { merchant_id: 'M-0412', legal_name: 'Northbeam Digital LLC', mcc: '5817', mcc_description: 'Digital Goods — Applications', city: 'Wilmington', state: 'DE', merchant_of_record: true },
  { merchant_id: 'M-0533', legal_name: 'Cloverpoint Commerce LLC', mcc: '5817', mcc_description: 'Digital Goods — Applications', city: 'Dover', state: 'DE', merchant_of_record: true },
  { merchant_id: 'M-0619', legal_name: 'Alder & Vance Billing Services Inc', mcc: '7399', mcc_description: 'Business Services', city: 'Reno', state: 'NV', merchant_of_record: true },
];

const ORDINARY: [string, string, string, string, string][] = [
  ['M-1001', 'Harbor Grocers #214', '5411', 'Grocery Stores', 'HARBOR GRO 214'],
  ['M-1002', 'Linden Fuel Mart', '5541', 'Service Stations', 'LINDEN FUEL #88'],
  ['M-1003', 'Cafe Ostra', '5812', 'Eating Places', 'SQ *CAFE OSTRA'],
  ['M-1004', 'Northstar Wireless', '4814', 'Telecommunication', 'NORTHSTAR WIRELESS'],
  ['M-1005', 'Streamflix Media', '5815', 'Digital Streaming', 'STREAMFLX'],
  ['M-1006', 'Ridgeline Fitness', '7997', 'Health Clubs', 'RIDGELINE FIT*MBR'],
  ['M-1007', 'Cloudvault Storage', '5817', 'Digital Goods', 'CLOUDVAULT STOR'],
  ['M-1008', 'Audiobooks Now', '5942', 'Book Stores', 'ABN*AUDIOBOOKSNOW'],
  ['M-1009', 'Petfood Direct', '5995', 'Pet Shops', 'PETFOOD DIR 7781'],
  ['M-1010', 'Vireo Shop', '5732', 'Electronics Stores', 'VIREO SHOP'],
  ['M-1011', 'Bayline Transit', '4111', 'Transportation', 'BAYLINE TRANSIT'],
  ['M-1012', 'Quill & Press', '5942', 'Book Stores', 'QUILL+PRESS'],
  ['M-1013', 'Marrow Pharmacy', '5912', 'Drug Stores', 'MARROW RX 0043'],
  ['M-1014', 'Tidewater Power', '4900', 'Utilities', 'TIDEWATER PWR EFT'],
  ['M-1015', 'Foxglove Hardware', '5200', 'Home Supply', 'FOXGLOVE HDW'],
  ['M-1016', 'Sable Coffee Co', '5812', 'Eating Places', 'TST*SABLE COFFEE'],
  ['M-1017', 'Orchard Lane Market', '5411', 'Grocery Stores', 'ORCHARD LN MKT'],
  ['M-1018', 'Kestrel Audio Shop', '5732', 'Electronics Stores', 'KESTREL AUDIO'],
];
for (const [id, name, mcc, desc] of ORDINARY) {
  merchants.push({ merchant_id: id, legal_name: name, mcc, mcc_description: desc, city: 'Various', state: 'US', merchant_of_record: false });
}

// Suffixes rotate per billing run and are shared across brands. A suffix is
// therefore useless as a brand identifier — one of the facts the memory layer
// has to learn, because nothing in the bank states it.
const descriptors: Descriptor[] = [
  { descriptor: 'NORTHBEAM DIG*4471', merchant_id: 'M-0412' },
  { descriptor: 'NORTHBEAM DIG*2208', merchant_id: 'M-0412' },
  { descriptor: 'NORTHBEAM DIG*8842', merchant_id: 'M-0412' },
  { descriptor: 'CLOVERPT*1190', merchant_id: 'M-0533' },
  { descriptor: 'CLOVERPT*7725', merchant_id: 'M-0533' },
  { descriptor: 'AV-BILLING 3301', merchant_id: 'M-0619' },
  { descriptor: 'AV-BILLING 9043', merchant_id: 'M-0619' },
  { descriptor: 'AV-BILLING 5517', merchant_id: 'M-0619' },
];
for (const [id, , , , d] of ORDINARY) descriptors.push({ descriptor: d, merchant_id: id });

// ------------------------------------------------------------------ customers
const customers: Customer[] = [
  { customer_id: 'C-2041', name: 'Dana Whitfield', city: 'Portland', state: 'OR',
    addresses: [{ label: 'home', line1: '1140 SE Alder St Apt 3', city: 'Portland', state: 'OR', postal: '97214' }],
    card_last4: '6612', customer_since: '2019-04-02' },
  { customer_id: 'C-2098', name: 'Marcus Bell', city: 'Columbus', state: 'OH',
    addresses: [{ label: 'home', line1: '822 Hollis Ave', city: 'Columbus', state: 'OH', postal: '43206' }],
    card_last4: '9074', customer_since: '2021-11-17' },
];
const CONTRIB: [string, string, string, string, string][] = [
  ['C-1884', 'Ana Reyes', 'Tucson', 'AZ', '85716'],
  ['C-1902', 'Theo Kaminski', 'Albany', 'NY', '12208'],
  ['C-1915', 'Priya Raman', 'Durham', 'NC', '27705'],
  ['C-1940', 'Dale Osorio', 'Fresno', 'CA', '93704'],
  ['C-1977', 'Grace Nwosu', 'Baltimore', 'MD', '21218'],
  ['C-2003', 'Henry Pike', 'Boise', 'ID', '83702'],
  ['C-2019', 'Lena Brandt', 'Madison', 'WI', '53703'],
];
for (const [id, name, city, state, postal] of CONTRIB) {
  customers.push({ customer_id: id, name, city, state,
    addresses: [{ label: 'home', line1: `${100 + Math.floor(rng() * 800)} Main St`, city, state, postal }],
    card_last4: String(1000 + Math.floor(rng() * 8999)).slice(0, 4), customer_since: '2020-06-01' });
}
const AMBIENT = ['Omar Haddad','Ruth Delgado','Simon Okafor','Tess Lindqvist','Victor Moreau','Wren Ashby','Yuki Tanabe','Zane Petrov','Beatriz Alves','Caleb Nunes','Delia Marsh','Evan Boyle','Fiona Castell','Gideon Marr','Hana Sato'];
AMBIENT.forEach((name, i) => {
  const id = `C-21${String(10 + i).padStart(2, '0')}`;
  customers.push({ customer_id: id, name, city: 'Various', state: 'US',
    addresses: [{ label: 'home', line1: `${200 + i * 7} Elm St`, city: 'Various', state: 'US', postal: String(10000 + i * 311) }],
    card_last4: String(2000 + i * 37).slice(0, 4), customer_since: '2022-01-15' });
});

// --------------------------------------------------------------- transactions
const transactions: Transaction[] = [];
let txnSeq = 80000;
const nextTxn = () => `TXN-${++txnSeq}`;

function add(t: Omit<Transaction, 'transaction_id'>) {
  const txn = { transaction_id: nextTxn(), ...t };
  transactions.push(txn);
  return txn;
}

/** Ambient noise so a date-window query returns a haystack, not a lookup table. */
function fillOrdinary(customer_id: string, months: number, perMonth: number) {
  const everyday = ['HARBOR GRO 214','LINDEN FUEL #88','SQ *CAFE OSTRA','MARROW RX 0043','FOXGLOVE HDW','TST*SABLE COFFEE','ORCHARD LN MKT','QUILL+PRESS','BAYLINE TRANSIT'];
  for (let m = months; m >= 0; m--) {
    for (let k = 0; k < perMonth; k++) {
      const day = m * 30 + Math.floor(rng() * 28);
      if (day > months * 30) continue;
      add({ customer_id, posted_date: daysAgo(day), amount: money(4.2, 148), descriptor: pick(everyday),
        channel: rng() > 0.35 ? 'card_present' : 'card_not_present', recurring: false });
    }
  }
}

/** Monthly card-on-file subscriptions. These are what a needless reissue breaks. */
function fillSubscriptions(customer_id: string, months: number, subs: [string, number][]) {
  for (const [descriptor, amount] of subs) {
    for (let m = months; m >= 0; m--) {
      add({ customer_id, posted_date: daysAgo(m * 30 + 6), amount, descriptor, channel: 'card_not_present', recurring: true });
    }
  }
}

// --- Hero: Dana Whitfield, C-2041 ------------------------------------------
// 24 months of real history. The story spine is three rows inside ~120.
fillOrdinary('C-2041', 24, 4);
fillSubscriptions('C-2041', 24, [
  ['STREAMFLX', 15.99],
  ['CLOUDVAULT STOR', 2.99],
  ['RIDGELINE FIT*MBR', 29.99],
  ['ABN*AUDIOBOOKSNOW', 14.95],
  ['NORTHSTAR WIRELESS', 92.4],
  ['TIDEWATER PWR EFT', 108.55],
]);
// The ring itself, under a descriptor anyone would recognise.
add({ customer_id: 'C-2041', posted_date: '2025-09-09', amount: 329.0, descriptor: 'VIREO SHOP',
  channel: 'card_not_present', recurring: false, ship_to_postal: '97214' });
// Month one of the membership, billed by the merchant of record under one suffix.
add({ customer_id: 'C-2041', posted_date: '2025-09-11', amount: 39.99, descriptor: 'NORTHBEAM DIG*2208',
  channel: 'card_not_present', recurring: false });
// The disputed annual renewal, twelve months later, under a DIFFERENT suffix.
// recurring=false is deliberate and realistic: annual renewal flags are
// unreliable, so the flag cannot be the tell. The agent must use the history.
const HERO_TXN = add({ customer_id: 'C-2041', posted_date: '2026-09-14', amount: 479.88,
  descriptor: 'NORTHBEAM DIG*4471', channel: 'card_not_present', recurring: false });

// --- Guardrail: Marcus Bell, C-2098 ----------------------------------------
// Same descriptor, same amount, and NO prior Northbeam or Vireo activity.
// Ship-to matches no address on file. The agent must fail to confirm and
// stay on the fraud path.
fillOrdinary('C-2098', 18, 4);
fillSubscriptions('C-2098', 18, [['STREAMFLX', 15.99], ['NORTHSTAR WIRELESS', 78.2]]);
const GUARD_TXN = add({ customer_id: 'C-2098', posted_date: '2026-09-17', amount: 479.88,
  descriptor: 'NORTHBEAM DIG*4471', channel: 'card_not_present', recurring: false, ship_to_postal: '33139' });

// --- Knowledge-page contributors -------------------------------------------
// Each needs a real history so the provenance click-through lands on records.
const CONTRIB_SPINE: [string, string, number, string, string, number][] = [
  ['C-1884', 'NORTHBEAM DIG*8842', 239.88, '2026-02-18', 'KESTREL AUDIO', 189.0],
  ['C-1902', 'NORTHBEAM DIG*4471', 479.88, '2026-04-06', 'VIREO SHOP', 329.0],
  ['C-1915', 'NORTHBEAM DIG*2208', 348.0, '2026-01-22', 'QUILL+PRESS', 64.0],
  ['C-1940', 'NORTHBEAM DIG*8842', 479.88, '2026-05-11', 'VIREO SHOP', 329.0],
  ['C-1977', 'NORTHBEAM DIG*4471', 179.88, '2026-03-30', 'KESTREL AUDIO', 149.0],
  ['C-2003', 'NORTHBEAM DIG*8842', 348.0, '2026-06-14', 'QUILL+PRESS', 48.0],
  ['C-2019', 'NORTHBEAM DIG*2208', 179.88, '2026-07-28', 'KESTREL AUDIO', 129.0],
];
const contribTxns: Record<string, string> = {};
for (const [cid, descriptor, amount, date, originDesc, originAmt] of CONTRIB_SPINE) {
  fillOrdinary(cid, 18, 3);
  fillSubscriptions(cid, 18, [['STREAMFLX', 15.99]]);
  const d = new Date(date + 'T00:00:00Z');
  const origin = new Date(d.getTime() - 367 * 86400000);
  add({ customer_id: cid, posted_date: iso(origin), amount: originAmt, descriptor: originDesc, channel: 'card_not_present', recurring: false });
  const t = add({ customer_id: cid, posted_date: date, amount, descriptor, channel: 'card_not_present', recurring: false });
  contribTxns[cid] = t.transaction_id;
}
// Two contributors disputed twice; give them a second renewal to point at.
const extra1 = add({ customer_id: 'C-1884', posted_date: '2026-08-19', amount: 479.88, descriptor: 'NORTHBEAM DIG*2208', channel: 'card_not_present', recurring: false });
const extra2 = add({ customer_id: 'C-1915', posted_date: '2026-09-02', amount: 479.88, descriptor: 'NORTHBEAM DIG*4471', channel: 'card_not_present', recurring: false });

for (const c of customers) {
  if (c.customer_id.startsWith('C-21')) { fillOrdinary(c.customer_id, 18, 3); fillSubscriptions(c.customer_id, 18, [['STREAMFLX', 15.99]]); }
}
transactions.sort((a, b) => a.posted_date.localeCompare(b.posted_date) || a.transaction_id.localeCompare(b.transaction_id));

// -------------------------------------------------------------------- policy
const reason_codes: ReasonCode[] = [
  { code: '10.4', family: 'FRAUD', title: 'Fraud — Card Absent Environment', network_response_days: 30, provisional_credit_required: true },
  { code: '13.1', family: 'CONSUMER_DISPUTE', title: 'Merchandise or Services Not Received', network_response_days: 30, provisional_credit_required: false },
  { code: '13.2', family: 'CONSUMER_DISPUTE', title: 'Cancelled Recurring Transaction', network_response_days: 30, provisional_credit_required: false },
  { code: '13.7', family: 'CONSUMER_DISPUTE', title: 'Cancelled Merchandise or Services', network_response_days: 30, provisional_credit_required: false },
];
const policies: DisputePolicy[] = [
  { policy_id: 'POL-FRAUD-CNP', reason_code_family: 'FRAUD', title: 'Unrecognised card-absent transaction',
    required_steps: [
      'Retrieve the transaction and resolve the statement descriptor to a merchant.',
      'Review the cardholder transaction history for related or originating activity before concluding the charge is unrecognised.',
      'Compare any ship-to data against addresses on file.',
      'Escalate as suspected fraud only if no originating relationship can be established.',
      'Record the evidence supporting the recommendation.',
      'Human analyst approval is required before a chargeback is filed.',
    ] },
  { policy_id: 'POL-CANCELLED-RECURRING', reason_code_family: 'CONSUMER_DISPUTE', title: 'Cancelled recurring transaction',
    required_steps: [
      'Confirm the cardholder authorised the original recurring agreement.',
      'Establish the date and channel of the cancellation request.',
      'Route to merchant billing dispute rather than the fraud path.',
      'Human analyst approval is required before provisional credit.',
    ] },
];

// ------------------------------------------------------------------ disputes
// Nine resolved Northbeam cases across seven customers. Outcomes deliberately
// mixed: seven recognised, one routed as a billing dispute, one genuine fraud.
// A memory that said "always recognised" would be a liability, not an asset.
const disputes: Dispute[] = [
  { dispute_id: 'DSP-10428', customer_id: 'C-2041', transaction_id: HERO_TXN.transaction_id,
    opened_date: '2026-09-26', status: 'OPEN',
    customer_claim: "I didn't make this purchase. I've never heard of Northbeam Digital." },
  { dispute_id: 'DSP-10431', customer_id: 'C-2098', transaction_id: GUARD_TXN.transaction_id,
    opened_date: '2026-09-27', status: 'OPEN',
    customer_claim: "This isn't mine. I don't know who Northbeam Digital is." },

  { dispute_id: 'DSP-08812', customer_id: 'C-1884', transaction_id: contribTxns['C-1884'],
    opened_date: '2026-02-24', status: 'RESOLVED',
    customer_claim: "I don't recognise this one. Who is Northbeam Digital?", reason_code: '10.4', resolution: 'RECOGNIZED_NO_CHARGEBACK',
    resolution_date: '2026-03-02', analyst: 'J. Abara',
    resolution_note: "Cardholder did not recognise 'Northbeam Digital'. Northbeam Digital is the merchant of record for Kestrel Audio; the charge was the annual renewal of a Kestrel warranty plan. Located the original Kestrel Audio purchase approximately twelve months earlier under a different descriptor. Cardholder confirmed once the brand was named. No chargeback filed; card not reissued." },
  { dispute_id: 'DSP-08967', customer_id: 'C-1902', transaction_id: contribTxns['C-1902'],
    opened_date: '2026-04-11', status: 'RESOLVED',
    customer_claim: "There is a charge here for $479.88 that I never authorised.", reason_code: '10.4', resolution: 'RECOGNIZED_NO_CHARGEBACK',
    resolution_date: '2026-04-15', analyst: 'M. Ruiz',
    resolution_note: "Unrecognised-charge claim on NORTHBEAM DIG*4471. Northbeam bills on behalf of Vireo, a sleep-tracking ring sold direct to consumer. Membership is billed annually, twelve months after signup, which is why the cardholder had no recent comparable charge to recognise. Original VIREO SHOP hardware purchase found in the prior year. Recognised; no chargeback." },
  { dispute_id: 'DSP-09105', customer_id: 'C-1915', transaction_id: contribTxns['C-1915'],
    opened_date: '2026-01-27', status: 'RESOLVED',
    customer_claim: "I have never heard of this company in my life.", reason_code: '10.4', resolution: 'RECOGNIZED_NO_CHARGEBACK',
    resolution_date: '2026-02-01', analyst: 'J. Abara',
    resolution_note: "NORTHBEAM DIG*2208 for $348.00. Northbeam Digital is the merchant of record for Tanglewood Learning, billed as an annual family plan. Note the suffix differed from the suffix on this cardholder's original signup charge, so a descriptor-suffix match would have missed the relationship entirely." },
  { dispute_id: 'DSP-09233', customer_id: 'C-1940', transaction_id: contribTxns['C-1940'],
    opened_date: '2026-05-16', status: 'RESOLVED',
    customer_claim: "This is not a charge I made. Please reverse it.", reason_code: '10.4', resolution: 'RECOGNIZED_NO_CHARGEBACK',
    resolution_date: '2026-05-20', analyst: 'K. Oyelaran',
    resolution_note: "Vireo annual membership renewal billed by Northbeam Digital. Cardholder had already been issued a replacement card by the time we established the charge was legitimate, which broke four other card-on-file subscriptions and generated three further service calls. Avoidable." },
  { dispute_id: 'DSP-09388', customer_id: 'C-1977', transaction_id: contribTxns['C-1977'],
    opened_date: '2026-04-04', status: 'RESOLVED',
    customer_claim: "Unrecognised charge. I would like my card blocked.", reason_code: '10.4', resolution: 'RECOGNIZED_NO_CHARGEBACK',
    resolution_date: '2026-04-09', analyst: 'M. Ruiz',
    resolution_note: "Kestrel Audio warranty renewal under NORTHBEAM DIG*4471. Same suffix this bank has seen carry Vireo charges, confirming the four-digit suffix rotates by billing run and is not a brand identifier." },
  { dispute_id: 'DSP-09512', customer_id: 'C-1884', transaction_id: extra1.transaction_id,
    opened_date: '2026-08-24', status: 'RESOLVED',
    customer_claim: "Northbeam again. I still do not know who they are.", reason_code: '10.4', resolution: 'RECOGNIZED_NO_CHARGEBACK',
    resolution_date: '2026-08-28', analyst: 'M. Ruiz',
    resolution_note: "Second unrecognised-charge claim from this cardholder on a Northbeam descriptor, this time Vireo. Annual billing cadence means roughly one in twelve of these renewals generates a dispute. Establishing the originating purchase first resolved it in a single call." },
  { dispute_id: 'DSP-09674', customer_id: 'C-2003', transaction_id: contribTxns['C-2003'],
    opened_date: '2026-06-19', status: 'RESOLVED',
    customer_claim: "I cancelled this months ago and they charged me anyway.", reason_code: '13.2', resolution: 'BILLING_DISPUTE_ROUTED',
    resolution_date: '2026-06-25', analyst: 'K. Oyelaran',
    resolution_note: "Tanglewood Learning annual plan billed by Northbeam Digital. Cardholder did authorise the original agreement but had cancelled in-app two months earlier; the cancellation did not propagate to Northbeam's billing. Not fraud. Re-coded from 10.4 to 13.2 and routed as a cancelled-recurring billing dispute." },
  { dispute_id: 'DSP-09801', customer_id: 'C-1915', transaction_id: extra2.transaction_id,
    opened_date: '2026-09-07', status: 'RESOLVED',
    customer_claim: "I did not make this purchase and I do not recognise the name.", reason_code: '10.4', resolution: 'CONFIRMED_FRAUD',
    resolution_date: '2026-09-12', analyst: 'J. Abara',
    resolution_note: "NORTHBEAM DIG*4471 claim that was genuine fraud. No originating Vireo or Kestrel purchase anywhere in the cardholder's history and the ship-to postal code matched no address on file. Chargeback filed and card reissued correctly. A Northbeam descriptor is not by itself evidence that a charge is legitimate." },
  { dispute_id: 'DSP-09944', customer_id: 'C-2019', transaction_id: contribTxns['C-2019'],
    opened_date: '2026-07-31', status: 'RESOLVED',
    customer_claim: "Who is Northbeam Digital? I never signed up for anything.", reason_code: '10.4', resolution: 'RECOGNIZED_NO_CHARGEBACK',
    resolution_date: '2026-08-03', analyst: 'M. Ruiz',
    resolution_note: "ANALYST CORRECTION. The investigating agent escalated this to the fraud queue after the descriptor lookup returned only 'Northbeam Digital LLC, MCC 5817'. For any Northbeam descriptor, search the cardholder's transaction history eleven to thirteen months back for an originating purchase BEFORE escalating as unrecognised. That single step would have resolved this case without a fraud escalation, and would have resolved DSP-08812 and DSP-09105 the same way." },
];

// --------------------------------------------------------------------- write
const seed: BankSeed = { customers, merchants, descriptors, transactions, disputes, reason_codes, policies };
const out = join(process.cwd(), 'data', 'seed');
mkdirSync(out, { recursive: true });
for (const [k, v] of Object.entries(seed)) {
  writeFileSync(join(out, `${k}.json`), JSON.stringify(v, null, 2) + '\n');
}
console.log('seeded:', Object.entries(seed).map(([k, v]) => `${k}=${(v as unknown[]).length}`).join('  '));
console.log('hero txn:', HERO_TXN.transaction_id, '| guardrail txn:', GUARD_TXN.transaction_id);
