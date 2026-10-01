'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import Markdown from '@/app/components/Markdown';

type Alert = { sar_id: string; subject: string; subject_id: string; typology: string; generated: string; risk_score: number; status: string; inbound_total_usd: number; narrative: string };
type Control = { id: string; section: string; text: string };
type Prompt = { id: string; label: string; intent: string; prompt: string };
type Ev =
  | { kind: 'tool'; name: string; args: Record<string, unknown>; result: unknown; ms: number }
  | { kind: 'text'; text: string }
  | { kind: 'retry'; source: string; attempt: number; status?: number; message: string }
  | { kind: 'failed'; source: string; status?: number; message: string; detail: string }
  | { kind: 'recorded'; sar_id: string; record: string }
  | { kind: 'done'; toolCalls: number; memoryCalls: number; turns: number };

const usd = (n: number) => '$' + n.toLocaleString('en-US');

/** The dispositions permitted by control 3.6.1. */
const DISPOSITION: Record<string, { label: string; chip: string; box: string }> = {
  NO_FURTHER_ACTION: { label: 'NO FURTHER ACTION', chip: 'bg-emerald-500 text-neutral-950', box: 'border-emerald-300 bg-emerald-50' },
  NO_FURTHER_ACTION_ENHANCED_MONITORING: { label: 'NO FURTHER ACTION · ENHANCED MONITORING', chip: 'bg-sky-400 text-neutral-950', box: 'border-sky-300 bg-sky-50' },
  REFER_FOR_FILING: { label: 'REFER FOR FILING', chip: 'bg-amber-500 text-neutral-950', box: 'border-amber-300 bg-amber-50' },
  REFER_FOR_TUNING: { label: 'REFER FOR TUNING', chip: 'bg-violet-400 text-neutral-950', box: 'border-violet-300 bg-violet-50' },
  PENDING_INFORMATION: { label: 'PENDING INFORMATION', chip: 'bg-neutral-400 text-neutral-950', box: 'border-neutral-300 bg-neutral-50' },
};

const SOURCE_LABEL: Record<string, string> = {
  'model-provider': 'Google Gemini API',
  hindsight: 'Hindsight',
  'bank-systems': 'Demo harness',
};

export default function SarDemo({ alerts, policy, controls, auditPrompts }: {
  alerts: Alert[]; policy: { id: string; title: string; markdown: string }; controls: Control[]; auditPrompts: Prompt[];
}) {
  const [tab, setTab] = useState<'queue' | 'audit' | 'policy'>('queue');
  const [events, setEvents] = useState<Ev[]>([]);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState(auditPrompts[1]?.prompt ?? '');
  const [openControl, setOpenControl] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<'analysis' | 'evidence'>('analysis');
  const abort = useRef<AbortController | null>(null);

  const tools = events.filter((e) => e.kind === 'tool') as Extract<Ev, { kind: 'tool' }>[];
  const answer = ([...events].reverse().find((e) => e.kind === 'text') as Extract<Ev, { kind: 'text' }> | undefined)?.text ?? '';
  const failure = events.find((e) => e.kind === 'failed') as Extract<Ev, { kind: 'failed' }> | undefined;
  const retries = events.filter((e) => e.kind === 'retry') as Extract<Ev, { kind: 'retry' }>[];
  const recorded = events.find((e) => e.kind === 'recorded') as Extract<Ev, { kind: 'recorded' }> | undefined;

  /**
   * The verbatim activity records Hindsight returned this run. The auditor's
   * prose is its reading of these; an audit demo that shows only the reading
   * is asking the room to take the conclusion on trust.
   */
  const evidence = tools
    .filter((t) => t.name === 'get_activity_record')
    .map((t) => t.result as { sar_id?: string; activity_record?: string; error?: string })
    .filter((r) => r?.activity_record);

  // The investigator answers in sections. Showing the control recital without
  // the finding on top is what made the first version unreadable.
  const section = (name: string) => {
    const m = answer.match(new RegExp(`---${name}---([\\s\\S]*?)(?=---[A-Z ]+---|$)`));
    return m ? m[1].trim() : '';
  };
  const finding = section('FINDING');
  const disposition = section('DISPOSITION').replace(/[^A-Z_]/g, '');
  const next = section('NEXT');
  const caseFile = section('CASE FILE');

  const run = useCallback(async (body: Record<string, unknown>, label: string) => {
    abort.current?.abort();
    const ac = new AbortController(); abort.current = ac;
    setEvents([]); setBusy(true); setRunning(label); setResultTab('analysis');
    try {
      const res = await fetch('/api/sar/investigate', {
        method: 'POST', signal: ac.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const reader = res.body!.getReader(); const dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n'); buf = parts.pop() ?? '';
        for (const p of parts) {
          const line = p.replace(/^data: /, '').trim();
          if (line) setEvents((prev) => [...prev, JSON.parse(line) as Ev]);
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setEvents((p) => [...p, { kind: 'failed', source: 'bank-systems', message: 'The request to the demo harness failed.', detail: String(e) }]);
      }
    } finally { setBusy(false); }
  }, []);

  return (
    <div className="flex h-screen flex-col bg-[#f4f6f9] text-neutral-800">
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 bg-white px-4 py-2 text-sm">
        <Link href="/" className="text-neutral-500 hover:text-neutral-700">← All demos</Link>
        <span className="rounded bg-neutral-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Presenter</span>
        <span className="text-neutral-700">#1 AI Auditor — Financial Crime Compliance</span>
        <div className="ml-4 flex gap-1">
          {(['queue', 'audit', 'policy'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded px-3 py-1 text-xs capitalize ${tab === t ? 'bg-sky-500 font-semibold text-neutral-950' : 'bg-neutral-200 text-neutral-500'}`}>
              {t === 'queue' ? 'Alert queue' : t === 'audit' ? 'Audit' : 'Procedure'}
            </button>
          ))}
        </div>
        {busy && <span className="ml-auto animate-pulse font-mono text-xs text-neutral-500">{running} · {tools.length} actions</span>}
      </div>

      {/* provider-attributed failure banner */}
      {failure && (
        <div className="border-b border-red-300 bg-red-50 px-4 py-2.5">
          <p className="text-sm font-semibold text-red-900">
            {SOURCE_LABEL[failure.source] ?? failure.source} failed{failure.status ? ` — HTTP ${failure.status}` : ''}
          </p>
          <p className="mt-0.5 text-xs text-red-800">{failure.message}</p>
          <p className="mt-1 font-mono text-[11px] text-red-700">{failure.detail.slice(0, 300)}</p>
          {failure.source === 'model-provider' && (
            <p className="mt-1 text-[11px] text-red-800">
              This is the language model provider, not Hindsight. Memory retrieval was unaffected.
            </p>
          )}
        </div>
      )}
      {!!retries.length && !failure && (
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-1.5 text-xs text-amber-800">
          Recovered after {retries.length} retry{retries.length === 1 ? '' : 'ies'} to {SOURCE_LABEL[retries[0].source]}
          {retries[0].status ? ` (HTTP ${retries[0].status})` : ''}. Hindsight unaffected.
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* ---------------- left ---------------- */}
        <div className="min-h-0 overflow-y-auto border-r border-neutral-200 p-5">
          {tab === 'queue' && (
            <>
              <h1 className="text-lg font-semibold">Suspicious activity alerts</h1>
              <p className="mt-1 text-xs text-neutral-500">Transaction monitoring · investigated under {policy.id}</p>
              <table className="mt-4 w-full text-xs">
                <thead className="text-left text-neutral-500">
                  <tr className="border-b border-neutral-200">
                    <th className="py-2 pr-4 font-medium">Alert</th>
                    <th className="pr-4 font-medium">Subject</th>
                    <th className="pr-4 font-medium">Typology</th>
                    <th className="pr-4 text-right font-medium">Inbound</th>
                    <th className="pr-4 text-right font-medium">Risk</th>
                    <th className="pr-4 font-medium">Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => (
                    <tr key={a.sar_id} className="border-b border-neutral-200 align-top">
                      <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-neutral-700">{a.sar_id}</td>
                      <td className="pr-4 text-neutral-900">{a.subject}</td>
                      <td className="pr-4 text-neutral-500">{a.typology}</td>
                      <td className="whitespace-nowrap pr-4 text-right tabular-nums text-neutral-700">{usd(a.inbound_total_usd)}</td>
                      <td className="pr-4 text-right tabular-nums text-neutral-700">{a.risk_score}</td>
                      <td className="pr-4">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          a.status === 'OPEN' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-200 text-neutral-500'}`}>
                          {a.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="pl-2 text-right">
                        {a.status === 'OPEN' && (
                          <button disabled={busy}
                            onClick={() => run({ mode: 'investigate', sar_id: a.sar_id, prompt: `Investigate alert ${a.sar_id}. The subject is ${a.subject_id}.` }, `Investigating ${a.sar_id}`)}
                            className="rounded bg-sky-500 px-2.5 py-1 text-[11px] font-semibold text-neutral-950 disabled:opacity-40">
                            Investigate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[11px] text-neutral-500">
                Six investigations are already on the books. Their activity records are held in Hindsight and can be audited.
              </p>
            </>
          )}

          {tab === 'audit' && (
            <>
              <h1 className="text-lg font-semibold">Audit</h1>
              <div className="mt-4 space-y-2">
                {auditPrompts.map((p) => (
                  <button key={p.id} disabled={busy}
                    onClick={() => run({ mode: 'audit', prompt: p.prompt }, p.label)}
                    className="block w-full rounded-lg border border-neutral-200 p-3 text-left hover:border-sky-500 disabled:opacity-40">
                    <p className="text-sm font-medium text-neutral-800">{p.label}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{p.intent}</p>
                  </button>
                ))}
              </div>
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">External auditor request</p>
                <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} rows={3}
                  className="mt-2 w-full rounded border border-neutral-300 bg-white p-2 text-xs text-neutral-800" />
                <button disabled={busy} onClick={() => run({ mode: 'audit', prompt: customPrompt }, 'Evidence request')}
                  className="mt-2 rounded bg-sky-500 px-4 py-1.5 text-xs font-semibold text-neutral-950 disabled:opacity-40">
                  Request evidence
                </button>
                <p className="mt-2 text-[11px] text-neutral-500">
                  Try: &quot;Provide evidence that control 3.3.2 was followed for SAR-2026-0431.&quot;
                </p>
              </div>
            </>
          )}

          {tab === 'policy' && (
            <>
              <h1 className="text-lg font-semibold">{policy.title}</h1>
              <p className="mt-1 text-xs text-neutral-500">
                The controlled procedure. Held in the bank&apos;s document store, not in memory — the audit has to be against the authoritative text.
              </p>
              <div className="mt-4 space-y-1">
                {controls.map((c) => (
                  <div key={c.id} className="rounded border border-neutral-200">
                    <button onClick={() => setOpenControl(openControl === c.id ? null : c.id)}
                      className="flex w-full items-baseline gap-3 px-3 py-2 text-left hover:bg-white">
                      <span className="font-mono text-xs font-bold text-sky-700">{c.id}</span>
                      <span className="flex-1 truncate text-xs text-neutral-500">{c.text}</span>
                    </button>
                    {openControl === c.id && (
                      <div className="border-t border-neutral-200 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-widest text-neutral-500">{c.section}</p>
                        <p className="mt-1 text-xs leading-relaxed text-neutral-700">{c.text}</p>
                        <button disabled={busy}
                          onClick={() => { setTab('audit'); const q = `Provide the evidence that control ${c.id} was followed for SAR-2026-0412. Quote the activity record, state whether the control was satisfied, and set out the consequence.`; setCustomPrompt(q); run({ mode: 'audit', prompt: q }, `Evidence for ${c.id}`); }}
                          className="mt-2 rounded border border-sky-700 px-2 py-1 text-[11px] text-sky-700 disabled:opacity-40">
                          Request evidence for {c.id}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <details className="mt-5">
                <summary className="cursor-pointer text-xs text-neutral-500">Full procedure text</summary>
                <div className="mt-2 rounded border border-neutral-200 p-3">
                  <Markdown tone="compact">{policy.markdown}</Markdown>
                </div>
              </details>
            </>
          )}
        </div>

        {/* ---------------- right ---------------- */}
        <div className="grid min-h-0 grid-rows-[auto_1fr]">
          <section className="max-h-64 min-h-0 overflow-y-auto border-b border-neutral-200 bg-neutral-50 p-4">
            <h2 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Agent activity</h2>
            {!tools.length && <p className="text-sm text-neutral-500">Nothing running.</p>}
            <ol className="space-y-0.5">
              {tools.map((t, i) => (
                <li key={i} className="flex items-baseline gap-2 font-mono text-[11px]">
                  <span className={t.name === 'get_activity_record' ? 'text-amber-700' : 'text-emerald-600'}>✓</span>
                  <span className="text-neutral-700">{t.name}</span>
                  <span className="truncate text-neutral-500">({Object.values(t.args).join(', ')})</span>
                </li>
              ))}
            </ol>
            {recorded && (
              <details className="mt-3 rounded border border-emerald-300 bg-emerald-50 p-2">
                <summary className="cursor-pointer text-[11px] text-emerald-800">
                  Activity record written to Hindsight · documentId {recorded.sar_id}
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-[10px] leading-relaxed text-emerald-900">{recorded.record}</pre>
              </details>
            )}
          </section>
          <section className="min-h-0 overflow-y-auto p-5">
            <div className="mb-2 flex items-center gap-2">
              <button onClick={() => setResultTab('analysis')}
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                  resultTab === 'analysis' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}>
                Analysis
              </button>
              <button onClick={() => setResultTab('evidence')} disabled={!evidence.length}
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30 ${
                  resultTab === 'evidence' ? 'bg-amber-600 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}>
                Evidence from Hindsight{evidence.length ? ` (${evidence.length})` : ''}
              </button>
            </div>

            {resultTab === 'evidence' && (
              <div className="space-y-3">
                {evidence.map((r, i) => (
                  <div key={i} className="rounded border border-amber-300 bg-amber-50">
                    <div className="flex items-baseline gap-2 border-b border-amber-200 px-3 py-1.5">
                      <span className="font-mono text-[11px] font-semibold text-amber-900">{r.sar_id}</span>
                      <span className="text-[10px] uppercase tracking-widest text-amber-700">
                        verbatim · fetched by document id
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap break-words px-3 py-2 font-mono text-[10px] leading-relaxed text-neutral-800">
{r.activity_record}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {resultTab === 'analysis' && (
              <>
            {!answer && !busy && <p className="text-sm text-neutral-500">Run an investigation or an audit.</p>}
            {busy && !answer && <p className="animate-pulse text-sm text-neutral-500">working…</p>}
            {answer && !finding && <Markdown tone="compact">{answer}</Markdown>}

            {finding && (
              <>
                <div className={`rounded-lg border p-4 ${DISPOSITION[disposition]?.box ?? 'border-neutral-300 bg-neutral-50'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[11px] font-bold tracking-wide ${DISPOSITION[disposition]?.chip ?? 'bg-neutral-500 text-white'}`}>
                      {DISPOSITION[disposition]?.label ?? disposition.replace(/_/g, ' ') ?? 'DISPOSITION'}
                    </span>
                    <span className="text-[11px] uppercase tracking-widest text-neutral-500">Investigator recommendation</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-900">{finding}</p>
                  {next && <p className="mt-3 border-t border-neutral-300/50 pt-2 text-xs text-neutral-700">{next}</p>}
                </div>

                {caseFile && (
                  <details className="mt-4 rounded border border-neutral-200">
                    <summary className="cursor-pointer px-3 py-2 text-xs text-neutral-500">
                      Case file — control-by-control record
                    </summary>
                    <div className="border-t border-neutral-200 px-3 py-2">
                      <Markdown tone="compact">{caseFile}</Markdown>
                    </div>
                  </details>
                )}
              </>
            )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
