// src/components/layout/Disclaimer.tsx
// D-03 (locked text). Used in title-screen footer (Phase 1) and Settings (Phase 3).
// The wording is contractually fixed by the phase decision register — DO NOT reword.
export function Disclaimer() {
  return (
    <p className="text-xs text-zinc-500 leading-relaxed">
      PokeTrail is a non-commercial fan project. Pokémon and all related characters are trademarks
      of Nintendo / Game Freak / The Pokémon Company. This site is not affiliated with or endorsed
      by them.
    </p>
  );
}
