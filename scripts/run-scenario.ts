import 'dotenv/config';
import { runAgent, MODEL } from '../lib/agent/runner';
import { getDemo } from '../lib/demos/registry';

async function run(demoSlug: string, scenarioId: string, memory: boolean) {
  const demo = getDemo(demoSlug);
  if (!demo) throw new Error(`unknown demo: ${demoSlug}`);
  const sc = demo.scenarios.find((s) => s.id === scenarioId);
  if (!sc) throw new Error(`unknown scenario: ${scenarioId}`);

  const t0 = Date.now();
  let tools = 0, mem = 0, turns = 0, final = '';
  const trace: string[] = [];
  for await (const e of runAgent(demo, { prompt: sc.prompt, memory })) {
    if (e.kind === 'tool') { tools++; trace.push(`  ${String(tools).padStart(2)}. ${e.name}(${JSON.stringify(e.args).slice(0, 90)})`); }
    if (e.kind === 'memory') { mem++; trace.push(`  ** recall("${e.query.slice(0, 60)}") -> ${e.pages.length} page(s), ${e.facts.length} facts`); }
    if (e.kind === 'text') final = e.text;
    if (e.kind === 'done') turns = e.turns;
  }
  console.log(`\n${'='.repeat(74)}\n#${demo.rank} ${demo.title} / ${sc.label}  memory=${memory}  ${MODEL}\n${sc.intent}\n${'='.repeat(74)}`);
  console.log(trace.join('\n'));
  console.log(`\n  -> bank tool calls: ${tools} | recalls: ${mem} | turns: ${turns} | ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`\n  FINAL:\n${final.split('\n').map((l) => '  | ' + l).join('\n')}`);
  return { tools, mem };
}

async function main() {
  const demo = process.argv[2] ?? 'payment-investigator';
  const scenario = process.argv[3] ?? 'hero';
  const cold = await run(demo, scenario, false);
  const warm = await run(demo, scenario, true);
  console.log(`\n${'#'.repeat(74)}\nOBSERVED ${demo}/${scenario}: cold ${cold.tools} calls vs memory ${warm.tools} calls + ${warm.mem} recall\n${'#'.repeat(74)}`);
}
main().catch((e) => { console.error('FAILED:', e?.message ?? e); process.exit(1); });
