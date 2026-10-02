# Component Recipes

## Panel

Use a semantic surface, subtle border, and one clear scroll owner.

```tsx
<section className="rounded-[14px] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-lg md:p-6">
  {children}
</section>
```

Use backdrop blur only when a selected background is visible and contrast remains sufficient without it.

## Data card

```tsx
<article className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4">
  <p className="text-xs font-medium text-slate-400">{label}</p>
  <p className="mt-1 font-mono text-xl font-bold text-[var(--text-color)]">{value}</p>
</article>
```

Do not create a wall of cards when rows, a grid without containers, or a table communicates the hierarchy better.

## Primary action

Use the shared `Button` primitive where possible. If a local button is required:

```tsx
<button className="min-h-10 rounded-[8px] bg-[var(--accent)] px-4 text-sm font-semibold text-slate-950 transition-transform duration-200 hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
  {label}
</button>
```

Verify text contrast against every supported accent, including white.

## Status

Pair color with a label or icon. Keep semantic meaning stable across themes.

```tsx
<span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-300">
  <CheckCircle2 aria-hidden className="size-3.5" />
  Đạt
</span>
```

## Responsive split workspace

```tsx
<main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]">
  <section className="min-h-0 overflow-y-auto p-4 md:p-6">{primary}</section>
  <aside className="hidden min-h-0 overflow-y-auto border-l border-[var(--border)] p-6 lg:block">
    {secondary}
  </aside>
</main>
```

Provide a sheet, drawer, or tab entry to access secondary content below `lg`.

## Table mobile strategy

Choose one explicitly:

1. Horizontal scroll and sticky first column for comparison-heavy data.
2. Hide low-priority columns and expose details in a drawer.
3. Project each row to a compact list card for action-heavy data.

Keep the same data and actions available. Mobile adaptation must not silently delete critical information.

## State cycle

Keep layout geometry stable:

- Loading: skeletons with final row/card proportions.
- Empty: concise reason plus the single next action.
- Error: plain description plus retry or recovery path.
- Populated: real content.
- Disabled: explanation when the reason is not obvious.

## Motion

Use CSS transitions for hover and active feedback. Use the installed motion library only for state orchestration or meaningful entry/exit. Respect both system and app-level reduced motion.
