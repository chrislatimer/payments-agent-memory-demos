// Crestline National Bank — synthetic systems of record.
// Fictional institution. No resemblance to any real bank's data model or UI.

export type Customer = {
  customer_id: string;
  name: string;
  city: string;
  state: string;
  addresses: { label: string; line1: string; city: string; state: string; postal: string }[];
  card_last4: string;
  customer_since: string;
};

/** A legal entity as the acquirer knows it. Note what is absent: brands. */
export type Merchant = {
  merchant_id: string;
  legal_name: string;
  mcc: string;
  mcc_description: string;
  city: string;
  state: string;
  /** True for billing intermediaries that bill on behalf of brands. */
  merchant_of_record: boolean;
};

/** Raw statement descriptor -> merchant. The suffix is NOT a stable brand key. */
export type Descriptor = {
  descriptor: string;
  merchant_id: string;
};

export type Transaction = {
  transaction_id: string;
  customer_id: string;
  posted_date: string;
  amount: number;
  descriptor: string;
  channel: 'card_present' | 'card_not_present';
  recurring: boolean;
  ship_to_postal?: string;
};

export type Dispute = {
  dispute_id: string;
  customer_id: string;
  transaction_id: string;
  opened_date: string;
  status: 'OPEN' | 'RESOLVED';
  customer_claim: string;
  reason_code?: string;
  resolution?: 'RECOGNIZED_NO_CHARGEBACK' | 'CHARGEBACK_FILED' | 'BILLING_DISPUTE_ROUTED' | 'CONFIRMED_FRAUD';
  resolution_date?: string;
  analyst?: string;
  resolution_note?: string;
};

export type ReasonCode = {
  code: string;
  family: string;
  title: string;
  network_response_days: number;
  provisional_credit_required: boolean;
};

export type DisputePolicy = {
  policy_id: string;
  reason_code_family: string;
  title: string;
  required_steps: string[];
};

export type BankSeed = {
  customers: Customer[];
  merchants: Merchant[];
  descriptors: Descriptor[];
  transactions: Transaction[];
  disputes: Dispute[];
  reason_codes: ReasonCode[];
  policies: DisputePolicy[];
};
