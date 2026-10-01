import { getStatement } from '@/lib/bank/statement';
import { getDemo } from '@/lib/demos/registry';
import PaymentDemo from './PaymentDemo';

export default function Page() {
  const demo = getDemo('payment-investigator')!;
  // Both cardholders are loaded up front so the presenter can switch between
  // the hero case and the guardrail case without a reload mid-talk.
  return (
    <PaymentDemo
      scenarios={demo.scenarios.map((s) => ({
        ...s,
        customer_id: s.id === 'hero' ? 'C-2041' : 'C-2098',
        statement: getStatement(s.id === 'hero' ? 'C-2041' : 'C-2098'),
      }))}
    />
  );
}
