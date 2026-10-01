import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Policies are controlled documents. They live in the repository as markdown,
 * not in Hindsight: the audit has to be against the authoritative text, and a
 * policy stored in the same place as the evidence would make the whole
 * exercise circular.
 */
const DIR = join(process.cwd(), 'lib', 'demos', 'sar-auditor', 'policies');

export type Control = { id: string; section: string; text: string };

export function listPolicies(): { id: string; title: string; markdown: string }[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const markdown = readFileSync(join(DIR, f), 'utf8');
      const title = markdown.split('\n')[0].replace(/^#\s*/, '');
      return { id: f.replace(/\.md$/, ''), title, markdown };
    });
}

export function getPolicy(id: string) {
  return listPolicies().find((p) => p.id === id);
}

/** Every numbered control, so the auditor can be asked about one by id. */
export function listControls(policyId = 'AML-SAR-01'): Control[] {
  const p = getPolicy(policyId);
  if (!p) return [];
  const controls: Control[] = [];
  let section = '';
  for (const line of p.markdown.split('\n')) {
    const sec = line.match(/^###\s+([\d.]+)\s+(.*)$/);
    if (sec) section = `${sec[1]} ${sec[2]}`;
    const c = line.match(/^\*\*(\d+\.\d+\.\d+)\*\*\s+(.*)$/);
    if (c) controls.push({ id: c[1], section, text: c[2].trim() });
  }
  // A control runs until the next control, heading or rule. Blank lines inside
  // it are part of it: in this procedure the substance of 3.4.1 sits in its
  // second paragraph, and stopping at the first blank line loses it.
  const lines = p.markdown.split('\n');
  controls.forEach((ctl) => {
    const start = lines.findIndex((l) => l.startsWith(`**${ctl.id}**`));
    const parts: string[] = [lines[start].replace(/^\*\*[\d.]+\*\*\s*/, '')];
    for (let i = start + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^\*\*\d+\.\d+\.\d+\*\*/.test(l) || l.startsWith('#') || l.startsWith('---') || l.startsWith('|')) break;
      parts.push(l);
    }
    ctl.text = parts.join(' ').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  });

  return controls;
}

export function getControl(id: string, policyId = 'AML-SAR-01') {
  return listControls(policyId).find((c) => c.id === id);
}
