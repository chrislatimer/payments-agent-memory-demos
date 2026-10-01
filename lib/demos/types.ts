import type { FunctionDeclaration } from '@google/genai';

export type Scenario = {
  id: string;
  label: string;
  /** What the operator or customer says to kick the demo off. */
  prompt: string;
  /** One line for the stage: what this run is meant to prove. */
  intent: string;
  /** What a correct run produces. Lets the UI show "the guardrail held"
   *  rather than leaving an unchanged outcome looking like a dud. */
  expect: { memoryOff: string; memoryOn: string };
  /** What memory changes here, even when the outcome is the same. */
  memoryEffect: string;
};

export type Demo = {
  /** Countdown position. Contiguous: a gap in the numbering reads as a
   *  missing demo on screen. */
  rank: 1 | 2 | 3 | 4;
  slug: string;
  title: string;
  /** The Hindsight capability this demo owns. Each must be distinct. */
  capability: string;
  systemPrompt: string;
  declarations: FunctionDeclaration[];
  /** Implementations for this demo's declarations. */
  tools: Record<string, (args: Record<string, unknown>) => unknown | Promise<unknown>>;
  /** Hindsight bank this demo reads. One per demo; memory must not leak. */
  bank: string;
  /** Name and description of the memory tool, so each demo frames recall in
   *  its own language (prior cases vs past conversations). */
  memoryTool: { name: string; description: string; argDescription: string };
  scenarios: Scenario[];
  /** Tags scoping this demo's memories. */
  memoryTags: string[];
};
