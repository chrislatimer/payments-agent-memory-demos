import { Type, type FunctionDeclaration } from '@google/genai';
import { str } from '@/lib/agent/runner';
import { callWireTool } from '@/lib/bank/wires';
import { WIRES_BANK } from '@/lib/hindsight/recall';
import type { Demo } from '../types';

const declarations: FunctionDeclaration[] = [
  { name: 'get_wire', description: 'Retrieve a wire transfer by id, including return code if it was returned.',
    parameters: { type: Type.OBJECT, properties: { wire_id: str('e.g. WIRE-48271') }, required: ['wire_id'] } },
  { name: 'get_wire_history', description: 'All wires sent by this business customer, newest first.',
    parameters: { type: Type.OBJECT, properties: { customer_id: str('e.g. CORP-014') }, required: ['customer_id'] } },
  { name: 'get_beneficiary', description: 'Retrieve a saved beneficiary record exactly as the customer keyed it.',
    parameters: { type: Type.OBJECT, properties: { beneficiary_id: str('e.g. BEN-7902') }, required: ['beneficiary_id'] } },
  { name: 'list_beneficiaries', description: 'All beneficiary records saved by this business customer.',
    parameters: { type: Type.OBJECT, properties: { customer_id: str('e.g. CORP-014') }, required: ['customer_id'] } },
  { name: 'get_return_code', description: 'What a beneficiary bank return code means and whether the wire can be repaired.',
    parameters: { type: Type.OBJECT, properties: { code: str('e.g. BNF_INFO_17') }, required: ['code'] } },
  { name: 'get_corridor_requirements', description: 'Beneficiary fields required for a payment corridor.',
    parameters: { type: Type.OBJECT, properties: { corridor: str('e.g. US->MX') }, required: ['corridor'] } },
  { name: 'get_business_customer', description: 'Business customer profile and authorised users.',
    parameters: { type: Type.OBJECT, properties: { customer_id: str('e.g. CORP-014') }, required: ['customer_id'] } },
  {
    name: 'prepare_corrected_wire',
    description:
      'Prepare a corrected replacement wire as a DRAFT for the customer to review. Never submits. '
      + 'Only call this after the customer has explicitly asked you to prepare it.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        source_wire_id: str('the returned wire being replaced'),
        beneficiary_name: str('beneficiary legal name'),
        beneficiary_account: str('account or CLABE'),
        beneficiary_bank: str('beneficiary bank name'),
        swift: str('SWIFT/BIC'),
        address_line1: str('street address'),
        address_neighbourhood: str('neighbourhood / colonia, if the corridor requires it'),
        beneficiary_tax_id: str('beneficiary tax identifier, if the receiving bank requires one'),
        address_postal_code: str('postal code / C.P.'),
        address_city: str('city'),
        address_country: str('ISO country code'),
        corrected_fields: str('comma-separated list of the fields you changed versus the returned wire'),
      },
      required: ['source_wire_id', 'beneficiary_name', 'address_line1', 'address_city', 'address_country', 'corrected_fields'],
    },
  },
];

const systemPrompt = `You are a payments assistant inside Crestline National's business
banking portal. You are talking directly to the customer's treasury or accounts payable
staff, not to bank operations.

A payment has gone wrong and they want to know what happened and what to do about it.

Rules:
- The beneficiary bank's return code tells you a category, not a field. It will not tell
  you which piece of information was deficient. Work that out from the bank's own records.
- Compare what was actually sent against what the corridor requires, and against anything
  this customer has successfully sent before.
- If operational memory suggests an explanation, confirm it against the beneficiary
  records and corridor requirements before relying on it. Never state a requirement that
  you have only seen in memory.
- Be specific. Name the exact fields. "Beneficiary details were incomplete" is what the
  customer already has and it is useless to them.
- Compare this payment against the customer's earlier payments to the same counterparty.
  Where an earlier one succeeded, the difference between the two is your strongest
  evidence. Beneficiary records are not deduplicated, so the same counterparty may appear
  more than once under different identifiers.
- Do not guess, and do not offer speculative candidates. If every field the corridor
  requires was supplied and you have no basis in the bank's records or in memory for
  identifying what the receiving bank objected to, then say plainly that you cannot
  determine it, and set out the customer's options. Do not list fields the receiving bank
  "might" want, and do not reason from general knowledge about the destination country.
  A plausible wrong answer about a $420,000 payment is worse than an honest dead end,
  because the customer will act on it and the payment will fail again.
- A returned wire cannot be repaired. If a replacement is needed, say so.
- Do NOT prepare a replacement wire unless the customer has asked you to. Offer, then wait.
- If memory contains the actual values that worked on an earlier payment, propose them
  rather than asking the customer to go and find them again. Say where they came from and
  ask them to confirm before anything is sent. Do not present a remembered value as a
  bank record.

Your final message MUST end with two blocks, in exactly this form:

---OUTCOME---
DIAGNOSED if you identified the specific fields that caused the failure.
UNDIAGNOSED if you could not.
DRAFT_PREPARED if you have just prepared a replacement wire.
One word, nothing else.

---CUSTOMER---
<what you say to the customer, in plain language. Name the exact fields. If you have
not yet been asked to prepare a replacement, end by offering to prepare one.>`;

export const wireException: Demo = {
  rank: 3,
  slug: 'wire-exception',
  title: 'AI Payment Exception Resolver',
  capability:
    'Past support conversations as memory: what the bank told this customer before, and which fix actually worked.',
  systemPrompt,
  declarations,
  tools: Object.fromEntries(declarations.map((d) => [d.name!, (args: Record<string, unknown>) => callWireTool(d.name!, args)])),
  bank: WIRES_BANK,
  memoryTool: {
    name: 'recall_past_conversations',
    description:
      'Search past support conversations with this customer. Returns what was discussed and what '
      + 'resolved earlier problems. These are recollections of conversations, not authoritative bank '
      + 'records: confirm anything they suggest against the beneficiary records and corridor requirements.',
    argDescription: 'what you are trying to learn from past conversations with this customer',
  },
  memoryTags: ['demo4', 'wires'],
  scenarios: [
    {
      id: 'returned-wire',
      label: 'WIRE-48271 — $420,000 returned',
      intent:
        'Memory OFF is today: a generic return message and a support queue, 1-2 business days, $420,000 sitting still. Memory ON: the agent recalls the March conversation, compares this wire against the one that cleared, and finds the difference.',
      expect: { memoryOff: 'UNDIAGNOSED', memoryOn: 'DIAGNOSED' },
      memoryEffect:
        'The March conversation points the agent at WIRE-41118, the payment that cleared. Comparing that wire\'s beneficiary record against this one shows the only difference: the RFC. The bank holds both records; nothing in it says they are the same counterparty or that the tax ID is what mattered.',
      prompt:
        'I am Renata Alves at Brightmoor Industrial (CORP-014). Our wire WIRE-48271 for $420,000 came back. What happened and what do I need to do?',
    },
  ],
};
