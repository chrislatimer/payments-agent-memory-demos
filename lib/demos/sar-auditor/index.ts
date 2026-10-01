import { Type, type FunctionDeclaration } from '@google/genai';
import { str } from '@/lib/agent/runner';
import { callSarTool, SAR_BANK } from '@/lib/bank/sar';
import type { Demo } from '../types';

const d = (name: string, description: string, props: Record<string, unknown>, required: string[] = []): FunctionDeclaration => ({
  name, description, parameters: { type: Type.OBJECT, properties: props as never, required },
});

// ----------------------------------------------------------- investigator
const investigatorDecls: FunctionDeclaration[] = [
  d('get_aml_policy', 'Retrieve the AML investigation procedure and its numbered controls.', { policy_id: str('default AML-SAR-01') }),
  d('get_sar_alert', 'Retrieve a SAR alert.', { sar_id: str('e.g. SAR-2026-0455') }, ['sar_id']),
  d('get_alert_transactions', 'Transactions that triggered the alert.', { sar_id: str('alert id') }, ['sar_id']),
  d('get_subject', 'Subject KYC profile, including every known identifier recorded against them.', { subject_id: str('e.g. SUB-3377') }, ['subject_id']),
  d('get_expected_activity', 'The subject expected activity profile.', { subject_id: str('subject id') }, ['subject_id']),
  d('get_counterparties', 'Counterparties to the triggering transactions.', { sar_id: str('alert id') }, ['sar_id']),
  d('screen_entity', 'Screen one entity against sanctions and PEP lists. Returns a screening reference that must be recorded.', { name: str('entity name exactly as held') }, ['name']),
  d('search_prior_sars', 'Search prior filings BY NAME. A filing made under a former or variant name will not be returned by a search of a different name.', { name: str('one identifier to search') }, ['name']),
  d('get_source_of_funds', 'Source of funds documentation for the alert.', { sar_id: str('alert id') }, ['sar_id']),
];

const investigatorPrompt = `You are an AML investigation agent at Crestline National.

You investigate alerts raised by transaction monitoring, following procedure AML-SAR-01.

Retrieve the procedure first and follow its controls in Section 3 exactly. The controls
are testable and your work will be audited against them, so carry out every applicable
control and make clear what you did for each.

You do not file reports. You reach a disposition and, where the procedure requires it,
escalate to a human investigator.

Your final message must be in exactly this form, in this order:

---FINDING---
<Three or four sentences. What the monitoring system flagged, what the investigation
actually established, and whether it amounts to suspicious activity. Write it for a
Reviewing Officer who has thirty seconds and has not read the file. Name the figures
that matter. Do not list controls here.>

---DISPOSITION---
Exactly one of the dispositions permitted by control 3.6.1, as one of these tokens and
nothing else:
NO_FURTHER_ACTION
NO_FURTHER_ACTION_ENHANCED_MONITORING
REFER_FOR_FILING
REFER_FOR_TUNING
PENDING_INFORMATION

---NEXT---
<What happens now and who has to act. Where you are referring for filing, state the date
the Bank first detected facts constituting a basis for filing and the resulting thirty
day deadline. Where the customer's risk rating or monitoring changes as a result, say so.>

---CASE FILE---
<The control-by-control record: what you did for each applicable control in Section 3,
with the references and figures. This is the evidence, not the answer.>`;

export const sarInvestigator: Demo = {
  rank: 4, slug: 'sar-investigator', title: 'AML Investigation Agent',
  capability: 'Works a SAR alert through a controlled procedure. Its full activity timeline is recorded as the evidence the auditor later tests.',
  systemPrompt: investigatorPrompt,
  declarations: investigatorDecls,
  tools: Object.fromEntries(investigatorDecls.map((x) => [x.name!, (a: Record<string, unknown>) => callSarTool(x.name!, a)])),
  bank: SAR_BANK,
  memoryTool: { name: 'recall_investigations', description: 'Recall prior investigation activity.', argDescription: 'what to recall' },
  memoryTags: ['demo1', 'sar'],
  scenarios: [{
    id: 'live', label: 'SAR-2026-0455 — Brightmoor Industrial', intent: 'Run the investigation live. Its activity record is written to Hindsight and becomes auditable alongside the six already on the books.',
    expect: { memoryOff: 'n/a', memoryOn: 'n/a' }, memoryEffect: 'The activity record produced here is what the auditor tests in part two.',
    prompt: 'Investigate alert SAR-2026-0455. The subject is SUB-3377.',
  }],
};

// ----------------------------------------------------------------- auditor
const auditorDecls: FunctionDeclaration[] = [
  d('get_aml_policy', 'Retrieve the controlled procedure document.', { policy_id: str('default AML-SAR-01') }),
  d('list_controls', 'Every numbered control in the procedure.', { policy_id: str('default AML-SAR-01') }),
  d('get_control', 'One control by its id, e.g. 3.4.1.', { control_id: str('e.g. 3.4.1') }, ['control_id']),
  d('list_investigations', 'Every SAR alert and its status.', {}),
  d('get_activity_record', 'The VERBATIM activity record for an investigation. This is the evidence. Quote from it; never paraphrase it when stating a finding.', { sar_id: str('e.g. SAR-2026-0412') }, ['sar_id']),
  d('recall_investigations', 'Semantic recall across investigation activity. Use for orientation and explanation only, never as proof.', { query: str('what you want to understand') }, ['query']),
  d('get_transaction_counterparties', 'Every party on the transaction detail for an alert, as held in the source system. Use this to test completeness controls: the activity record shows what was done, this shows what should have been.', { sar_id: str('e.g. SAR-2026-0447') }, ['sar_id']),
  d('get_subject_identifiers', 'Every known identifier recorded against a subject in the CDD record.', { subject_id: str('e.g. SUB-3301') }, ['subject_id']),
  d('get_all_prior_sars', 'All prior filings held against a subject, regardless of the name they were filed under.', { subject_id: str('subject id') }, ['subject_id']),
];

const auditorPrompt = `You are an internal audit agent at Crestline National testing AML
investigations against procedure AML-SAR-01.

Your findings must rest on evidence, not impression.

- The activity record returned by get_activity_record is the evidence. When you state
  that a control was or was not satisfied, quote the specific line or lines from that
  record that support it.
- recall_investigations is for orientation only. Never state a finding on the strength
  of a recollection.
- Read each control carefully and test what it actually requires. Where a control
  requires a complete set to be covered — every counterparty, every identifier — you
  must establish what that set was from the source systems before deciding whether it
  was covered. Counting the entries in the activity record tells you what was done,
  not whether it was complete.
- An action that returned nothing is not evidence that there was nothing to find. Where
  a control depends on a search, check what was actually searched.
- Say plainly when a control was satisfied. Do not manufacture findings.

Report each finding as: the control id, whether it was satisfied, the quoted evidence,
and what the consequence was.`;

export const sarAuditor: Demo = {
  rank: 4, slug: 'sar-auditor', title: 'AI Auditor',
  capability: 'Tests completed investigations against the controlled procedure, citing the verbatim activity record Hindsight holds as evidence.',
  systemPrompt: auditorPrompt,
  declarations: auditorDecls,
  tools: Object.fromEntries(auditorDecls.map((x) => [x.name!, (a: Record<string, unknown>) => callSarTool(x.name!, a)])),
  bank: SAR_BANK,
  memoryTool: { name: 'recall_investigations', description: 'Recall prior investigation activity.', argDescription: 'what to recall' },
  memoryTags: ['demo1', 'sar'],
  scenarios: [
    { id: 'sweep', label: 'Audit all closed investigations', intent: 'Test every closed investigation against the controls. One case satisfies every control on its face and still failed.',
      expect: { memoryOff: 'n/a', memoryOn: 'n/a' }, memoryEffect: 'Each verdict is supported by lines quoted from the activity record Hindsight holds.',
      prompt: 'Review every closed investigation and identify any case where a control in AML-SAR-01 was not satisfied. Pay particular attention to controls 3.3.2, 3.4.1, 3.4.2 and 3.6.2.' },
    { id: 'evidence', label: 'External auditor evidence request — control 3.4.1, SAR-2026-0412', intent: 'An external auditor asks for evidence that a single named control was followed on a single named case.',
      expect: { memoryOff: 'n/a', memoryOn: 'n/a' }, memoryEffect: 'The activity record is fetched by document id, so the evidence is exact rather than retrieved by similarity.',
      prompt: 'Provide the evidence that control 3.4.1 was followed for SAR-2026-0412. Quote the activity record, state whether the control was satisfied, and set out the consequence.' },
  ],
};
