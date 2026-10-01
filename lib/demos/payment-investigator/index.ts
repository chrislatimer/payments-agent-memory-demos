import { Type, type FunctionDeclaration } from '@google/genai';
import { str } from '@/lib/agent/runner';
import { callBankTool } from '@/lib/bank/tools';
import { DISPUTES_BANK } from '@/lib/hindsight/recall';
import type { Demo } from '../types';

const declarations: FunctionDeclaration[] = [
  { name: 'get_dispute', description: 'Retrieve a dispute case by id.',
    parameters: { type: Type.OBJECT, properties: { dispute_id: str('e.g. DSP-10428') }, required: ['dispute_id'] } },
  { name: 'get_transaction', description: 'Retrieve a single transaction by id.',
    parameters: { type: Type.OBJECT, properties: { transaction_id: str('e.g. TXN-80249') }, required: ['transaction_id'] } },
  { name: 'get_transactions', description: 'List a cardholder transactions within a date window (inclusive, YYYY-MM-DD).',
    parameters: { type: Type.OBJECT, properties: { customer_id: str('e.g. C-2041'), from: str('YYYY-MM-DD'), to: str('YYYY-MM-DD') }, required: ['customer_id', 'from', 'to'] } },
  { name: 'lookup_merchant_descriptor', description: 'Resolve a statement descriptor to the merchant legal entity on the acquirer record.',
    parameters: { type: Type.OBJECT, properties: { descriptor: str('verbatim statement descriptor') }, required: ['descriptor'] } },
  { name: 'get_merchant', description: 'Retrieve a merchant legal entity by id.',
    parameters: { type: Type.OBJECT, properties: { merchant_id: str('e.g. M-0412') }, required: ['merchant_id'] } },
  { name: 'get_customer_dispute_history', description: 'Prior disputes filed by this cardholder.',
    parameters: { type: Type.OBJECT, properties: { customer_id: str('e.g. C-2041') }, required: ['customer_id'] } },
  { name: 'get_dispute_policy', description: 'Bank policy and reason codes for a family: FRAUD or CONSUMER_DISPUTE.',
    parameters: { type: Type.OBJECT, properties: { reason_code_family: str('FRAUD or CONSUMER_DISPUTE') }, required: ['reason_code_family'] } },
  { name: 'compare_ship_to_addresses', description: 'Compare a ship-to postal code against the cardholder addresses on file.',
    parameters: { type: Type.OBJECT, properties: { customer_id: str('e.g. C-2041'), postal: str('postal code') }, required: ['customer_id', 'postal'] } },
  { name: 'get_customer', description: 'Retrieve cardholder profile and addresses on file.',
    parameters: { type: Type.OBJECT, properties: { customer_id: str('e.g. C-2041') }, required: ['customer_id'] } },
];

const systemPrompt = `You are a payment investigation agent at Crestline National Bank.

A cardholder has claimed they do not recognise a charge. Your job is to prepare the
case for a human analyst: establish what the charge actually was, gather evidence,
and recommend a disposition. You do not decide the case and you never file a
chargeback yourself.

Rules:
- Retrieve the applicable dispute policy and follow its required steps.
- Authoritative facts come from the bank systems. If operational memory suggests an
  explanation, you must confirm it against the transaction records before relying on
  it. If the records do not confirm it, say so and proceed on the evidence.
- Do not speculate about what a merchant might be. Either the bank data supports an
  identification or it does not.
- Finish with a short recommendation naming the reason code family you would route to
  and the evidence supporting it.

Your final message MUST end with two blocks, in exactly this form:

---OUTCOME---
IDENTIFIED if the bank records confirmed what the cardholder actually bought.
NOT_IDENTIFIED if they did not. One word, nothing else.

---CUSTOMER---
<two or three sentences addressed directly to the cardholder, in plain language.
No reason codes, no policy ids, no internal jargon. If you identified the charge,
name what they actually bought and when, and ask them to confirm. If you could not
identify it, tell them you are treating it as unauthorised and what happens next.>

Everything above that marker is for the analyst. The block below it is shown to the
cardholder verbatim.`;

export const paymentInvestigator: Demo = {
  rank: 4,
  slug: 'payment-investigator',
  title: 'AI Payment Investigator',
  capability: 'Institutional memory: knowledge distilled across many customers’ resolved cases, applied to a customer with no relevant history of their own.',
  systemPrompt,
  declarations,
  tools: Object.fromEntries(declarations.map((d) => [d.name!, (args: Record<string, unknown>) => callBankTool(d.name!, args)])),
  bank: DISPUTES_BANK,
  memoryTool: {
    name: 'recall_prior_cases',
    description:
      'Search the bank operational memory of previously resolved dispute cases and analyst corrections. '
      + 'Returns learned patterns, not authoritative records. Anything it suggests must be verified against '
      + 'the bank systems before you rely on it.',
    argDescription: 'what you are trying to learn from past cases',
  },
  memoryTags: ['demo5', 'disputes'],
  scenarios: [
    {
      id: 'hero',
      label: 'DSP-10428 — Dana Whitfield',
      intent: 'Dana has a Vireo purchase 12 months back. Memory should name the brand behind the billing entity; the bank records should confirm it. Outcome must CHANGE when memory is on.',
      expect: { memoryOff: 'NOT_IDENTIFIED', memoryOn: 'IDENTIFIED' },
      memoryEffect: 'Memory supplies the brand behind Northbeam Digital and the 11-13 month search window. The transaction records confirm it.',
      prompt: 'Case DSP-10428 has been opened by cardholder C-2041. Investigate and prepare the case for an analyst.',
    },
    {
      id: 'guardrail',
      label: 'DSP-10431 — Marcus Bell (guardrail)',
      intent: 'Marcus has NO prior Northbeam or Vireo activity. The agent must NOT deflect. Outcome must stay the SAME with memory on — that is the point of this run.',
      expect: { memoryOff: 'NOT_IDENTIFIED', memoryOn: 'NOT_IDENTIFIED' },
      memoryEffect: 'Memory still directs the search to the 11-13 month window. The bank records refuse to confirm, so the agent stays on the fraud path. Memory is a search strategy, never a verdict.',
      prompt: 'Case DSP-10431 has been opened by cardholder C-2098. Investigate and prepare the case for an analyst.',
    },
  ],
};
