import { runAgent } from '@/lib/agent/runner';
import { sarInvestigator, sarAuditor } from '@/lib/demos/sar-auditor';
import { hindsight } from '@/lib/hindsight/recall';
import { SAR_BANK, sarAlerts, sarSubjects } from '@/lib/bank/sar';
import { formatActivity, type Step } from '@/lib/demos/sar-auditor/activity';

export const runtime = 'nodejs';
export const maxDuration = 300;

const clock = () => new Date().toISOString().slice(11, 19);

export async function POST(req: Request) {
  const { mode, sar_id, prompt } = (await req.json()) as {
    mode: 'investigate' | 'audit';
    sar_id?: string;
    prompt?: string;
  };

  const demo = mode === 'investigate' ? sarInvestigator : sarAuditor;
  const text = prompt ?? demo.scenarios[0].prompt;

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
      const steps: Step[] = [];
      let answer = '';
      const opened = new Date().toISOString();

      try {
        for await (const event of runAgent(demo, { prompt: text, memory: false, maxTurns: 24 })) {
          if (event.kind === 'tool') {
            // The activity record is built from what actually happened, not
            // from what the agent says it did.
            steps.push({
              at: clock(),
              action: `${event.name}(${Object.entries(event.args).map(([k, v]) => `${k}="${v}"`).join(', ')})`,
              detail: summarise(event.name, event.result),
            });
          }
          if (event.kind === 'text') answer = event.text;
          send(event);
        }

        if (mode === 'investigate' && sar_id) {
          const alert = sarAlerts.find((a) => a.sar_id === sar_id);
          const subject = sarSubjects.find((s) => s.subject_id === alert?.subject_id);
          const token = answer.match(/---DISPOSITION---\s*([A-Z_]+)/)?.[1] ?? 'NO_FURTHER_ACTION';
          const disposition = ({
            NO_FURTHER_ACTION: 'No further action',
            NO_FURTHER_ACTION_ENHANCED_MONITORING: 'No further action — enhanced monitoring',
            REFER_FOR_FILING: 'Refer for filing',
            REFER_FOR_TUNING: 'Refer for tuning',
            PENDING_INFORMATION: 'Pending information',
          } as Record<string, string>)[token] ?? token;
          const record = formatActivity({
            sar_id,
            subject: subject?.legal_name ?? 'unknown',
            subject_id: alert?.subject_id ?? 'unknown',
            policy: 'AML-SAR-01 v4.2',
            risk_tier: (alert as { risk_tier?: number } | undefined)?.risk_tier ?? 2,
            disposition_sla: ({ 1: '10 business days', 2: '20 business days', 3: '30 business days' } as Record<number, string>)[(alert as { risk_tier?: number } | undefined)?.risk_tier ?? 2],
            investigator: 'AML Investigation Agent v1.4',
            opened,
            closed: new Date().toISOString(),
            steps,
            disposition,
            rationale: (answer.match(/---FINDING---([\s\S]*?)(?=---[A-Z ]+---|$)/)?.[1] ?? answer).trim().slice(0, 900),
            escalated: token === 'REFER_FOR_FILING',
            second_level_signoff: null,
          });
          // documentId = the SAR id, so the auditor can fetch it exactly.
          await hindsight.retain(SAR_BANK, record, { documentId: sar_id, tags: ['demo1', 'sar'] });
          send({ kind: 'recorded', sar_id, record });
        }
      } catch (err) {
        send({
          kind: 'failed', source: 'bank-systems',
          message: 'The demo harness failed while running this agent.',
          detail: (err as Error)?.message ?? String(err),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
  });
}

function summarise(name: string, result: unknown): string {
  const r = result as Record<string, unknown>;
  if (!r || typeof r !== 'object') return String(result).slice(0, 160);
  if (name === 'screen_entity') return `${r.sanctions_match || r.pep_match ? 'MATCH' : 'no match'}; screening reference ${r.screening_reference}`;
  if (name === 'search_prior_sars') return `${r.results} result${r.results === 1 ? '' : 's'}`;
  if (name === 'get_activity_record') return r.error ? String(r.error) : 'verbatim activity record returned';
  if (r.error) return `error: ${r.error}`;
  const json = JSON.stringify(r);
  return json.length > 170 ? json.slice(0, 167) + '…' : json;
}
