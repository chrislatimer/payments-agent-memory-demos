/**
 * Wipe the rewards memory bank back to empty.
 *
 * Demo #2 writes memory live, so the bank accumulates whatever was said during
 * rehearsal. Run this before any run you want to start from nothing.
 */
import 'dotenv/config';
import { HindsightClient } from '@vectorize-io/hindsight-client';
import { PROFILE_NAME, PROFILE_QUERY, PROFILE_INSTRUCTION, PROFILE_TAGS } from '../lib/demos/points-assistant/profile';

const BANK = process.env.HINDSIGHT_REWARDS_BANK ?? 'crestline-rewards-c-latimer';

const client = new HindsightClient({
  baseUrl: process.env.HINDSIGHT_API_URL ?? 'https://api.hindsight.vectorize.io',
  apiKey: process.env.HINDSIGHT_API_KEY,
});

async function main() {
  await client.deleteBank(BANK).then(() => console.log(`dropped ${BANK}`)).catch((e) => console.log(`drop skipped: ${e?.message ?? e}`));
  await client.createBank(BANK, {
    reflectMission:
      'I am the rewards assistant for a single Crestline cardholder. I remember what they are '
      + 'saving for, what they have already told me they intend to buy, what they have ruled out, '
      + 'and what we have discussed before, so that later conversations do not start from nothing.',
    enableObservations: true,
    observationsMission:
      'Build a picture of this cardholder: redemption goals and the trips they want, hard '
      + 'constraints and dislikes, purchases they have said they need to make anyway, and anything '
      + 'they have rejected and why.',
  });
  await client.createMentalModel(BANK, PROFILE_NAME, `${PROFILE_INSTRUCTION}\n\n${PROFILE_QUERY}`, { tags: PROFILE_TAGS });
  console.log(`recreated ${BANK} — empty, with an empty "${PROFILE_NAME}"`);
  const probe = (await client.recall(BANK, 'anything at all')) as { results?: unknown[] };
  console.log('facts now in bank:', probe.results?.length ?? 0);
}
main().catch((e) => { console.error('FAILED:', e?.message ?? e); process.exit(1); });
