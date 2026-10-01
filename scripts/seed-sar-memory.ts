/**
 * Load the six completed investigations into the audit bank.
 *
 * Each record is retained under documentId = its SAR id, so an evidence
 * request later is an exact document fetch, not a search.
 */
import 'dotenv/config';
import { HindsightClient } from '@vectorize-io/hindsight-client';
import { PRERECORDED } from '../lib/demos/sar-auditor/prerecorded';
import { formatActivity } from '../lib/demos/sar-auditor/activity';

const BANK = process.env.HINDSIGHT_SAR_BANK ?? 'crestline-sar-audit';
const TAGS = ['demo1', 'sar'];

const client = new HindsightClient({
  baseUrl: process.env.HINDSIGHT_API_URL ?? 'https://api.hindsight.vectorize.io',
  apiKey: process.env.HINDSIGHT_API_KEY,
});

async function main() {
  if (process.argv.includes('--fresh')) {
    await client.deleteBank(BANK).then(() => console.log('dropped bank')).catch(() => {});
  }
  await client.createBank(BANK, {
    reflectMission:
      'I hold the activity records of AML investigations carried out by agents at Crestline National. '
      + 'My purpose is evidence: what was actually done on a case, in what order, and what was not done.',
    enableObservations: true,
    observationsMission:
      'Record what each investigation did and did not do against the controls in AML-SAR-01: which '
      + 'entities were screened, which identifiers were searched for prior reports, whether escalation '
      + 'occurred, what disposition was reached and who signed it off.',
  }).catch((e) => console.log(`createBank: ${e?.message ?? e}`));

  for (const r of PRERECORDED) {
    await client.retain(BANK, formatActivity(r), { documentId: r.sar_id, tags: TAGS });
    console.log(`  retained ${r.sar_id}  (documentId=${r.sar_id})  ${r.disposition}`);
  }

  // Verify exact retrieval, which is what the evidence request depends on.
  const doc = (await client.getDocument(BANK, 'SAR-2026-0412').catch(() => null)) as { original_text?: string } | null;
  console.log(`\ngetDocument(SAR-2026-0412) -> ${doc ? `${(doc.original_text ?? '').length} chars` : 'NOT FOUND'}`);
  if (doc?.original_text) console.log(doc.original_text.split('\n').slice(0, 4).join('\n'));
}
main().catch((e) => { console.error('FAILED:', e?.message ?? e); process.exit(1); });
