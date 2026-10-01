import Link from 'next/link';
import { DEMOS } from '@/lib/demos/registry';

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Crestline National Bank — synthetic demo environment</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Agent Opportunities in Payments</h1>
      <p className="mt-3 max-w-2xl text-neutral-500">
        Four agents. Each one showcases a different job for memory. Fictional bank, synthetic data.
      </p>

      <div className="mt-10 space-y-3">
        {DEMOS.map((d) => (
          <Link key={d.slug} href={`/demos/${d.slug}`}
            className="block rounded-lg border border-neutral-300 bg-white p-5 transition hover:border-emerald-500">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-emerald-700">#{d.rank}</span>
              <span className="text-xl font-medium">{d.title}</span>
            </div>
            <p className="mt-2 text-sm text-neutral-500">{d.capability}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
