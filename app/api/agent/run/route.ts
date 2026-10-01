import { runAgent } from '@/lib/agent/runner';
import { getDemo } from '@/lib/demos/registry';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: Request) {
  const { demo: slug, scenario: scenarioId, memory, followUp, history } = (await req.json()) as {
    demo: string; scenario: string; memory: boolean;
    /** A reply from the user continuing the same conversation. */
    followUp?: string;
    history?: { role: 'user' | 'model'; text: string }[];
  };
  const demo = getDemo(slug);
  const scenario = demo?.scenarios.find((s) => s.id === scenarioId);
  if (!demo || !scenario) return new Response('unknown demo or scenario', { status: 404 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
      try {
        for await (const event of runAgent(demo, { prompt: followUp ?? scenario.prompt, memory, history })) send(event);
      } catch (err) {
        send({ kind: 'error', message: (err as Error)?.message ?? String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
  });
}
