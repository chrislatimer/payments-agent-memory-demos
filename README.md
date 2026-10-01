# Agent Opportunities in Payments

Four working demos of AI agents doing payments work at a fictional bank, built for a
conference breakout session. Every agent is a real tool-calling loop against
synthetic bank systems, and every one of them uses [Hindsight](https://hindsight.vectorize.io)
for memory.

Nothing here is scripted or replayed. If you run it, the agent investigates from scratch
and can reach a different answer than it did on stage.

**The bank is fictional. The data is synthetic. Nothing resembles any real institution,
customer or system.**

---

## The argument

A bank's systems record what happened to the money. They do not record what anyone
learned while working with it. That knowledge lives in a resolved case nobody reads
again, a support chat from March, a conversation with a customer last year, or a step an
agent took at 09:19 on a Tuesday.

Each demo shows a different job for that memory:

| | Demo | What memory does here |
|---|---|---|
| #1 | AI Payment Investigator | Knowledge distilled across many customers' resolved cases |
| #2 | AI Payment Exception Resolver | Past support conversations with this customer |
| #3 | AI Points Spender | A profile of one customer, built across sessions |
| #4 | AI Auditor | The record of what an agent actually did |

---

## Running it

### What you need

- **Node 20+** (built on 22)
- **A Google AI Studio key** — free tier is enough: https://aistudio.google.com/apikey
- **A Hindsight key** — https://hindsight.vectorize.io

Expect a few cents of Gemini usage to work through all four.

### Setup

```bash
npm install
cp .env.example .env.local     # then fill in both keys
npm run seed:all               # synthetic bank data + four memory banks
npm run dev                    # http://localhost:3005
```

`seed:all` takes two to three minutes. Most of that is waiting for Hindsight to process
retained documents into observations before the mental models are built — the scripts
poll and tell you what they are waiting for.

Then open **http://localhost:3005** and pick a demo.

---

## What to try

### #1 — AI Payment Investigator

A cardholder disputes `NORTHBEAM DIG*4471 — $479.88`. She has never heard of Northbeam
Digital, and neither has the bank in any useful sense: the descriptor resolves to a legal
entity and stops there. No issuer system holds the brand behind a merchant of record.

1. Click the reported charge at the top of the statement, then **Report a problem**.
2. Run it with **Memory OFF**. It escalates as card-not-present fraud, because that is the
   only responsible thing left. Note the six card-on-file subscriptions listed on screen
   that her reissued card will break.
3. Toggle **Memory ON** and run it again.

With memory it recalls a page Hindsight distilled from nine resolved cases across seven
*other* customers, forms a hypothesis, and tests it against the bank's own transaction
records — finding a $329 Vireo ring and a $39.99 first month twelve months earlier.
$479.88 is 12 × $39.99.

Then switch the scenario to **Marcus Bell**, who has no such history, and run it with
memory on. The agent runs the same play, the records refuse to confirm it, and it stays
on the fraud path. Memory is a search strategy, not a verdict.

### #2 — AI Payment Exception Resolver

A $420,000 wire to Mexico came back. The message is the real-world one: *"Returned by the
beneficiary bank. Please contact Global Payments Support."*

With **Memory OFF** there is no AI analysis at all — that is the point. The only button is
**Contact Global Payments Support**, which opens a case and tells you someone will get
back to you in one to two business days while the money sits still.

With **Memory ON**, an **Analyse this payment** option exists. It recalls a support chat
from March, compares the two beneficiary records the bank holds, finds the missing RFC,
and offers to prepare a replacement wire. Approve it and look at the draft: `submitted:
false`. Nothing moves $420,000 on an agent's conclusion.

### #3 — AI Points Spender

No memory toggle here. The device is **New chat**, which clears the transcript and keeps
the memory.

1. Ask what you can do with the points. Say you want two first-class seats to Hawaii
   next March.
2. In the same conversation, mention something the bank cannot know — a bathroom remodel
   you have been putting off, a laptop your daughter needs before school.
3. Watch the **Customer profile** panel on the right fill in.
4. Click **New chat**, then ask "any update on the Hawaii plan?"

It will not re-interview you. It connects live bonus categories to things you already
said you needed to buy. Note the constraint it works under: it may only raise a bonus
category where it lines up with a purchase you have already mentioned. Ask it cold and it
will suggest a cheaper redemption instead of telling you to go shopping.

**Press "Forget everything" before demoing this to someone else**, or it opens already
knowing about Hawaii.

### #4 — AI Auditor

Three parts, and the finale of the session.

**Investigate.** Six AML alerts are already closed. `SAR-2026-0455` is open — click
**Investigate**. The agent reads `AML-SAR-01`, a controlled procedure written for human
analysts, and works out how to comply with it. Nothing in its prompt tells it what to do.
Its full activity timeline is written to Hindsight.

**Audit.** Go to the **Audit** tab and run *"Audit all closed investigations"*. It tests
six investigations against thirteen controls and finds three failures of different kinds.

The one worth reading carefully is **SAR-2026-0412**. Control 3.4.1 requires the SAR
Register be searched under every name the bank knows the customer by. The agent searched
one of four. The earlier filing sits under a former name, so the search came back clean,
the mandatory escalation under 3.4.2 never happened, and the case closed as no further
action. Every other control on that case passes. The agent did not skip a step — it
performed the step, got a clean result, and the clean result was wrong.

**Prove it.** Run the evidence request for control 3.4.1, then switch from **Analysis** to
**Evidence from Hindsight**. That is the verbatim activity record, fetched by document id
rather than by similarity search. An auditor that works from recollection is worse than
useless.

Open the **Procedure** tab and try any control on any case: *"Provide evidence that
control 3.3.2 was followed for SAR-2026-0431."*

---

## How it works

```
app/demos/*        one route per demo, product UI on the left,
                   agent activity and Hindsight on the right
app/api/*          agent loops, streamed to the UI over SSE
lib/agent/runner   one Gemini tool-calling loop shared by every demo
lib/bank/*         synthetic bank systems, as agent tools
lib/demos/*        per-demo prompt, tool declarations and scenarios
data/seed/*        generated synthetic data, committed
scripts/*          seeders, memory seeders, headless scenario runner
```

Two things worth knowing if you read the code:

**Memory on/off is a flag over one agent, not two code paths.** Same model, same prompt,
same bank tools. The only difference is whether a recall tool is in the list. That
equivalence is what makes the comparison honest.

**Each demo has its own Hindsight bank**, so memory cannot leak between them.

### Running agents without the UI

```bash
npm run scenario payment-investigator hero        # cold and warm, side by side
npm run scenario payment-investigator guardrail
npm run scenario wire-exception returned-wire
npm run scenario sar sweep                        # full audit
npm run scenario sar evidence                     # single control, single case
npm run scenario sar-investigate live             # investigate the open alert
```

### Resetting

```bash
npm run reset:rewards                  # demo #3 — wipes the customer profile
npm run seed:sar:memory -- --fresh     # demo #4 — back to six closed cases
npm run seed:memory -- --fresh         # demo #1
npm run seed:memory:wires -- --fresh   # demo #2
```

Demo #3 writes memory live, so it accumulates whatever you say to it. The others only
read, except the SAR investigator which appends one record per run.

---

## Honest notes

- **Demo #1's memory is distilled, not written.** The seed retains nine resolved case
  records and lets Hindsight derive the knowledge page from them. The facts the demo
  turns on — the brands behind the billing entity, the annual cadence, that the descriptor
  suffix rotates per billing run — are its conclusions, not text anyone typed.
- **Agents are non-deterministic.** Tool-call counts vary between identical runs even at
  temperature 0. Outcomes have been stable in testing, but if you run demo #1 cold enough
  times it will occasionally volunteer a guess it cannot support.
- **Hindsight's async mental-model refresh does not currently complete against cloud.**
  Demo #3 falls back to a synchronous dry-run refresh, which computes the identical
  distillation. The profile you see is genuinely Hindsight's.
- **Failures are attributed on screen.** A model-provider error renders as *"Google Gemini
  API failed — HTTP 503. This is the language model provider, not Hindsight."* The model
  call retries three times with backoff first.

---

## Licence and scope

Demo code, written for one conference session. Not maintained, not production, not
affiliated with or representative of any real bank's systems or procedures. `AML-SAR-01`
is a plausible-looking fiction written for this demo and should not be mistaken for a real
institution's AML procedure.
