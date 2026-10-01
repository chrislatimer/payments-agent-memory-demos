/**
 * The customer profile: a Hindsight mental model distilled from every
 * conversation this cardholder has had with the assistant.
 *
 * Raw recall returns fragments of individual turns. The profile is the
 * standing picture — what they are saving for, what they have already said
 * they need to buy, what they have ruled out — which is what the assistant
 * should open a new session already holding.
 */
import { hindsight } from '@/lib/hindsight/recall';

export const PROFILE_NAME = 'Customer profile';
export const PROFILE_TAGS = ['demo2', 'rewards'];

export const PROFILE_QUERY = [
  'What this cardholder is saving their points for and the specific trips or redemptions they want.',
  'Who they travel with. Hard constraints and things they refuse.',
  'Purchases they have said they need to make anyway, and roughly what those cost.',
  'Anything they have rejected, and why. How they prefer to be talked to.',
].join(' ');

export const PROFILE_INSTRUCTION =
  'Maintain a short standing profile of this cardholder, written as plain statements about them. '
  + 'Only include things the customer actually said about themselves or their plans. '
  + 'Do not include account balances, points prices, offer multipliers or anything else the live '
  + 'systems hold — those change and are looked up, not remembered.';

type MM = { id: string; name: string; content?: string | null };

async function findProfile(bank: string): Promise<MM | undefined> {
  const list = (await hindsight.listMentalModels(bank).catch(() => undefined)) as { items?: MM[] } | undefined;
  return list?.items?.find((m) => m.name === PROFILE_NAME);
}

/** Create the profile model if this bank does not have one yet. */
export async function ensureProfile(bank: string) {
  const existing = await findProfile(bank);
  if (existing) return existing.id;
  const created = (await hindsight
    .createMentalModel(bank, PROFILE_NAME, `${PROFILE_INSTRUCTION}\n\n${PROFILE_QUERY}`, { tags: PROFILE_TAGS })
    .catch(() => undefined)) as { id?: string } | undefined;
  return created?.id;
}

/**
 * Current profile text.
 *
 * Prefers the persisted content. Falls back to a dry-run refresh, which
 * computes the same distillation synchronously: on cloud the async refresh is
 * queued and can take minutes or not land at all, and a demo cannot wait on a
 * queue. The dry run is Hindsight's own view of the bank as it stands, so the
 * text shown is real either way.
 */
export async function getProfile(bank: string): Promise<string> {
  const m = await findProfile(bank);
  if (!m) return '';

  const full = (await hindsight.getMentalModel(bank, m.id, { detail: 'content' }).catch(() => undefined)) as
    | { content?: string }
    | undefined;
  const stored = (full?.content ?? '').trim();
  if (stored) return stored;

  const dry = (await hindsight.dryRunRefreshMentalModel(bank, m.id).catch(() => undefined)) as
    | { candidate_content?: string; preview_content?: string }
    | undefined;
  return (dry?.candidate_content ?? dry?.preview_content ?? '').trim();
}

/**
 * Rebuild the profile from everything retained so far. Async server side, so
 * this is fired and forgotten after a turn rather than awaited during one.
 */
export async function refreshProfile(bank: string) {
  const id = await ensureProfile(bank);
  if (id) await hindsight.refreshMentalModel(bank, id).catch(() => undefined);
}
