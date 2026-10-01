import { hindsight } from '@/lib/hindsight/recall';
import { REWARDS_BANK } from '@/lib/demos/points-assistant';
import { ensureProfile } from '@/lib/demos/points-assistant/profile';

export const runtime = 'nodejs';

const BANK_CONFIG = {
  reflectMission:
    'I am the rewards assistant for a single Crestline cardholder. I remember what they are '
    + 'saving for, what they have already told me they intend to buy, what they have ruled out, '
    + 'and what we have discussed before, so that later conversations do not start from nothing.',
  enableObservations: true,
  observationsMission:
    'Build a picture of this cardholder: redemption goals and the trips they want, hard '
    + 'constraints and dislikes, purchases they have said they need to make anyway, and anything '
    + 'they have rejected and why.',
};

/** Drop and recreate the bank. Demo #2 writes live, so rehearsal pollutes it. */
export async function POST() {
  await hindsight.deleteBank(REWARDS_BANK).catch(() => undefined);
  await hindsight.createBank(REWARDS_BANK, BANK_CONFIG).catch(() => undefined);
  await ensureProfile(REWARDS_BANK).catch(() => undefined);
  return Response.json({ ok: true, bank: REWARDS_BANK });
}
