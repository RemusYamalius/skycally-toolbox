interface Props {
  steps: [string, string, string];
}

export function HowToUse({ steps }: Props) {
  return (
    <section className="mt-12 rounded-2xl border border-border bg-card/50 p-6">
      <h2 className="font-display text-lg font-bold mb-4">How to use</h2>
      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "color-mix(in oklab, var(--cyan-brand) 18%, transparent)", color: "var(--cyan-brand)" }}>{i + 1}</div>
            <p className="text-sm text-muted-foreground">{s}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
