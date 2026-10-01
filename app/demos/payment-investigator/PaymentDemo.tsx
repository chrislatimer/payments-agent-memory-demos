'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Markdown from '@/app/components/Markdown';
import type { StatementRow } from '@/lib/bank/statement';

type Scenario = {
  id: string; label: string; prompt: string; intent: string; customer_id: string;
  expect: { memoryOff: string; memoryOn: string };
  memoryEffect: string;
  statement: { customer: { name: string; card_last4: string; addresses: { line1: string; city: string; state: string; postal: string }[] }; rows: StatementRow[]; subscriptions: string[] };
};
type Ev =
  | { kind: 'tool'; name: string; args: Record<string, unknown>; result: unknown; ms: number }
  | { kind: 'memory'; query: string; facts: { text: string }[]; pages: { name: string; content: string }[]; ms: number }
  | { kind: 'text'; text: string }
  | { kind: 'done'; toolCalls: number; memoryCalls: number; turns: number }
  | { kind: 'error'; message: string };

const PROBLEMS = [
  "I don't recognize this transaction.",
  'I was charged for a subscription I cancelled.',
  'I was charged a higher amount than expected.',
  'I never received the product or service.',
  'I was charged more than once for this purchase.',
  "I returned this and haven't received a credit.",
];

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const day = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * What actually happens when a charge is treated as fraud. The reissue is the
 * part nobody counts: it silently breaks every card-on-file subscription the
 * cardholder has. Showing that list is the business case.
 */
function NextSteps({ last4, subscriptions }: { last4: string; subscriptions: string[] }) {
  return (
    <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
      <p className="font-semibold text-amber-900">What happens next</p>
      <ul className="mt-2 space-y-1 text-sm text-amber-900">
        <li>• A dispute has been filed and provisional credit will be applied within 10 business days.</li>
        <li>• Your card ending {last4} has been closed. A replacement arrives in 5–7 business days.</li>
      </ul>
      {!!subscriptions.length && (
        <div className="mt-3 border-t border-amber-200 pt-3">
          <p className="text-sm font-semibold text-amber-900">
            You will need to update your new card with {subscriptions.length} merchants:
          </p>
          <ul className="mt-1.5 grid gap-x-6 gap-y-0.5 text-sm text-amber-800 sm:grid-cols-2">
            {subscriptions.map((d) => <li key={d}>• {d}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function PaymentDemo({ scenarios }: { scenarios: Scenario[] }) {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [memory, setMemory] = useState(false);
  const [step, setStep] = useState<'statement' | 'detail' | 'problem' | 'working' | 'result'>('statement');
  const [sel, setSel] = useState<StatementRow | null>(null);
  const [problem, setProblem] = useState(0);
  const [events, setEvents] = useState<Ev[]>([]);
  const [glass, setGlass] = useState(true);
  const [confirmed, setConfirmed] = useState<null | 'yes' | 'no'>(null);
  const abort = useRef<AbortController | null>(null);

  const scenario = scenarios.find((s) => s.id === scenarioId)!;
  const { customer, rows, subscriptions } = scenario.statement;

  const done = events.find((e) => e.kind === 'done') as Extract<Ev, { kind: 'done' }> | undefined;
  const memEv = events.filter((e) => e.kind === 'memory') as Extract<Ev, { kind: 'memory' }>[];
  const tools = events.filter((e) => e.kind === 'tool') as Extract<Ev, { kind: 'tool' }>[];
  const lastText = [...events].reverse().find((e) => e.kind === 'text') as Extract<Ev, { kind: 'text' }> | undefined;
  // The learned 11-13 month search shows up here. On the guardrail run this is
  // the only visible evidence that memory did anything at all.
  const searchWindows = tools
    .filter((t) => t.name === 'get_transactions')
    .map((t) => `${t.args.from}→${t.args.to}`);

  const { analyst, toCustomer, identified } = useMemo(() => {
    const t = lastText?.text ?? '';
    const ci = t.indexOf('---CUSTOMER---');
    const oi = t.indexOf('---OUTCOME---');
    const head = oi === -1 ? (ci === -1 ? t : t.slice(0, ci)) : t.slice(0, oi);
    const outcome = oi === -1 ? '' : t.slice(oi + 13, ci === -1 ? undefined : ci);
    return {
      analyst: head.trim(),
      toCustomer: ci === -1 ? '' : t.slice(ci + 14).trim(),
      // Default to not-identified: never offer a confirmation the agent did not earn.
      identified: /\bIDENTIFIED\b/.test(outcome) && !/NOT_IDENTIFIED/.test(outcome),
    };
  }, [lastText]);

  const expected = memory ? scenario.expect.memoryOn : scenario.expect.memoryOff;
  const actual = done ? (identified ? 'IDENTIFIED' : 'NOT_IDENTIFIED') : '';
  const matched = !!done && actual === expected;
  // Same outcome in both modes is the guardrail's whole point, so label it.
  const sameOutcome = scenario.expect.memoryOn === scenario.expect.memoryOff;

  const reset = useCallback((toStep: typeof step = 'statement') => {
    abort.current?.abort(); setEvents([]); setConfirmed(null); setStep(toStep);
  }, []);

  const investigate = useCallback(async () => {
    setEvents([]); setConfirmed(null); setStep('working');
    const ac = new AbortController(); abort.current = ac;
    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST', signal: ac.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demo: 'payment-investigator', scenario: scenarioId, memory }),
      });
      const reader = res.body!.getReader(); const dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { done: fin, value } = await reader.read(); if (fin) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n'); buf = parts.pop() ?? '';
        for (const p of parts) {
          const line = p.replace(/^data: /, '').trim();
          if (line) setEvents((prev) => [...prev, JSON.parse(line) as Ev]);
        }
      }
      setStep('result');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') { setEvents((p) => [...p, { kind: 'error', message: String(e) }]); setStep('result'); }
    }
  }, [scenarioId, memory]);

  return (
    <div className="flex h-screen flex-col bg-[#f4f6f9]">
      {/* ---------------- presenter controls (clearly not part of the product) */}
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 bg-white px-4 py-2 text-sm">
        <Link href="/" className="text-neutral-500 hover:text-neutral-900">← All demos</Link>
        <span className="rounded bg-neutral-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Presenter</span>
        <select value={scenarioId} onChange={(e) => { setScenarioId(e.target.value); reset(); setSel(null); }}
          className="rounded border border-neutral-300 bg-[#f4f6f9] px-2 py-1 text-neutral-800">
          {scenarios.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button onClick={() => { setMemory((m) => !m); reset(); setSel(null); }}
          className={`flex items-center gap-1.5 rounded px-3 py-1 font-semibold transition ${memory ? 'bg-emerald-500 text-neutral-950' : 'border border-neutral-400 bg-white text-neutral-700'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${memory ? 'bg-neutral-950' : 'bg-neutral-400'}`} />
          Memory {memory ? 'ON' : 'OFF'}
        </button>
        <button onClick={() => setGlass((g) => !g)} className="rounded border border-neutral-300 px-3 py-1 text-neutral-700">
          {glass ? 'Hide' : 'Show'} behind the glass
        </button>
        <button onClick={() => { reset(); setSel(null); }} className="rounded border border-neutral-300 px-3 py-1 text-neutral-500">Reset</button>
        {done && (
          <span className="ml-auto font-mono text-xs text-neutral-500">
            bank calls <b className="text-base text-neutral-900">{done.toolCalls}</b>
            <span className="ml-3">recalls <b className="text-base text-emerald-700">{done.memoryCalls}</b></span>
          </span>
        )}
      </div>

      {/* What this run is meant to prove, and whether it proved it. Without this
          a correct guardrail run reads as "memory did nothing". */}
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2">
        <span className="text-xs leading-relaxed text-neutral-500">{scenario.intent}</span>
        <span className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[11px]">
          <span className="text-neutral-500">expected</span>
          <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-neutral-700">{expected}</span>
          {done && (
            <>
              <span className="text-neutral-500">→</span>
              <span className="text-neutral-500">got</span>
              <span className={`rounded px-1.5 py-0.5 font-bold ${matched ? 'bg-emerald-500 text-neutral-950' : 'bg-red-500 text-neutral-950'}`}>
                {actual}
              </span>
              <span className={matched ? 'text-emerald-700' : 'text-red-700'}>
                {matched ? (sameOutcome ? '✓ guardrail held' : '✓ outcome changed') : '✗ unexpected'}
              </span>
            </>
          )}
        </span>
      </div>

      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: glass ? 'minmax(0,1.6fr) minmax(0,1fr)' : '1fr' }}>
        {/* ======================= CUSTOMER-FACING BANKING APP ================ */}
        <div className="min-h-0 overflow-y-auto bg-white text-neutral-900">
          <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-8 py-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-[#1b3a6b]" />
              <span className="text-lg font-semibold tracking-tight text-[#1b3a6b]">Crestline National</span>
            </div>
          </header>

          {/* ---- statement ---- */}
          {step === 'statement' && (
            <div className="px-8 py-6">
              <p className="text-sm text-neutral-500">Good afternoon, {customer.name.split(' ')[0]}</p>
              <h1 className="mt-1 text-2xl font-semibold">Crestline Rewards Visa &bull;&bull;{customer.card_last4}</h1>
              <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-neutral-500">Recent transactions</h2>
              <ul className="mt-2 divide-y divide-neutral-200 border-t border-neutral-200">
                {rows.map((r, i) => (
                  <li key={r.transaction_id} className={
                    r.dispute_id ? 'bg-amber-50/60'
                      : rows[i - 1]?.dispute_id ? 'border-t-2 border-neutral-300' : undefined
                  }>
                    <button onClick={() => { setSel(r); setStep('detail'); }}
                      className="flex w-full items-center gap-4 py-3.5 text-left hover:bg-neutral-50">
                      <span className="w-14 shrink-0 text-sm text-neutral-500">{day(r.posted_date)}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{r.descriptor}</span>
                      {r.dispute_id && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Reported</span>}
                      <span className="shrink-0 font-semibold tabular-nums">{money(r.amount)}</span>
                      <span className="shrink-0 text-neutral-700">›</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ---- transaction detail ---- */}
          {step === 'detail' && sel && (
            <div className="px-8 py-6">
              <button onClick={() => setStep('statement')} className="text-sm text-[#1b3a6b]">‹ Back</button>
              <div className="mt-6 border-b border-neutral-200 pb-6">
                <p className="text-4xl font-semibold tabular-nums">{money(sel.amount)}</p>
                <p className="mt-2 text-lg font-medium">{sel.descriptor}</p>
                <p className="mt-1 text-sm text-neutral-500">
                  Posted {new Date(sel.posted_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  {' · '}{sel.channel === 'card_not_present' ? 'Online or phone' : 'In person'}
                </p>
              </div>
              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-neutral-500">Card</dt><dd>Crestline Rewards Visa &bull;&bull;{customer.card_last4}</dd></div>
                <div className="flex justify-between"><dt className="text-neutral-500">Category</dt><dd>Shopping</dd></div>
                <div className="flex justify-between"><dt className="text-neutral-500">Transaction ID</dt><dd className="font-mono text-xs">{sel.transaction_id}</dd></div>
              </dl>
              <button onClick={() => setStep('problem')} disabled={!sel.dispute_id}
                className="mt-8 w-full rounded-md bg-[#1b3a6b] py-3 font-semibold text-white disabled:bg-neutral-200 disabled:text-neutral-500">
                Report a problem
              </button>
              {!sel.dispute_id && <p className="mt-2 text-center text-xs text-neutral-500">This demo covers the reported charge.</p>}
            </div>
          )}

          {/* ---- report a problem ---- */}
          {step === 'problem' && sel && (
            <div className="px-8 py-6">
              <button onClick={() => setStep('detail')} className="text-sm text-[#1b3a6b]">‹ Exit</button>
              <h1 className="mt-8 text-3xl font-light">What doesn&apos;t look right with this transaction?</h1>
              <p className="mt-4 text-sm text-neutral-500">Choose the scenario that best describes what happened.</p>
              <div className="mt-6 space-y-1">
                {PROBLEMS.map((p, i) => (
                  <label key={p} className="flex cursor-pointer items-center gap-4 rounded px-2 py-3 hover:bg-neutral-50">
                    <input type="radio" name="problem" checked={problem === i} onChange={() => setProblem(i)}
                      className="h-5 w-5 accent-[#1b3a6b]" />
                    <span className="text-[15px]">{p}</span>
                  </label>
                ))}
              </div>
              <div className="mt-8 flex justify-end">
                <button onClick={investigate} className="rounded-md bg-[#1b3a6b] px-10 py-3 font-semibold text-white">Next</button>
              </div>
            </div>
          )}

          {/* ---- working ---- */}
          {step === 'working' && (
            <div className="px-8 py-20 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-[#1b3a6b]" />
              <p className="mt-6 text-lg font-medium">Looking into this charge…</p>
              <p className="mt-2 text-sm text-neutral-500">{tools.length} checks completed</p>
            </div>
          )}

          {/* ---- result ---- */}
          {step === 'result' && sel && (
            <div className="px-8 py-6">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{sel.descriptor} · {money(sel.amount)}</p>
                <div className="mt-3"><Markdown>{toCustomer || analyst || 'No response.'}</Markdown></div>
              </div>
              {/* The agent either identified the charge or it did not. Those are
                  different situations and must not share a control. */}
              {identified ? (
                confirmed === null ? (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button onClick={() => setConfirmed('yes')} className="rounded-md bg-[#1b3a6b] px-6 py-2.5 font-semibold text-white">
                      Yes, that&apos;s mine
                    </button>
                    <button onClick={() => setConfirmed('no')} className="rounded-md border border-neutral-300 px-6 py-2.5 font-semibold">
                      No, I still don&apos;t recognise it
                    </button>
                  </div>
                ) : confirmed === 'yes' ? (
                  <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4">
                    <p className="font-semibold text-emerald-900">Closed. No dispute filed.</p>
                    <p className="mt-1 text-sm text-emerald-800">
                      Your card ending {customer.card_last4} stays active, and your other subscriptions are unaffected.
                    </p>
                  </div>
                ) : (
                  <NextSteps last4={customer.card_last4} subscriptions={subscriptions} />
                )
              ) : (
                /* Nothing was identified. There is nothing for the cardholder to
                   confirm, so we tell them what is already happening instead. */
                <NextSteps last4={customer.card_last4} subscriptions={subscriptions} />
              )}
            </div>
          )}
        </div>

        {/* ======================= BEHIND THE GLASS ========================== */}
        {glass && (
          <div className="grid min-h-0 grid-rows-2 border-l-2 border-neutral-300 bg-neutral-50">
            <section className="min-h-0 overflow-y-auto p-4">
              <h2 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Agent activity</h2>
              {!events.length && <p className="text-sm text-neutral-500">Nothing yet.</p>}
              <ol className="space-y-1">
                {events.map((e, i) =>
                  e.kind === 'tool' ? (
                    <li key={i} className="flex items-baseline gap-2 font-mono text-xs">
                      <span className="text-emerald-600">✓</span>
                      <span className="text-neutral-700">{e.name}</span>
                      <span className="truncate text-neutral-500">({Object.values(e.args).join(', ')})</span>
                    </li>
                  ) : e.kind === 'memory' ? (
                    <li key={i} className="rounded border border-amber-300 bg-amber-50 px-2 py-1 font-mono text-xs text-amber-800">
                      ★ recall_prior_cases({e.query}) → {e.pages.length} page, {e.facts.length} facts
                    </li>
                  ) : e.kind === 'error' ? (
                    <li key={i} className="text-xs text-red-700">{e.message}</li>
                  ) : null,
                )}
              </ol>
              {analyst && (
                <details className="mt-3 rounded border border-neutral-200 p-2">
                  <summary className="cursor-pointer text-xs text-neutral-500">Analyst case preparation</summary>
                  <div className="mt-2"><Markdown tone="compact">{analyst}</Markdown></div>
                </details>
              )}
            </section>

            <section className="min-h-0 overflow-y-auto border-t border-neutral-200 bg-neutral-50 p-4">
              <h2 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Hindsight</h2>
              {!memory && <p className="text-sm text-neutral-500">Memory is off. The agent has only the bank&apos;s systems.</p>}
              {memory && !memEv.length && <p className="text-sm text-neutral-500">Nothing recalled yet.</p>}
              {!!memEv.length && done && (
                <div className="mb-3 rounded border border-emerald-300 bg-emerald-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">What memory changed</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-emerald-900">{scenario.memoryEffect}</p>
                  {searchWindows.length > 0 && (
                    <p className="mt-2 font-mono text-[10px] text-emerald-800/80">
                      history windows searched: {searchWindows.join('  ')}
                    </p>
                  )}
                </div>
              )}
              {memEv.map((m, i) => (
                <div key={i} className="space-y-3">
                  {m.pages.map((p) => (
                    <div key={p.name} className="rounded border border-amber-300 bg-amber-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Distilled knowledge page</p>
                      <p className="mt-0.5 text-xs font-semibold text-amber-900">{p.name}</p>
                      <div className="mt-2"><Markdown tone="compact">{p.content}</Markdown></div>
                      <p className="mt-2 border-t border-amber-200 pt-1.5 text-[10px] text-amber-700">
                        Synthesised from 9 resolved cases across 7 cardholders. Not hand-written.
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
