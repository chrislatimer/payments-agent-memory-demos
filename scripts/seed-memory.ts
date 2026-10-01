/**
 * Seed the Hindsight bank for demo #5.
 *
 * Deliberately does NOT write the knowledge page. It writes nine real
 * resolved-case records and lets Hindsight distil them, then prints what came
 * out so we can judge it. If the page has to be hand-written, the demo's
 * central claim is false.
 */
import 'dotenv/config';
import { HindsightClient } from '@vectorize-io/hindsight-client';
import disputes from '../data/seed/disputes.json';
import transactions from '../data/seed/transactions.json';
import type { Dispute, Transaction } from '../lib/bank/types';

const BANK = process.env.HINDSIGHT_BANK_NAME ?? 'crestline-disputes-demo';
const MODEL_NAME = 'Merchant-of-record descriptor identification';

const MISSION = [
  'I investigate card dispute claims at Crestline National Bank.',
  'I learn, from resolved cases and analyst corrections, how to identify what a',
  'cardholder actually bought when a statement descriptor names a billing',
  'intermediary rather than a recognisable brand.',
  'I never conclude a charge is legitimate from memory alone: memory tells me',
  'where to look, and the bank\'s transaction records decide.',
].join(' ');

const OBSERVATIONS_MISSION = [
  'Synthesise reusable operational knowledge for dispute investigators from',
  'resolved case records. Prefer patterns that hold across cases: which billing',
  'intermediary bills for which consumer brand, how descriptors are structured,',
  'billing cadence, what the investigator should check before escalating, and',
  'cases where the pattern did NOT hold.',
].join(' ');

const SOURCE_QUERY = [
  'Unrecognised-charge dispute claims where the statement descriptor names a',
  'merchant of record or billing intermediary rather than a consumer brand.',
  'Which brands bill under which entity, how the descriptor is structured,',
  'what billing cadence applies, how these cases were actually resolved, and',
  'what the investigating agent should check before escalating as fraud.',
].join(' ');

const MEMORY_TAGS = ['demo5', 'disputes'];

const client = new HindsightClient({
  baseUrl: process.env.HINDSIGHT_API_URL ?? 'https://api.hindsight.vectorize.io',
  apiKey: process.env.HINDSIGHT_API_KEY,
});

const T = transactions as Transaction[];
const resolved = (disputes as Dispute[]).filter((d) => d.status === 'RESOLVED');

/** The artifact a real dispute platform would emit when a case closes. */
function caseRecord(d: Dispute): string {
  const t = T.find((x) => x.transaction_id === d.transaction_id)!;
  return [
    `CASE RESOLUTION RECORD — ${d.dispute_id}`,
    `Cardholder: ${d.customer_id}`,
    `Disputed transaction: ${t.transaction_id}  ${t.posted_date}  ${t.descriptor}  $${t.amount.toFixed(2)}`,
    `Channel: ${t.channel}`,
    `Opened: ${d.opened_date}    Closed: ${d.resolution_date}    Analyst: ${d.analyst}`,
    `Cardholder claim: "${d.customer_claim}"`,
    `Reason code at intake: ${d.reason_code}`,
    `Outcome: ${d.resolution}`,
    ``,
    `Analyst resolution note:`,
    d.resolution_note ?? '',
  ].join('\n');
}

async function main() {
  console.log(`bank: ${BANK}`);
  if (process.argv.includes('--fresh')) {
    await client.deleteBank(BANK).then(() => console.log('  dropped existing bank')).catch(() => {});
  }
  // enableObservations is required: mental-model reflect runs over consolidated
  // observations, not raw facts. Without it a refresh returns
  // reflect_skipped: "no_sources_in_scope" and the page stays empty.
  await client.createBank(BANK, {
    reflectMission: MISSION,
    enableObservations: true,
    observationsMission: OBSERVATIONS_MISSION,
  }).catch((e) => {
    console.log(`  createBank: ${e?.message ?? e} (continuing — may already exist)`);
  });

  for (const d of resolved) {
    // Tags are the mental model's scope, not decoration: createMentalModel
    // resolves sources with tags_match "all_strict", so these must match the
    // tags on the model or the refresh sees nothing.
    await client.retain(BANK, caseRecord(d), { tags: MEMORY_TAGS });
    console.log(`  retained ${d.dispute_id}  ${d.resolution}`);
  }

  // retain() extraction and observation consolidation are asynchronous server
  // side. Refreshing immediately is what produced an empty page on the first
  // attempt, so wait until the bank actually has observations in scope.
  process.stdout.write('  waiting for observation consolidation');
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const probe = (await client.recall(BANK, SOURCE_QUERY, { factTypes: ['observation'] } as never)) as { results?: unknown[] };
    const n = probe.results?.length ?? 0;
    if (n > 0) { console.log(`\n  observations in scope: ${n}`); break; }
    process.stdout.write('.');
  }

  const created = await client.createMentalModel(BANK, MODEL_NAME, SOURCE_QUERY, {
    tags: MEMORY_TAGS,
  });
  const id = (created as { id?: string; mental_model_id?: string }).id
    ?? (created as { mental_model_id?: string }).mental_model_id!;
  console.log(`\nmental model: ${id}`);

  await client.refreshMentalModel(BANK, id);
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const mm = await client.getMentalModel(BANK, id, { detail: 'full' });
    const content = (mm as { content?: string }).content;
    if (content) {
      console.log('\n' + '='.repeat(72));
      console.log(content);
      console.log('='.repeat(72));
      return;
    }
    process.stdout.write('.');
  }
  console.log('\nno content after polling — inspect manually');
}

main().catch((e) => { console.error('FAILED:', e?.message ?? e); process.exit(1); });
