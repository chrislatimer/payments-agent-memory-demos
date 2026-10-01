import { sarAlerts, sarSubjects } from '@/lib/bank/sar';
import { listPolicies, listControls } from '@/lib/demos/sar-auditor/policies';
import { sarAuditor } from '@/lib/demos/sar-auditor';
import SarDemo from './SarDemo';

export default function Page() {
  const policy = listPolicies()[0];
  return (
    <SarDemo
      alerts={sarAlerts.map((a) => ({ ...a, subject: sarSubjects.find((s) => s.subject_id === a.subject_id)?.legal_name ?? a.subject_id }))}
      policy={{ id: policy.id, title: policy.title, markdown: policy.markdown }}
      controls={listControls()}
      auditPrompts={sarAuditor.scenarios.map((s) => ({ id: s.id, label: s.label, intent: s.intent, prompt: s.prompt }))}
    />
  );
}
