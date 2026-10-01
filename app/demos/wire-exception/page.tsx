import { getWireView } from '@/lib/bank/wires';
import { getDemo } from '@/lib/demos/registry';
import WireDemo from './WireDemo';

export default function Page() {
  const demo = getDemo('wire-exception')!;
  const view = getWireView('CORP-014');
  return <WireDemo rank={demo.rank} title={demo.title} scenarios={demo.scenarios} view={view} />;
}
