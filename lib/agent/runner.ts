/**
 * Generic agent runner shared by all five demos.
 *
 * A demo supplies its system prompt, its bank tool declarations and its
 * scenarios. The runner owns the Gemini mechanics and the event stream the
 * three-pane UI renders, so no demo reimplements the loop.
 *
 * Memory on/off is a FLAG, not a second code path: identical model, identical
 * system prompt, identical bank tools. The only difference is whether
 * `recall_prior_cases` is in the tool list. That equivalence is what makes the
 * cold-vs-memory comparison honest.
 */
import { GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai';
import { recall } from '@/lib/hindsight/recall';

export const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.7-flash';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const str = (description: string) => ({ type: Type.STRING, description });

const memoryDecl = (t: { name: string; description: string; argDescription: string }): FunctionDeclaration => ({
  name: t.name,
  description: t.description,
  parameters: { type: Type.OBJECT, properties: { query: str(t.argDescription) }, required: ['query'] },
});

/** Which system failed. On stage this distinction is the whole point: a model
 *  provider blip must never be mistaken for a memory failure. */
export type FailureSource = 'model-provider' | 'hindsight' | 'bank-systems';

const RETRYABLE = [408, 429, 500, 502, 503, 504];

function statusOf(e: unknown): number | undefined {
  const m = (e as Error)?.message ?? '';
  const j = m.match(/"code"\s*:\s*(\d{3})/) ?? m.match(/\b(\d{3})\b/);
  return j ? Number(j[1]) : undefined;
}

/** Retry transient model-provider failures. Three attempts, backing off. */
async function withRetry<T>(fn: () => Promise<T>, onRetry: (attempt: number, status: number | undefined, msg: string) => void): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const status = statusOf(e);
      const retryable = status === undefined || RETRYABLE.includes(status);
      if (!retryable || attempt === 3) break;
      onRetry(attempt, status, (e as Error)?.message ?? String(e));
      await new Promise((r) => setTimeout(r, 600 * 2 ** (attempt - 1)));
    }
  }
  throw last;
}

export type AgentEvent =
  | { kind: 'tool'; name: string; args: Record<string, unknown>; result: unknown; ms: number }
  | { kind: 'memory'; query: string; facts: { text: string }[]; chunks: string[]; pages: { name: string; content: string }[]; ms: number }
  | { kind: 'text'; text: string }
  | { kind: 'recalled'; memories: string[]; chunks: string[]; profile?: string }
  | { kind: 'retained'; text: string }
  | { kind: 'retry'; source: FailureSource; attempt: number; status?: number; message: string }
  | { kind: 'failed'; source: FailureSource; status?: number; message: string; detail: string }
  | { kind: 'done'; toolCalls: number; memoryCalls: number; turns: number };

export type AgentSpec = {
  systemPrompt: string;
  declarations: FunctionDeclaration[];
  tools: Record<string, (args: Record<string, unknown>) => unknown | Promise<unknown>>;
  bank: string;
  memoryTool: { name: string; description: string; argDescription: string };
};

export type Turn = { role: 'user' | 'model'; text: string };

export async function* runAgent(
  spec: AgentSpec,
  opts: { prompt: string; memory: boolean; maxTurns?: number; history?: Turn[]; extraSystem?: string },
): AsyncGenerator<AgentEvent> {
  // A demo may already declare its memory tool among its own tools. Appending
  // it again is a 400 from Gemini, not a warning.
  const declared = new Set(spec.declarations.map((d) => d.name));
  const fns = opts.memory && !declared.has(spec.memoryTool.name)
    ? [...spec.declarations, memoryDecl(spec.memoryTool)]
    : spec.declarations;
  const tools = [{ functionDeclarations: fns }];
  // Prior turns are replayed as plain text. Tool results from an earlier turn
  // are not re-sent: the agent re-derives anything it still needs, which keeps
  // the follow-up honest rather than letting it coast on stale context.
  const contents: { role: string; parts: unknown[] }[] = [
    ...(opts.history ?? []).map((t) => ({ role: t.role, parts: [{ text: t.text }] as unknown[] })),
    { role: 'user', parts: [{ text: opts.prompt }] },
  ];
  let toolCalls = 0, memoryCalls = 0, turns = 0;

  for (turns = 0; turns < (opts.maxTurns ?? 18); turns++) {
    let res;
    const retries: { attempt: number; status?: number; message: string }[] = [];
    try {
      res = await withRetry(
        () =>
          ai.models.generateContent({
            model: MODEL,
            contents: contents as never,
            config: {
              tools,
              systemInstruction: opts.extraSystem ? `${spec.systemPrompt}\n\n${opts.extraSystem}` : spec.systemPrompt,
              temperature: 0,
            },
          }),
        (attempt, status, message) => retries.push({ attempt, status, message }),
      );
    } catch (e) {
      const status = statusOf(e);
      yield {
        kind: 'failed',
        source: 'model-provider',
        status,
        message: `Gemini (${MODEL}) did not respond${status ? ` — HTTP ${status}` : ''} after 3 attempts.`,
        detail: (e as Error)?.message ?? String(e),
      };
      return;
    }
    for (const r of retries) {
      yield { kind: 'retry', source: 'model-provider', attempt: r.attempt, status: r.status, message: r.message };
    }

    const calls = res.functionCalls ?? [];
    const text = (res.text ?? '').trim();
    if (text) yield { kind: 'text', text };
    if (!calls.length) break;

    // Push the model's own content back verbatim. Gemini 3.x carries a
    // thought_signature on each functionCall part and rejects the next turn if
    // it is missing, so the model turn must not be reconstructed by hand.
    const modelContent = res.candidates?.[0]?.content;
    contents.push((modelContent ?? { role: 'model', parts: calls.map((c) => ({ functionCall: { name: c.name, args: c.args } })) }) as { role: string; parts: unknown[] });

    const responses: unknown[] = [];
    for (const c of calls) {
      const name = c.name!;
      const args = (c.args ?? {}) as Record<string, unknown>;
      const t0 = Date.now();
      let result: unknown;

      if (name === spec.memoryTool.name) {
        memoryCalls++;
        let r;
        try {
          r = await recall(String(args.query ?? ''), spec.bank);
        } catch (e) {
          yield {
            kind: 'failed', source: 'hindsight', status: statusOf(e),
            message: 'Hindsight did not return memory for this request.',
            detail: (e as Error)?.message ?? String(e),
          };
          return;
        }
        result = {
          learned_patterns: r.pages.map((p) => ({ page: p.name, content: p.content })),
          recalled: r.facts.map((f) => f.text),
          source_excerpts: r.chunks,
          caveat: 'Operational memory. Verify against bank systems before relying on it.',
        };
        yield { kind: 'memory', query: String(args.query ?? ''), facts: r.facts.map((f) => ({ text: f.text })), chunks: r.chunks, pages: r.pages, ms: Date.now() - t0 };
      } else {
        toolCalls++;
        result = spec.tools[name] ? await spec.tools[name](args) : { error: `unknown_tool:${name}` };
        yield { kind: 'tool', name, args, result, ms: Date.now() - t0 };
      }
      responses.push({ functionResponse: { name, response: { result } } });
    }
    contents.push({ role: 'user', parts: responses });
  }
  yield { kind: 'done', toolCalls, memoryCalls, turns };
}
