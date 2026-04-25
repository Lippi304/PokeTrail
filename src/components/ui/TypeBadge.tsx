// src/components/ui/TypeBadge.tsx
// A11Y-01: Always render text label (color-blind support).
// D-06: 15 Gen-1 types only — Steel/Dark/Fairy excluded.
const TYPE_BG: Record<string, string> = {
  normal: 'bg-zinc-400 text-black',
  fire: 'bg-red-500 text-white',
  water: 'bg-blue-500 text-white',
  electric: 'bg-yellow-400 text-black',
  grass: 'bg-green-500 text-white',
  ice: 'bg-cyan-300 text-black',
  fighting: 'bg-orange-700 text-white',
  poison: 'bg-purple-500 text-white',
  ground: 'bg-amber-700 text-white',
  flying: 'bg-indigo-400 text-white',
  psychic: 'bg-pink-500 text-white',
  bug: 'bg-lime-500 text-black',
  rock: 'bg-stone-500 text-white',
  ghost: 'bg-violet-700 text-white',
  dragon: 'bg-indigo-700 text-white',
};

export interface TypeBadgeProps {
  type: string;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const palette = TYPE_BG[type] ?? 'bg-zinc-600 text-white';
  return (
    <span
      className={[
        'inline-flex items-center justify-center',
        'rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider',
        palette,
      ].join(' ')}
    >
      {/* TEXT label is mandatory per A11Y-01 — color-blind users rely on this */}
      {type}
    </span>
  );
}
