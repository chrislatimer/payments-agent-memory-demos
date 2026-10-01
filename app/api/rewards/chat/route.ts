import { runAgent, type Turn } from '@/lib/agent/runner';
import { pointsAssistant, REWARDS_BANK } from '@/lib/demos/points-assistant';
import { hindsight, recall } from '@/lib/hindsight/recall';
import { ensureProfile, getProfile, refreshProfile } from '@/lib/demos/points-assistant/profile';

export const runtime = 'nodejs';
export const maxDuration = 300;

const TAGS = ['demo2', 'rewards'];

let bankReady: Promise<unknown> | null = null;
function ensureBank() {
  // Idempotent, and only attempted once per server process.
  bankReady ??= hindsight
    .createBank(REWARDS_BANK, {
      reflectMission:
        'I am the rewards assistant for a single Crestline cardholder. I remember what they are '
        + 'saving for, what they have already told me they intend to buy, what they have ruled out, '
        + 'and what we have discussed before, so that later conversations do not start from nothing.',
      enableObservations: true,
      observationsMission:
        'Build a picture of this cardholder: redemption goals and the trips they want, hard '
        + 'constraints and dislikes, purchases they have said they need to make anyway, and anything '
        + 'they have rejected and why.',
    })
    .then(() => ensureProfile(REWARDS_BANK))
    .catch(() => undefined);
  return bankReady;
}

export async function POST(req: Request) {
  const { message, history } = (await req.json()) as { message: string; history?: Turn[] };
  await ensureBank();

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
      try {
        // Two recalls every turn. The first follows the message; the second is
        // a standing profile query, because what the customer said they need to
        // buy will not be semantically close to whatever they happen to ask
        // next, and that connection is the whole point of the assistant.
        const [onTopic, profile, profileText] = await Promise.all([
          recall(message, REWARDS_BANK),
          recall(
            'what this customer is saving for, purchases they have said they need to make, '
            + 'constraints they have stated, and anything they have ruled out',
            REWARDS_BANK,
          ),
          getProfile(REWARDS_BANK),
        ]);
        const seen = new Set<string>();
        const memories = [...onTopic.facts, ...profile.facts]
          .map((f) => f.text)
          .filter((t) => (seen.has(t) ? false : (seen.add(t), true)));
        send({ kind: 'recalled', memories, chunks: onTopic.chunks, profile: profileText });

        const profileBlock = profileText
          ? `What you know about this customer, built up across every conversation you have had `
            + `with them:\n\n${profileText}\n\n`
          : '';

        const extraSystem = profileBlock + (memories.length
          ? `What you remember about this customer from previous conversations:\n`
            + memories.map((m) => `- ${m}`).join('\n')
            + `\n\nThese are recollections of things they told you, not account records. Use them to be `
            + `useful without asking them again. Any number about their account — balances, points `
            + `costs, offer multipliers or end dates — must come from a tool call, never from this list, `
            + `because these recollections may be months out of date.\n`
            + `If something they told you they already need to buy lines up with a bonus category that `
            + `is live right now, say so. Do not raise spending they have not already mentioned.`
          : profileBlock
            ? ''
            : `You have no previous conversations with this customer yet.`);

        let answer = '';
        for await (const event of runAgent(pointsAssistant, { prompt: message, memory: false, history, extraSystem })) {
          if (event.kind === 'text') answer = event.text;
          send(event);
        }

        // Retain the exchange so the next session starts informed.
        const record = `User: ${message}\nAssistant: ${answer}`;
        await hindsight.retain(REWARDS_BANK, record, { tags: TAGS }).catch(() => undefined);
        send({ kind: 'retained', text: record });

        // Rebuild the standing profile from everything said so far. Async
        // server side, so it is not awaited: it lands before the next turn.
        void refreshProfile(REWARDS_BANK);
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
