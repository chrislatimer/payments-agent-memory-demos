/**
 * Seed the wires bank with past support conversations.
 *
 * Separate bank from demo #5 so neither demo's memory can leak into the
 * other. Transcripts go in verbatim — the point is that useful operational
 * knowledge is already sitting in conversation logs nobody reads again.
 */
import 'dotenv/config';
import { HindsightClient } from '@vectorize-io/hindsight-client';
import { TRANSCRIPTS } from '../lib/demos/wire-exception/transcripts';

const BANK = process.env.HINDSIGHT_WIRES_BANK ?? 'crestline-wires-demo';
const TAGS = ['demo4', 'wires'];

const MISSION = [
  'I help business banking customers of Crestline National understand what happened',
  'to their payments. I learn, from past support conversations, what specific',
  'beneficiary banks and corridors actually require and what fixes have worked',
  'before for this customer. I never state a requirement from memory alone:',
  'memory tells me where to look, and the bank records and corridor rules decide.',
].join(' ');

const OBSERVATIONS_MISSION = [
  'Synthesise reusable knowledge from past customer support conversations about',
  'payments: what a specific beneficiary bank or corridor requires, which fields',
  'were missing when a payment failed, what change made a resubmission succeed,',
  'and what the customer was told about repairing versus resubmitting.',
].join(' ');

const client = new HindsightClient({
  baseUrl: process.env.HINDSIGHT_API_URL ?? 'https://api.hindsight.vectorize.io',
  apiKey: process.env.HINDSIGHT_API_KEY,
});

async function main() {
  console.log(`bank: ${BANK}`);
  if (process.argv.includes('--fresh')) {
    await client.deleteBank(BANK).then(() => console.log('  dropped existing bank')).catch(() => {});
  }
  await client.createBank(BANK, {
    reflectMission: MISSION,
    enableObservations: true,
    observationsMission: OBSERVATIONS_MISSION,
  }).catch((e) => console.log(`  createBank: ${e?.message ?? e} (continuing)`));

  for (const t of TRANSCRIPTS) {
    await client.retain(BANK, `SUPPORT CONVERSATION ${t.id}\nDate: ${t.date}\nSubject: ${t.title}\n\n${t.body}`, { tags: TAGS });
    console.log(`  retained ${t.id}  ${t.title}`);
  }

  process.stdout.write('  waiting for observation consolidation');
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const probe = (await client.recall(BANK, 'beneficiary address requirements Mexico returned wire')) as { results?: unknown[] };
    if ((probe.results?.length ?? 0) > 0) { console.log(`\n  facts in scope: ${probe.results!.length}`); break; }
    process.stdout.write('.');
  }
  console.log('done');
}
main().catch((e) => { console.error('FAILED:', e?.message ?? e); process.exit(1); });
