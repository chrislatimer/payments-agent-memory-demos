/**
 * Demo #2 — Crestline Rewards. Authored, not generated.
 *
 * The live systems hold balances, award pricing and current offers. They do
 * not hold what the customer is saving for, or what they were already going
 * to buy. That is the whole demo.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const rewards_account = {
  customer_id: 'C-LATIMER',
  display_name: 'C. LATIMER',
  card: 'Crestline Rewards Visa',
  card_last4: '6410',
  available_points: 564446,
  pending_points: 10963,
  earnings_cycle: 'Since Jan 2026 statement cycle',
  earnings_total: 74522,
  earnings_breakdown: [
    { label: '1 point on every purchase', points: 54434, colour: '#1668d4' },
    { label: '+4 pts on 5x categories', points: 6132, colour: '#b43fb4' },
    { label: '+1 pt on 2x categories', points: 630, colour: '#e8701a' },
    { label: '+4 pts on ride share', points: 0, colour: '#17a2b8' },
    { label: 'All other earnings', points: 13326, colour: '#8a8f98' },
  ],
};

const points_activity = [
  { descriptor: 'LYFT *COMFORT 09-29', date: '2026-09-30', points: 174.8, amount: 34.96, earn: '5x earn' },
  { descriptor: 'LYFT *COMFORT 09-29', date: '2026-09-30', points: 264.6, amount: 52.92, earn: '5x earn' },
  { descriptor: 'UBER *TRIP', date: '2026-09-29', points: 88.97, amount: 88.97, earn: '1x earn' },
  { descriptor: 'HARBOR GRO 214', date: '2026-09-27', points: 412.5, amount: 137.5, earn: '3x earn' },
  { descriptor: 'LINDEN FUEL #88', date: '2026-09-25', points: 61.2, amount: 61.2, earn: '1x earn' },
];

/** Award pricing. Points cost is per seat. */
const award_travel = [
  { route: 'SFO-HNL', origin: 'San Francisco', destination: 'Honolulu', month: '2027-03', cabin: 'First', points_per_seat: 350000, cash_per_seat: 23.4, airline: 'Pacific Crown', notes: 'Lie-flat. Limited award inventory in March.' },
  { route: 'SFO-HNL', origin: 'San Francisco', destination: 'Honolulu', month: '2027-03', cabin: 'Business', points_per_seat: 175000, cash_per_seat: 23.4, airline: 'Pacific Crown' },
  { route: 'SFO-HNL', origin: 'San Francisco', destination: 'Honolulu', month: '2027-03', cabin: 'Economy', points_per_seat: 60000, cash_per_seat: 23.4, airline: 'Pacific Crown' },
  { route: 'SFO-HNL', origin: 'San Francisco', destination: 'Honolulu', month: '2027-05', cabin: 'First', points_per_seat: 280000, cash_per_seat: 23.4, airline: 'Pacific Crown', notes: 'Off-peak. Cheaper than March.' },
  { route: 'SFO-OGG', origin: 'San Francisco', destination: 'Maui', month: '2027-03', cabin: 'First', points_per_seat: 365000, cash_per_seat: 23.4, airline: 'Pacific Crown' },
  { route: 'SFO-NRT', origin: 'San Francisco', destination: 'Tokyo', month: '2027-04', cabin: 'Business', points_per_seat: 210000, cash_per_seat: 118.6, airline: 'Pacific Crown' },
];

/** Time-limited bonus categories. These are real offers to every cardholder;
 *  nothing here is personal. Memory is what makes one of them relevant. */
const offers = [
  { offer_id: 'OF-4412', merchant: 'Home Depot', category: 'Home improvement', multiplier: 4, ends: '2026-10-31', cap_spend: 50000 },
  { offer_id: 'OF-4418', merchant: 'Apple', category: 'Electronics', multiplier: 2, ends: '2026-11-15', cap_spend: 10000 },
  { offer_id: 'OF-4390', merchant: 'Lyft', category: 'Rideshare', multiplier: 5, ends: '2027-03-31', cap_spend: null },
  { offer_id: 'OF-4401', merchant: 'Grocery (all)', category: 'Grocery', multiplier: 3, ends: '2026-12-31', cap_spend: 6000 },
  { offer_id: 'OF-4425', merchant: 'Crestline Travel', category: 'Travel portal', multiplier: 3, ends: '2026-12-31', cap_spend: null },
];

const redemption_options = [
  { option: 'Crestline Travel portal', cents_per_point: 1.25, note: 'Book any flight or hotel at a fixed rate.' },
  { option: 'Transfer to airline partners', cents_per_point: null, note: 'Variable. Best value on premium cabins; worst on economy.' },
  { option: 'Gift cards', cents_per_point: 1.0, note: '175+ retailers.' },
  { option: 'Apple purchases', cents_per_point: 0.8, note: 'Pay for all or part of an Apple purchase.' },
  { option: 'Statement credit', cents_per_point: 1.0, note: 'Cash back against your balance.' },
];

const out = join(process.cwd(), 'data', 'seed');
mkdirSync(out, { recursive: true });
const files = { rewards_account, points_activity, award_travel, offers, redemption_options };
for (const [k, v] of Object.entries(files)) writeFileSync(join(out, `${k}.json`), JSON.stringify(v, null, 2) + '\n');
console.log('seeded rewards:', Object.keys(files).join(', '));
console.log('gap for 2 first-class seats SFO-HNL March:', 2 * 350000 - rewards_account.available_points, 'points');
