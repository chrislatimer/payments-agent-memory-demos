'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import Markdown from '@/app/components/Markdown';

type Account = {
  display_name: string; card: string; card_last4: string;
  available_points: number; pending_points: number;
  earnings_cycle: string; earnings_total: number;
  earnings_breakdown: { label: string; points: number; colour: string }[];
};
type Activity = { descriptor: string; date: string; points: number; amount: number; earn: string }[];
type Offer = { offer_id: string; merchant: string; multiplier: number; ends: string };

type Msg = { role: 'user' | 'model'; text: string };
type Session = { id: string; label: string; messages: Msg[] };
type Ev =
  | { kind: 'tool'; name: string; args: Record<string, unknown>; result: unknown; ms: number }
  | { kind: 'recalled'; memories: string[]; chunks: string[]; profile?: string }
  | { kind: 'retained'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'done'; toolCalls: number; memoryCalls: number; turns: number }
  | { kind: 'error'; message: string };

const n = (x: number) => x.toLocaleString('en-US');

export default function PointsDemo({ account, activity, offers }: { account: Account; activity: Activity; offers: Offer[] }) {
  const [sessions, setSessions] = useState<Session[]>([{ id: 's1', label: 'Session 1', messages: [] }]);
  const [activeId, setActiveId] = useState('s1');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<Ev[]>([]);
  const [memories, setMemories] = useState<string[]>([]);
  const [written, setWritten] = useState<string[]>([]);
  const [profile, setProfile] = useState('');
  const [glass, setGlass] = useState(true);
  const [wiping, setWiping] = useState(false);

  /** Back to a customer the assistant has never met. */
  const wipeMemory = async () => {
    setWiping(true);
    try {
      await fetch('/api/rewards/reset', { method: 'POST' });
      setSessions([{ id: 's1', label: 'Session 1', messages: [] }]);
      setActiveId('s1');
      setEvents([]); setMemories([]); setWritten([]); setProfile('');
    } finally { setWiping(false); }
  };
  const endRef = useRef<HTMLDivElement>(null);

  const active = sessions.find((s) => s.id === activeId)!;
  const tools = events.filter((e) => e.kind === 'tool') as Extract<Ev, { kind: 'tool' }>[];

  const newSession = () => {
    const id = `s${sessions.length + 1}`;
    setSessions((prev) => [...prev, { id, label: `Session ${prev.length + 1}`, messages: [] }]);
    setActiveId(id);
    setEvents([]);
    // Memory deliberately survives. Only the transcript is new.
  };

  const send = useCallback(async (text: string) => {
    if (!text.trim() || busy) return;
    setInput('');
    setBusy(true);
    setEvents([]);
    const history = active.messages.map((m) => ({ role: m.role, text: m.text }));
    setSessions((prev) => prev.map((s) => (s.id === activeId ? { ...s, messages: [...s.messages, { role: 'user', text }] } : s)));

    try {
      const res = await fetch('/api/rewards/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });
      const reader = res.body!.getReader(); const dec = new TextDecoder(); let buf = ''; let answer = '';
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n'); buf = parts.pop() ?? '';
        for (const p of parts) {
          const line = p.replace(/^data: /, '').trim(); if (!line) continue;
          const e = JSON.parse(line) as Ev;
          setEvents((prev) => [...prev, e]);
          if (e.kind === 'recalled') { setMemories(e.memories); setProfile(e.profile ?? ''); }
          if (e.kind === 'retained') setWritten((prev) => [e.text, ...prev].slice(0, 6));
          if (e.kind === 'text') answer = e.text;
        }
      }
      setSessions((prev) => prev.map((s) => (s.id === activeId ? { ...s, messages: [...s.messages, { role: 'model', text: answer }] } : s)));
    } catch (e) {
      setEvents((prev) => [...prev, { kind: 'error', message: String(e) }]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [active, activeId, busy]);

  const maxEarn = Math.max(...account.earnings_breakdown.map((b) => b.points), 1);

  const SUGGESTIONS = [
    'What are my points actually worth?',
    'Can I get my wife and me to Hawaii in first class?',
    "What's the best use of these points right now?",
  ];

  return (
    <div className="flex h-screen flex-col bg-[#f4f6f9]">
      {/* presenter chrome, deliberately outside the product */}
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 bg-white px-4 py-1.5 text-xs">
        <Link href="/" className="text-neutral-500 hover:text-neutral-700">← All demos</Link>
        <span className="rounded bg-neutral-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Presenter</span>
        <span className="text-neutral-500">#2 AI Points Spender</span>
        <span className="ml-auto text-[11px] text-neutral-500">new session clears the transcript, not the memory</span>
        <button onClick={() => setGlass((g) => !g)} className="rounded border border-neutral-300 px-2 py-0.5 text-neutral-500">
          {glass ? 'Hide' : 'Show'} Hindsight
        </button>
        <button onClick={wipeMemory} disabled={wiping}
          className="rounded border border-red-300 px-2 py-0.5 text-red-700 disabled:opacity-40">
          {wiping ? 'Forgetting…' : 'Forget everything'}
        </button>
      </div>

      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: glass ? 'minmax(0,1fr) 380px' : '1fr' }}>
        {/* ======================= ONE BANKING APP ======================= */}
        <div className="flex min-h-0 flex-col bg-[#f4f6f9]">
          {/* shared chrome across portal and assistant */}
          <header className="flex items-center gap-3 bg-[#12294b] px-6 py-3 text-white">
            <span className="text-base font-semibold tracking-tight">CRESTLINE</span>
            <span className="text-sm text-white/70">Rewards</span>
            <nav className="ml-6 hidden gap-5 text-[13px] text-white/70 lg:flex">
              <span className="border-b-2 border-white pb-0.5 font-medium text-white">Home</span>
              <span>Manage rewards</span>
              <span>Convert to cash</span>
              <span>Shopping &amp; Experiences</span>
              <span>Travel</span>
            </nav>
            <div className="ml-auto flex items-center gap-2 rounded bg-white/10 px-3 py-1 text-[13px]">
              <span className="text-white/70">…{account.card_last4}</span>
              <span className="font-semibold text-emerald-300">{n(account.available_points)} pts</span>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_400px]">
            {/* ---- portal content ---- */}
            <div className="min-h-0 space-y-4 overflow-y-auto p-5 text-neutral-900">
              <div className="rounded-lg border border-neutral-200 bg-white p-5">
                <p className="text-xs font-semibold text-neutral-500">{account.display_name} (…{account.card_last4})</p>
                <div className="mt-2 flex items-end gap-8">
                  <div>
                    <p className="text-3xl font-semibold tabular-nums">{n(account.available_points)}</p>
                    <p className="text-xs text-neutral-500">Available points</p>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold tabular-nums text-neutral-500">{n(account.pending_points)}</p>
                    <p className="text-xs text-neutral-500">Pending points</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-neutral-200 bg-white p-5">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">Your earnings</p>
                  <p className="text-sm font-semibold tabular-nums">{n(account.earnings_total)} pts</p>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">{account.earnings_cycle}</p>
                <div className="mt-3 flex h-2.5 overflow-hidden rounded">
                  {account.earnings_breakdown.map((b) => (
                    <div key={b.label} style={{ background: b.colour, width: `${(b.points / account.earnings_total) * 100}%` }} />
                  ))}
                </div>
                <ul className="mt-3 space-y-1.5">
                  {account.earnings_breakdown.map((b) => (
                    <li key={b.label} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: b.colour }} />
                      <span className="flex-1 text-neutral-400">{b.label}</span>
                      <span className="tabular-nums text-neutral-500">{n(b.points)} pts</span>
                    </li>
                  ))}
                </ul>
                <div aria-hidden className="sr-only">{maxEarn}</div>
              </div>

              <div className="rounded-lg border border-neutral-200 bg-white p-5">
                <p className="text-sm font-semibold">Recent points activity</p>
                <ul className="mt-2 divide-y divide-neutral-100">
                  {activity.map((a, i) => (
                    <li key={i} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{a.descriptor}</p>
                        <p className="text-[11px] text-neutral-500">{a.date} · {a.earn}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold tabular-nums">{a.points} pts</p>
                        <p className="text-[11px] text-neutral-500">${a.amount}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-neutral-200 bg-white p-5">
                <p className="text-sm font-semibold">Discover ways to use points</p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {[['Gift cards', '175+ retailers.'], ['Travel', 'Go farther through Crestline.'], ['Apple®', 'Pay with points.']].map(([t, d]) => (
                    <div key={t} className="rounded border border-neutral-200 p-3">
                      <p className="text-xs font-semibold">{t}</p>
                      <p className="mt-1 text-[11px] text-neutral-500">{d}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-neutral-200 bg-white p-5">
                <p className="text-sm font-semibold">Current bonus categories</p>
                <ul className="mt-2 space-y-1.5">
                  {offers.map((o) => (
                    <li key={o.offer_id} className="flex items-center gap-2 text-xs">
                      <span className="rounded bg-[#12294b] px-1.5 py-0.5 font-bold text-white">{o.multiplier}x</span>
                      <span className="flex-1 text-neutral-400">{o.merchant}</span>
                      <span className="text-[11px] text-neutral-500">ends {o.ends}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ---- docked assistant, same app, same chrome ---- */}
            <aside className="flex min-h-0 flex-col border-l border-neutral-200 bg-white">
              <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#12294b] text-xs font-bold text-white">C</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-900">Rewards Assistant</p>
                  <p className="text-[11px] text-neutral-500">{active.label} · remembers your past conversations</p>
                </div>
                <button onClick={newSession}
                  className="rounded border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-400 hover:bg-neutral-50">
                  New chat
                </button>
              </div>

              {sessions.length > 1 && (
                <div className="flex gap-1 overflow-x-auto border-b border-neutral-200 px-3 py-2">
                  {sessions.map((s) => (
                    <button key={s.id} onClick={() => { setActiveId(s.id); setEvents([]); }}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${
                        s.id === activeId ? 'bg-[#12294b] font-semibold text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {!active.messages.length && (
                  <div className="text-center">
                    <p className="text-sm text-neutral-500">
                      You have <span className="font-semibold text-neutral-800">{n(account.available_points)}</span> points.
                      <br />What would you like to do with them?
                    </p>
                    {!!memories.length && (
                      <p className="mt-3 inline-block rounded-full bg-amber-50 px-3 py-1 text-[11px] text-amber-800">
                        Picking up where we left off
                      </p>
                    )}
                    <div className="mt-5 space-y-2">
                      {SUGGESTIONS.map((q) => (
                        <button key={q} onClick={() => send(q)}
                          className="block w-full rounded-lg border border-neutral-200 px-3 py-2 text-left text-[13px] text-neutral-400 hover:border-[#12294b] hover:bg-neutral-50">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {active.messages.map((m, i) => (
                    <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
                      <div className={m.role === 'user'
                        ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-[#12294b] px-3.5 py-2 text-[13px] text-white'
                        : 'w-full text-neutral-800'}>
                        {m.role === 'user' ? m.text : <Markdown>{m.text}</Markdown>}
                      </div>
                    </div>
                  ))}
                  {busy && (
                    <p className="flex items-center gap-2 text-xs text-neutral-500">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-[#12294b]" />
                      checking your account… {tools.length} lookups
                    </p>
                  )}
                  <div ref={endRef} />
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="border-t border-neutral-200 p-3">
                <div className="flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-1.5 focus-within:border-[#12294b]">
                  <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
                    placeholder="Ask about your points…"
                    className="flex-1 bg-transparent text-[13px] text-neutral-900 outline-none placeholder:text-neutral-500" />
                  <button disabled={busy || !input.trim()}
                    className="rounded-full bg-[#12294b] px-3 py-1 text-xs font-semibold text-white disabled:opacity-30">
                    Send
                  </button>
                </div>
              </form>
            </aside>
          </div>
        </div>

        {/* ======================= behind the glass ======================= */}
        {glass && (
          <div className="grid min-h-0 grid-rows-2 border-l border-neutral-200">
            <section className="min-h-0 overflow-y-auto bg-neutral-50 p-4">
              <h2 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Customer profile</h2>
              {profile ? (
                <div className="mb-4 rounded border border-sky-300 bg-sky-50 p-3">
                  <Markdown tone="compact">{profile}</Markdown>
                  <p className="mt-2 border-t border-sky-200 pt-1.5 text-[10px] text-sky-700">
                    Distilled by Hindsight from every conversation. Rebuilt after each turn.
                  </p>
                </div>
              ) : (
                <p className="mb-4 text-sm text-neutral-500">Nothing learned about this customer yet.</p>
              )}
              <h2 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Recalled this turn</h2>
              {!memories.length && <p className="text-sm text-neutral-500">Nothing remembered yet.</p>}
              <ul className="space-y-1.5">
                {memories.map((m, i) => (
                  <li key={i} className="rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] leading-relaxed text-amber-900">{m}</li>
                ))}
              </ul>
              {!!tools.length && (
                <>
                  <h2 className="mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Account lookups</h2>
                  <ol className="space-y-0.5">
                    {tools.map((t, i) => <li key={i} className="font-mono text-[11px] text-neutral-500">✓ {t.name}</li>)}
                  </ol>
                </>
              )}
            </section>
            <section className="min-h-0 overflow-y-auto border-t border-neutral-200 p-4">
              <h2 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Written to memory</h2>
              {!written.length && <p className="text-sm text-neutral-500">Nothing written yet.</p>}
              <ul className="space-y-2">
                {written.map((w, i) => (
                  <li key={i} className="rounded border border-emerald-300 bg-emerald-50 p-2 text-[11px] leading-relaxed text-emerald-900">
                    <pre className="whitespace-pre-wrap font-sans">{w.slice(0, 400)}</pre>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
