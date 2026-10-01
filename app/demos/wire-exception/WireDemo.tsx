'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Markdown from '@/app/components/Markdown';

type Row = {
  wire_id: string; value_date: string; amount: number; debit_currency: string; credit_currency: string;
  corridor: string; status: string; return_code?: string; return_text?: string; returned_date?: string;
  beneficiary_name: string; initiated_by: string;
};
type Scenario = { id: string; label: string; intent: string; memoryEffect: string; expect: { memoryOff: string; memoryOn: string } };
type Ev =
  | { kind: 'tool'; name: string; args: Record<string, unknown>; result: unknown; ms: number }
  | { kind: 'memory'; query: string; facts: { text: string }[]; chunks: string[]; pages: { name: string; content: string }[]; ms: number }
  | { kind: 'text'; text: string }
  | { kind: 'done'; toolCalls: number; memoryCalls: number; turns: number }
  | { kind: 'error'; message: string };

const money = (n: number, c: string) => n.toLocaleString('en-US', { style: 'currency', currency: c, maximumFractionDigits: 2 });
const day = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function WireDemo(props: {
  rank: number; title: string; scenarios: Scenario[];
  view: { customer: { legal_name: string }; rows: Row[] };
}) {
  const scenario = props.scenarios[0];
  const [memory, setMemory] = useState(false);
  const [step, setStep] = useState<'list' | 'detail' | 'contacted' | 'working' | 'answer' | 'draft'>('list');
  const [sel, setSel] = useState<Row | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [glass, setGlass] = useState(true);
  const [turns, setTurns] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const abort = useRef<AbortController | null>(null);

  const done = events.find((e) => e.kind === 'done') as Extract<Ev, { kind: 'done' }> | undefined;
  const tools = events.filter((e) => e.kind === 'tool') as Extract<Ev, { kind: 'tool' }>[];
  const memEv = events.filter((e) => e.kind === 'memory') as Extract<Ev, { kind: 'memory' }>[];
  const lastText = [...events].reverse().find((e) => e.kind === 'text') as Extract<Ev, { kind: 'text' }> | undefined;
  const draftCall = tools.find((t) => t.name === 'prepare_corrected_wire');

  const { analyst, toCustomer, outcome } = useMemo(() => {
    const t = lastText?.text ?? '';
    const ci = t.indexOf('---CUSTOMER---');
    const oi = t.indexOf('---OUTCOME---');
    const head = oi === -1 ? (ci === -1 ? t : t.slice(0, ci)) : t.slice(0, oi);
    const out = oi === -1 ? '' : t.slice(oi + 13, ci === -1 ? undefined : ci).trim();
    return { analyst: head.trim(), toCustomer: ci === -1 ? '' : t.slice(ci + 14).trim(), outcome: out.split(/\s/)[0] ?? '' };
  }, [lastText]);

  const expected = memory ? scenario.expect.memoryOn : scenario.expect.memoryOff;
  const matched = !!done && outcome === expected;

  const reset = useCallback(() => {
    abort.current?.abort(); setEvents([]); setTurns([]); setStep('list'); setSel(null);
  }, []);

  const run = useCallback(async (body: Record<string, unknown>, next: 'answer' | 'draft') => {
    setEvents([]); setStep('working');
    const ac = new AbortController(); abort.current = ac;
    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST', signal: ac.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demo: 'wire-exception', scenario: scenario.id, memory, ...body }),
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
      setStep(next);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') { setEvents((p) => [...p, { kind: 'error', message: String(e) }]); setStep(next); }
    }
  }, [memory, scenario.id]);

  const analyse = () => { setTurns([]); run({}, 'answer'); };

  const approve = () => {
    const history = [...turns, { role: 'model' as const, text: lastText?.text ?? '' }];
    setTurns(history);
    run({
      history,
      followUp:
        'Yes — please prepare the replacement wire draft using those details. I have confirmed the colonia and postal code are still current.',
    }, 'draft');
  };

  return (
    <div className="flex h-screen flex-col bg-[#f4f6f9]">
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 bg-white px-4 py-2 text-sm">
        <Link href="/" className="text-neutral-500 hover:text-neutral-700">← All demos</Link>
        <span className="rounded bg-neutral-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Presenter</span>
        <span className="text-neutral-700">#{props.rank} {props.title}</span>
        <button onClick={() => { setMemory((m) => !m); reset(); }}
          className={`flex items-center gap-1.5 rounded px-3 py-1 font-semibold transition ${memory ? 'bg-emerald-500 text-neutral-950' : 'border border-neutral-400 bg-white text-neutral-700'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${memory ? 'bg-neutral-950' : 'bg-neutral-400'}`} />
          Memory {memory ? 'ON' : 'OFF'}
        </button>
        <button onClick={() => setGlass((g) => !g)} className="rounded border border-neutral-300 px-3 py-1 text-neutral-700">
          {glass ? 'Hide' : 'Show'} behind the glass
        </button>
        <button onClick={reset} className="rounded border border-neutral-300 px-3 py-1 text-neutral-500">Reset</button>
        {done && (
          <span className="ml-auto font-mono text-xs text-neutral-500">
            bank calls <b className="text-base text-neutral-900">{done.toolCalls}</b>
            <span className="ml-3">recalls <b className="text-base text-emerald-700">{done.memoryCalls}</b></span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2">
        <span className="text-xs leading-relaxed text-neutral-500">{scenario.intent}</span>
        <span className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[11px]">
          <span className="text-neutral-500">expected</span>
          <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-neutral-700">{expected}</span>
          {done && step !== 'draft' && (
            <>
              <span className="text-neutral-500">→</span>
              <span className={`rounded px-1.5 py-0.5 font-bold ${matched ? 'bg-emerald-500 text-neutral-950' : 'bg-red-500 text-neutral-950'}`}>{outcome || '—'}</span>
            </>
          )}
        </span>
      </div>

      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: glass ? 'minmax(0,1.6fr) minmax(0,1fr)' : '1fr' }}>
        {/* ---------------- business banking portal ---------------- */}
        <div className="min-h-0 overflow-y-auto bg-white text-neutral-900">
          <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-8 py-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-[#1b3a6b]" />
              <span className="text-lg font-semibold tracking-tight text-[#1b3a6b]">Crestline National</span>
              <span className="ml-2 text-sm text-neutral-500">Business Banking</span>
            </div>
          </header>

          {step === 'list' && (
            <div className="px-8 py-6">
              <p className="text-sm text-neutral-500">{props.view.customer.legal_name}</p>
              <h1 className="mt-1 text-2xl font-semibold">Wire transfers</h1>
              <ul className="mt-6 divide-y divide-neutral-200 border-t border-neutral-200">
                {props.view.rows.map((r) => (
                  <li key={r.wire_id}>
                    <button onClick={() => { setSel(r); setStep('detail'); }}
                      className="flex w-full items-center gap-4 py-3.5 text-left hover:bg-neutral-50">
                      <span className="w-24 shrink-0 text-sm text-neutral-500">{day(r.value_date)}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{r.beneficiary_name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        r.status === 'RETURNED' ? 'bg-red-100 text-red-800'
                          : r.status === 'COMPLETED' ? 'bg-neutral-100 text-neutral-500' : 'bg-amber-100 text-amber-800'}`}>
                        {r.status.toLowerCase()}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{money(r.amount, r.debit_currency)}</span>
                      <span className="shrink-0 text-neutral-700">›</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 'detail' && sel && (
            <div className="px-8 py-6">
              <button onClick={() => setStep('list')} className="text-sm text-[#1b3a6b]">‹ Back</button>
              <div className="mt-6 border-b border-neutral-200 pb-6">
                <p className="text-4xl font-semibold tabular-nums">{money(sel.amount, sel.debit_currency)}</p>
                <p className="mt-2 text-lg font-medium">{sel.beneficiary_name}</p>
                <p className="mt-1 text-sm text-neutral-500">{sel.wire_id} · {sel.corridor} · value {day(sel.value_date)}</p>
              </div>

              {sel.status === 'RETURNED' ? (
                <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4">
                  <p className="font-semibold text-red-900">Returned {sel.returned_date ? day(sel.returned_date) : ''}</p>
                  <p className="mt-1 font-mono text-xs text-red-800">{sel.return_text}</p>
                  <p className="mt-3 text-sm text-red-900">
                    This payment was returned by the beneficiary bank. Please contact Global Payments Support for details.
                  </p>
                </div>
              ) : (
                <p className="mt-6 text-sm text-neutral-500">This payment completed normally.</p>
              )}

              {/* Memory off is not a worse analysis. It is today's portal: a
                  generic status and a support queue. There is no agent. */}
              {sel.status === 'RETURNED' && !memory && (
                <>
                  <button onClick={() => setStep('contacted')} className="mt-8 w-full rounded-md bg-[#1b3a6b] py-3 font-semibold text-white">
                    Contact Global Payments Support
                  </button>
                  <p className="mt-2 text-center text-xs text-neutral-500">
                    Mon–Fri, 8:00–18:00 ET
                  </p>
                </>
              )}

              {sel.status === 'RETURNED' && memory && (
                <button onClick={analyse} className="mt-8 w-full rounded-md bg-[#1b3a6b] py-3 font-semibold text-white">
                  Analyse this payment
                </button>
              )}
            </div>
          )}

          {step === 'contacted' && sel && (
            <div className="px-8 py-6">
              <button onClick={() => setStep('detail')} className="text-sm text-[#1b3a6b]">‹ Back to payment</button>
              <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#1b3a6b] text-lg text-white">✓</div>
                <p className="mt-4 text-lg font-semibold">Request received</p>
                <p className="mt-2 text-sm text-neutral-500">
                  Case <span className="font-mono">SR-20260930-4471</span> has been opened for wire {sel.wire_id}.
                </p>
                <p className="mt-4 text-sm text-neutral-500">
                  A Global Payments specialist will review your enquiry and get back to you within
                  {' '}<span className="font-semibold">1–2 business days</span>.
                </p>
              </div>
              <p className="mt-6 text-center text-xs text-neutral-500">
                {money(sel.amount, sel.debit_currency)} remains unsent while this is reviewed.
              </p>
            </div>
          )}

          {step === 'working' && (
            <div className="px-8 py-20 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-[#1b3a6b]" />
              <p className="mt-6 text-lg font-medium">Analysing this payment…</p>
              <p className="mt-2 text-sm text-neutral-500">{tools.length} checks completed</p>
            </div>
          )}

          {(step === 'answer' || step === 'draft') && (
            <div className="px-8 py-6">
              <button onClick={() => setStep('detail')} className="text-sm text-[#1b3a6b]">‹ Back to payment</button>
              <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-5">
                <Markdown>{toCustomer || analyst || 'No response.'}</Markdown>
              </div>

              {step === 'answer' && outcome === 'DIAGNOSED' && (
                <button onClick={approve} className="mt-6 rounded-md bg-[#1b3a6b] px-6 py-2.5 font-semibold text-white">
                  Yes — prepare the replacement wire
                </button>
              )}

              {step === 'draft' && draftCall && (
                <div className="mt-6 rounded-lg border-2 border-[#1b3a6b] bg-white p-5">
                  <div className="flex items-baseline justify-between">
                    <p className="font-semibold text-[#1b3a6b]">Replacement wire — draft</p>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">not submitted</span>
                  </div>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-neutral-400">
                    {JSON.stringify((draftCall.result as { draft?: unknown })?.draft ?? draftCall.result, null, 2)}
                  </pre>
                  <p className="mt-3 border-t border-neutral-200 pt-3 text-xs text-neutral-500">
                    Prepared for your review. Nothing has been sent.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ---------------- behind the glass ---------------- */}
        {glass && (
          <div className="grid min-h-0 grid-rows-2 border-l-2 border-neutral-300 bg-neutral-50">
            <section className="min-h-0 overflow-y-auto p-4">
              <h2 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Agent activity</h2>
              {!events.length && <p className="text-sm text-neutral-500">Nothing yet.</p>}
              <ol className="space-y-1">
                {events.map((e, i) =>
                  e.kind === 'tool' ? (
                    <li key={i} className="flex items-baseline gap-2 font-mono text-xs">
                      <span className={e.name === 'prepare_corrected_wire' ? 'text-sky-700' : 'text-emerald-600'}>✓</span>
                      <span className="text-neutral-700">{e.name}</span>
                      <span className="truncate text-neutral-500">({Object.values(e.args).slice(0, 3).join(', ')})</span>
                    </li>
                  ) : e.kind === 'memory' ? (
                    <li key={i} className="rounded border border-amber-300 bg-amber-50 px-2 py-1 font-mono text-xs text-amber-800">
                      ★ {`recall_past_conversations(${e.query})`} → {e.facts.length} facts, {e.chunks.length} excerpts
                    </li>
                  ) : e.kind === 'error' ? (
                    <li key={i} className="text-xs text-red-700">{e.message}</li>
                  ) : null,
                )}
              </ol>
            </section>

            <section className="min-h-0 overflow-y-auto border-t border-neutral-200 bg-neutral-50 p-4">
              <h2 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Hindsight</h2>
              {!memory && <p className="text-sm text-neutral-500">Memory is off. The agent has only the bank&apos;s systems.</p>}
              {memory && !memEv.length && <p className="text-sm text-neutral-500">Nothing recalled yet.</p>}

              {!!memEv.length && done && (
                <div className="mb-3 rounded border border-emerald-300 bg-emerald-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">What memory changed</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-emerald-900">{scenario.memoryEffect}</p>
                </div>
              )}

              {memEv.map((m, i) => (
                <div key={i} className="space-y-3">
                  {m.chunks.map((c, j) => (
                    <div key={j} className="rounded border border-amber-300 bg-amber-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Recalled conversation</p>
                      <pre className="mt-2 whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-neutral-700">{c.slice(0, 1400)}</pre>
                    </div>
                  ))}
                  {!!m.facts.length && (
                    <div className="rounded border border-neutral-200 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Extracted</p>
                      <ul className="mt-1.5 space-y-1">
                        {m.facts.map((f, k) => <li key={k} className="text-[11px] leading-relaxed text-neutral-500">• {f.text}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
