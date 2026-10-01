/**
 * Crestline Rewards tools.
 *
 * Everything here is live and impersonal: balances, award pricing, offers
 * available to every cardholder. Nothing in this file knows what the customer
 * is saving for or what they were already planning to buy.
 */
import account from '@/data/seed/rewards_account.json';
import activity from '@/data/seed/points_activity.json';
import award from '@/data/seed/award_travel.json';
import offers from '@/data/seed/offers.json';
import redemption from '@/data/seed/redemption_options.json';

type Award = (typeof award)[number];

export const rewardsTools = {
  get_points_balance: () => ({
    available_points: account.available_points,
    pending_points: account.pending_points,
    card: `${account.card} ••${account.card_last4}`,
    earned_this_cycle: account.earnings_total,
  }),

  get_points_activity: () => ({ recent: activity }),

  /** Award pricing. Points are per seat; multiply for a party. */
  search_award_travel: (a: Record<string, unknown>) => {
    const dest = String(a.destination ?? '').toLowerCase();
    const cabin = String(a.cabin ?? '').toLowerCase();
    const month = String(a.month ?? '');
    const rows = (award as Award[]).filter(
      (r) =>
        (!dest || r.destination.toLowerCase().includes(dest) || r.route.toLowerCase().includes(dest)) &&
        (!cabin || r.cabin.toLowerCase() === cabin) &&
        (!month || r.month === month),
    );
    return rows.length ? { count: rows.length, options: rows } : { count: 0, options: [], note: 'No award inventory matching that search.' };
  },

  get_redemption_options: () => ({ options: redemption }),

  /** Bonus categories currently running. Impersonal: everyone sees these. */
  get_current_offers: () => ({ offers, as_of: '2026-09-30' }),

  /** What a given spend would earn. */
  estimate_points_from_spend: (a: Record<string, unknown>) => {
    const merchant = String(a.merchant ?? '');
    const amount = Number(a.amount ?? 0);
    const offer = offers.find((o) => o.merchant.toLowerCase().includes(merchant.toLowerCase()));
    const multiplier = offer?.multiplier ?? 1;
    const capped = offer?.cap_spend ? Math.min(amount, offer.cap_spend) : amount;
    return {
      merchant,
      amount,
      multiplier,
      offer_ends: offer?.ends ?? null,
      spend_counted: capped,
      points_earned: Math.round(capped * multiplier),
      note: offer?.cap_spend && amount > offer.cap_spend ? `Bonus applies to the first $${offer.cap_spend.toLocaleString()} of spend.` : undefined,
    };
  },

  /** How far short the customer is for a given goal. */
  points_gap: (a: Record<string, unknown>) => {
    const needed = Number(a.points_needed ?? 0);
    const have = account.available_points;
    return {
      points_needed: needed,
      available_points: have,
      pending_points: account.pending_points,
      shortfall: Math.max(0, needed - have),
      sufficient: have >= needed,
    };
  },
};

export function callRewardsTool(name: string, args: Record<string, unknown>) {
  const fn = (rewardsTools as Record<string, (a: never) => unknown>)[name];
  if (!fn) return { error: `unknown_tool:${name}` };
  return fn(args as never);
}

export const rewardsAccount = account;
export const pointsActivity = activity;
