/** SAR / AML source systems, plus evidence retrieval from the audit bank. */
import subjects from '@/data/seed/subjects.json';
import alerts from '@/data/seed/sar_alerts.json';
import counterparties from '@/data/seed/counterparties.json';
import priorSars from '@/data/seed/prior_sars.json';
import { hindsight } from '@/lib/hindsight/recall';
import { listControls, getControl, getPolicy } from '@/lib/demos/sar-auditor/policies';

export const SAR_BANK = process.env.HINDSIGHT_SAR_BANK ?? 'crestline-sar-audit';

type Subject = (typeof subjects)[number];
type Alert = (typeof alerts)[number];

const SUB = subjects as Subject[];
const AL = alerts as Alert[];
const CP = counterparties as { sar_id: string; name: string; country: string; amount_usd: number }[];
const PRIOR = priorSars as { prior_id: string; filed_under_name: string; subject_id: string; filed: string; typology: string; outcome: string }[];

let screenSeq = 886100;

/** Tools the investigating agent uses. */
export const sarTools = {
  get_sar_alert: ({ sar_id }: { sar_id: string }) => AL.find((a) => a.sar_id === sar_id) ?? { error: 'not_found' },

  get_alert_transactions: ({ sar_id }: { sar_id: string }) => {
    const rows = CP.filter((c) => c.sar_id === sar_id);
    return { sar_id, count: rows.length, inbound_total_usd: rows.reduce((s, r) => s + r.amount_usd, 0), transactions: rows };
  },

  get_subject: ({ subject_id }: { subject_id: string }) => SUB.find((s) => s.subject_id === subject_id) ?? { error: 'not_found' },

  get_expected_activity: ({ subject_id }: { subject_id: string }) => {
    const s = SUB.find((x) => x.subject_id === subject_id);
    return s ? { subject_id, expected_activity: s.expected_activity } : { error: 'not_found' };
  },

  get_counterparties: ({ sar_id }: { sar_id: string }) => ({ sar_id, counterparties: CP.filter((c) => c.sar_id === sar_id) }),

  screen_entity: ({ name }: { name: string }) => ({
    entity: name, sanctions_match: false, pep_match: false, screening_reference: `SCR-26-${++screenSeq}`,
  }),

  /**
   * Searches prior filings by NAME, exactly as the real index does. An entity
   * filed under a former name will not be returned by a search of its current
   * name — which is precisely why control 3.4.1 requires every known
   * identifier to be searched.
   */
  search_prior_sars: ({ name }: { name: string }) => {
    const q = String(name).trim().toLowerCase();
    const hits = PRIOR.filter((p) => p.filed_under_name.toLowerCase() === q);
    return { searched_name: name, results: hits.length, prior_reports: hits };
  },

  get_source_of_funds: ({ sar_id }: { sar_id: string }) => {
    const a = AL.find((x) => x.sar_id === sar_id);
    if (!a) return { error: 'not_found' };
    return { sar_id, documented: true, basis: 'Settlement receipts and counterparty invoices held on file.', inbound_total_usd: a.inbound_total_usd };
  },

  get_aml_policy: ({ policy_id }: { policy_id?: string }) => {
    const p = getPolicy(policy_id ?? 'AML-SAR-01');
    return p ? { policy_id: p.id, title: p.title, markdown: p.markdown } : { error: 'not_found' };
  },
};

/** Tools the auditor uses. */
export const auditTools = {
  list_investigations: () => ({
    investigations: AL.map((a) => {
      const s = SUB.find((x) => x.subject_id === a.subject_id);
      return { sar_id: a.sar_id, subject: s?.legal_name, subject_id: a.subject_id, typology: a.typology, status: a.status, generated: a.generated };
    }),
  }),

  list_controls: ({ policy_id }: { policy_id?: string }) => ({ controls: listControls(policy_id ?? 'AML-SAR-01') }),

  get_control: ({ control_id }: { control_id: string }) => getControl(control_id) ?? { error: 'not_found' },

  /** Verbatim activity record. This is the evidence; it is never paraphrased. */
  get_activity_record: async ({ sar_id }: { sar_id: string }) => {
    const d = (await hindsight.getDocument(SAR_BANK, sar_id).catch(() => null)) as { original_text?: string } | null;
    if (!d?.original_text) return { error: 'no_activity_record', sar_id };
    return { sar_id, verbatim: true, activity_record: d.original_text };
  },

  /** Semantic recall across investigations, for explanation rather than proof. */
  recall_investigations: async ({ query }: { query: string }) => {
    const r = (await hindsight.recall(SAR_BANK, String(query)).catch(() => null)) as { results?: { text: string }[] } | null;
    return { query, recalled: (r?.results ?? []).slice(0, 8).map((f) => f.text), note: 'Recollection, not evidence. Quote the activity record for proof.' };
  },

  /** The complete set of parties on the transaction detail. Without this the
   *  auditor cannot test a completeness control like 3.3.2: it can see what
   *  was screened but not what should have been. */
  get_transaction_counterparties: ({ sar_id }: { sar_id: string }) => {
    const rows = CP.filter((c) => c.sar_id === sar_id);
    return { sar_id, count: rows.length, counterparties: rows.map((r) => ({ name: r.name, country: r.country, amount_usd: r.amount_usd })) };
  },

  get_subject_identifiers: ({ subject_id }: { subject_id: string }) => {
    const s = SUB.find((x) => x.subject_id === subject_id);
    return s ? { subject_id, legal_name: s.legal_name, known_identifiers: s.known_identifiers } : { error: 'not_found' };
  },

  get_all_prior_sars: ({ subject_id }: { subject_id: string }) => ({
    subject_id, prior_reports: PRIOR.filter((p) => p.subject_id === subject_id),
  }),

  get_aml_policy: sarTools.get_aml_policy,
};

export async function callSarTool(name: string, args: Record<string, unknown>) {
  const fn = ({ ...sarTools, ...auditTools } as Record<string, (a: never) => unknown>)[name];
  if (!fn) return { error: `unknown_tool:${name}` };
  return await fn(args as never);
}

export const sarAlerts = AL;
export const sarSubjects = SUB;
