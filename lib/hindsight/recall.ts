import { HindsightClient } from '@vectorize-io/hindsight-client';

/** Each demo gets its own bank. Memory from one must not leak into another. */
export const DISPUTES_BANK = process.env.HINDSIGHT_BANK_NAME ?? 'crestline-disputes-demo';
export const WIRES_BANK = process.env.HINDSIGHT_WIRES_BANK ?? 'crestline-wires-demo';

export const hindsight = new HindsightClient({
  baseUrl: process.env.HINDSIGHT_API_URL ?? 'https://api.hindsight.vectorize.io',
  apiKey: process.env.HINDSIGHT_API_KEY,
});

export type RecalledFact = { text: string; entities?: string[]; document_id?: string };
export type RecalledChunk = { text?: string; content?: string };

/** What the right-hand pane renders, and what the agent sees as a tool result. */
export async function recall(query: string, bank: string = DISPUTES_BANK): Promise<{ facts: RecalledFact[]; chunks: string[]; pages: { name: string; content: string }[] }> {
  // listMentalModels defaults to metadata and does not reliably populate
  // `content`, so fetch each model individually. Without this the distilled
  // page never reaches the agent and it falls back to raw facts.
  const [res, list] = await Promise.all([
    // Chunks carry the verbatim source text. Fact extraction generalises
    // ("colonia and postal code"); the literal values a customer actually used
    // only survive in the chunk.
    hindsight.recall(bank, query, { includeChunks: true, maxChunkTokens: 1200 }) as Promise<{ results?: RecalledFact[]; chunks?: Record<string, RecalledChunk> }>,
    hindsight.listMentalModels(bank) as Promise<{ items?: { id: string; name: string }[] }>,
  ]);
  const full = await Promise.all(
    (list.items ?? []).map((m) =>
      hindsight.getMentalModel(bank, m.id, { detail: 'content' }) as Promise<{ name: string; content?: string }>,
    ),
  );
  const pages = full
    .filter((m) => m.content?.trim())
    .map((m) => ({ name: m.name, content: m.content!.trim() }));
  // chunks come back keyed by chunk id, not as an array.
  const chunks = Object.values(res.chunks ?? {})
    .map((c) => (c.text ?? c.content ?? '').trim())
    .filter(Boolean)
    .slice(0, 3);
  return { facts: (res.results ?? []).slice(0, 8), chunks, pages };
}
