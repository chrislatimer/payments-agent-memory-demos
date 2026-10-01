// Crestline National — business banking wire transfers. Synthetic.

export type BusinessCustomer = {
  customer_id: string;
  legal_name: string;
  users: { user_id: string; name: string; role: string }[];
};

export type Beneficiary = {
  beneficiary_id: string;
  customer_id: string;
  name: string;
  bank_name: string;
  swift: string;
  account: string;
  country: string;
  /** As keyed by the customer. Completeness is the whole demo. */
  address: { line1: string; neighbourhood?: string; postal_code?: string; city: string; region?: string; country: string };
  /** Beneficiary tax identifier. Optional on Crestline's form. Some receiving
   *  banks require it above their own thresholds; Crestline holds no record
   *  of which, or of what those thresholds are. */
  tax_id?: string;
  created_date: string;
  created_by: string;
};

export type Wire = {
  wire_id: string;
  customer_id: string;
  beneficiary_id: string;
  value_date: string;
  amount: number;
  debit_currency: string;
  credit_currency: string;
  corridor: string;
  status: 'COMPLETED' | 'RETURNED' | 'IN_PROGRESS';
  return_code?: string;
  returned_date?: string;
  /** Verbatim text the beneficiary bank sent back. Deliberately unhelpful. */
  return_text?: string;
  initiated_by: string;
};

export type ReturnCode = { code: string; title: string; description: string; repairable: boolean };

export type CorridorRequirement = {
  corridor: string;
  beneficiary_bank_country: string;
  required_beneficiary_fields: string[];
  /** Fields the bank's own form marks optional. Some receiving banks reject
   *  without them anyway. The bank does not record which ones. */
  optional_beneficiary_fields: string[];
  notes: string;
};
