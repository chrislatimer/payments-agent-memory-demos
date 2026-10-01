import type { Demo } from './types';
import { paymentInvestigator } from './payment-investigator';
import { wireException } from './wire-exception';
import { pointsAssistant } from './points-assistant';
import { sarInvestigator, sarAuditor } from './sar-auditor';

/**
 * All five session demos, in countdown order. Only #5 is built; the rest are
 * declared so the shared bank, UI shell and harness are shaped for them from
 * the start rather than retrofitted.
 */
// The investigator and the auditor share one surface at /demos/sar, so the
// gallery lists them once.
export const DEMOS: Demo[] = [
  paymentInvestigator,
  wireException,
  pointsAssistant,
  { ...sarAuditor, slug: 'sar', title: 'AI Auditor', capability: 'Tests completed AML investigations against a controlled procedure, citing the verbatim activity record Hindsight holds as evidence.' },
];
export const SAR_SPECS = { investigator: sarInvestigator, auditor: sarAuditor };

/** Specs the UI and harness address directly, including ones not listed in the
 *  gallery. `sar` is the auditor; `sar-investigate` runs the same surface's
 *  investigation step. */
export const ALL_SPECS: Demo[] = [...DEMOS, { ...sarInvestigator, slug: 'sar-investigate' }];


export const getDemo = (slug: string) => ALL_SPECS.find((d) => d.slug === slug);
