import { Type, type FunctionDeclaration } from '@google/genai';
import { str } from '@/lib/agent/runner';
import { callRewardsTool } from '@/lib/bank/rewards';
import type { Demo } from '../types';

export const REWARDS_BANK = process.env.HINDSIGHT_REWARDS_BANK ?? 'crestline-rewards-c-latimer';

const declarations: FunctionDeclaration[] = [
  { name: 'get_points_balance', description: 'Current available and pending points, and the card.',
    parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'get_points_activity', description: 'Recent points earning activity.',
    parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'search_award_travel', description: 'Award flight options. Points cost returned is PER SEAT.',
    parameters: { type: Type.OBJECT, properties: {
      destination: str('e.g. Honolulu, Maui, Tokyo'),
      cabin: str('First, Business or Economy'),
      month: str('YYYY-MM'),
    } } },
  { name: 'get_redemption_options', description: 'Ways to redeem points and the value each returns.',
    parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'get_current_offers', description: 'Bonus earning categories currently running, with multipliers, end dates and spend caps.',
    parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'estimate_points_from_spend', description: 'Points a given amount of spend at a given merchant would earn, accounting for any live bonus and its cap.',
    parameters: { type: Type.OBJECT, properties: { merchant: str('e.g. Home Depot'), amount: str('dollar amount, numbers only') }, required: ['merchant', 'amount'] } },
  { name: 'points_gap', description: 'How far the current balance falls short of a points total.',
    parameters: { type: Type.OBJECT, properties: { points_needed: str('total points required') }, required: ['points_needed'] } },
];

const systemPrompt = `You are the rewards assistant in Crestline National's online banking.
You are talking to the cardholder about what to do with their points.

What you are for:
- Telling them what their points are actually worth and what they can get.
- Pricing a specific goal and saying plainly whether they can afford it.
- When they are short, helping them see a realistic path to closing the gap.

How to behave:
- Use the tools for every number. Balances, award prices, offers and multipliers
  change; never state one from memory or from your own assumptions.
- Points costs from search_award_travel are PER SEAT. Multiply for the party size
  and say so.
- Be concrete and brief. They can already see their balance; what they cannot see
  is what it is worth and what to do next.

The rule that matters most:
- You may point out a current bonus category ONLY when it lines up with something
  the customer has already told you they intend to buy or do. Never encourage
  spending for the sake of earning points, never invent a need, and never imply
  they should buy something they have not raised themselves. If nothing they have
  mentioned lines up with a current offer, say the gap closes through normal
  spending or suggest a cheaper redemption instead.
- If you are drawing on something they told you earlier, say so in passing, so it
  is clear where it came from.

Keep replies short. Markdown is fine. No preamble, no restating the question.`;

export const pointsAssistant: Demo = {
  rank: 2,
  slug: 'points-assistant',
  title: 'AI Points Spender',
  capability: 'Per-user memory across sessions: what this customer is saving for and what they were already going to buy.',
  systemPrompt,
  declarations,
  tools: Object.fromEntries(declarations.map((d) => [d.name!, (args: Record<string, unknown>) => callRewardsTool(d.name!, args)])),
  bank: REWARDS_BANK,
  memoryTool: {
    name: 'recall_about_customer',
    description: 'Recall what this customer has told you in previous conversations.',
    argDescription: 'what you want to remember about this customer',
  },
  memoryTags: ['demo2', 'rewards'],
  scenarios: [
    {
      id: 'chat',
      label: 'Rewards assistant',
      intent: 'Multi-session chat. Session one establishes the goal and the life context. Later sessions open already knowing both, and connect live offers to things the customer already said they needed.',
      expect: { memoryOff: 'n/a', memoryOn: 'n/a' },
      memoryEffect: 'Everything the customer says is retained to their own bank. New sessions start with no transcript but full memory.',
      prompt: 'What can I actually do with these points?',
    },
  ],
};
