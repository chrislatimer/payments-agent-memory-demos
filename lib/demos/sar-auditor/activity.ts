/**
 * Investigation activity records.
 *
 * This is the evidence. It is retained to Hindsight under a caller-supplied
 * documentId equal to the SAR id, so an evidence request is an exact document
 * fetch rather than a search. Semantic recall is layered on top to explain
 * what happened; the document itself is what is quoted.
 */
export type Step = { at: string; action: string; detail: string };

export type ActivityRecord = {
  sar_id: string;
  subject: string;
  subject_id: string;
  policy: string;
  risk_tier: number;
  disposition_sla: string;
  investigator: string;
  opened: string;
  closed: string;
  steps: Step[];
  disposition: string;
  rationale: string;
  escalated: boolean;
  second_level_signoff: string | null;
};

export function formatActivity(r: ActivityRecord): string {
  return [
    `INVESTIGATION ACTIVITY RECORD`,
    `SAR: ${r.sar_id}`,
    `Subject: ${r.subject} (${r.subject_id})`,
    `Procedure: ${r.policy}`,
    `Risk tier: ${r.risk_tier}    Disposition SLA: ${r.disposition_sla}`,
    `Investigator: ${r.investigator}`,
    `Opened: ${r.opened}`,
    `Closed: ${r.closed}`,
    ``,
    `ACTIONS TAKEN`,
    ...r.steps.map((s) => `${s.at}  ${s.action}`.padEnd(64) + `-> ${s.detail}`),
    ``,
    `REFERRED TO MLRO: ${r.escalated ? 'YES' : 'NO'}`,
    `REVIEWING OFFICER APPROVAL: ${r.second_level_signoff ?? 'NONE'}`,
    `DISPOSITION: ${r.disposition}`,
    `RATIONALE: ${r.rationale}`,
  ].join('\n');
}
