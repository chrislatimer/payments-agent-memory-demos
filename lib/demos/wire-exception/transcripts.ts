/**
 * Past support conversations between Brightmoor and Crestline National.
 *
 * The knowledge these carry is deliberately NOT guessable from the payment
 * itself: a threshold rule specific to one receiving bank, and the identifier
 * it demands above that threshold. Crestline's systems record that WIRE-41092
 * was returned and WIRE-41118 cleared. Nothing in them records why, or what
 * changed between the two.
 */
export const TRANSCRIPTS: { id: string; date: string; title: string; body: string }[] = [
  {
    id: 'CHAT-30114',
    date: '2026-03-12',
    title: 'Returned wire WIRE-41092 to Cementos Pacifico',
    body: `Renata Alves (Brightmoor Industrial, Treasury): Our wire WIRE-41092 for $185,000 to Cementos Pacifico came back this morning. All it says is "BNF INFO INCOMPLETE". We have been paying this supplier for a year with the same details. What is actually missing?

Crestline (M. Okonjo, Global Payments Support): I have had to chase Banco del Norte on this before. The address is fine and the CLABE is fine. What they are actually objecting to is the beneficiary's RFC. Their own rule is that any commercial credit above one million pesos has to carry the beneficiary tax ID, and at this size you are over that.

Renata Alves: The return code says beneficiary information. I assumed it meant the address.

Crestline (M. Okonjo): It does say that, and it is misleading. The code is generic. Banco del Norte uses it for anything on the beneficiary side, including a missing RFC. We have no way to see their threshold from our end, which is why this is not in our validation.

Renata Alves: So smaller payments to the same supplier would go through without it?

Crestline (M. Okonjo): Correct. Under a million pesos they do not ask for it. That is why this has never bitten you before.

Renata Alves: Can you fix the one that bounced?

Crestline (M. Okonjo): No. Once a wire is returned by the beneficiary bank it cannot be repaired or re-sent. You will need to put the RFC on the beneficiary record and submit it as a new payment.`,
  },
  {
    id: 'CHAT-30118',
    date: '2026-03-13',
    title: 'Resubmitted wire cleared',
    body: `Renata Alves (Brightmoor Industrial, Treasury): Supplier sent their RFC: CPA920314K21. I put it on the beneficiary record and submitted WIRE-41118 this morning.

Crestline (M. Okonjo, Global Payments Support): I can see it. It cleared the corridor and is with Banco del Norte. Nothing outstanding on our side.

Renata Alves: So the only difference between the one that bounced and this one is the RFC.

Crestline (M. Okonjo): Correct. Same amount, same account, same SWIFT, same address. The tax ID was the only change.

Renata Alves: Noting that. Our form has it as optional so nobody fills it in.

Crestline (M. Okonjo): It is optional for us. It is not optional for Banco del Norte above their threshold. Worth putting it on the record permanently.`,
  },
  {
    id: 'CHAT-31902',
    date: '2026-08-20',
    title: 'Setting up beneficiaries from the new AP system',
    body: `Doug Pyne (Brightmoor Industrial, Accounts Payable): We have moved to a new AP system and I am re-creating our supplier records in the portal from its export. Anything I should watch for?

Crestline (L. Haddad, Global Payments Support): Mainly that accounting exports tend to carry name, address and bank details and nothing else. Anything you added by hand to the old record will not be in the export.

Doug Pyne: Ours exports name, address, bank, account. That is all the columns it has.

Crestline (L. Haddad): Then compare each new record against the one it replaces before you retire the old one, and re-key anything that is missing.

Doug Pyne: Will do, thanks.`,
  },
  {
    id: 'CHAT-31240',
    date: '2026-06-04',
    title: 'Cut-off time for same day value',
    body: `Renata Alves (Brightmoor Industrial, Treasury): What is the cut-off for same day value on USD to NOK?

Crestline (M. Okonjo, Global Payments Support): 14:30 Eastern for same day value. After that it goes next business day.

Renata Alves: Thanks.`,
  },
];
