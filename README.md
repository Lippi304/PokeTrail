# PokeTrail

A browser-based Pokémon roguelike. Pick a Gen-1 starter, fight through randomly generated routes, beat 8 gym leaders, then the Top 4 and Champion in under 45 minutes.

## Stack

Vite 6 · React 19.2 · TypeScript 5.7 (strict) · Tailwind v4.2 · Vitest 2 · Zod 3 · Immer 10. State via React Context + `useImmerReducer` (no Redux/Zustand). localStorage persistence (no backend). Engine in `src/engine/**` is pure TypeScript with no React imports (ESLint-enforced).

## Quickstart

```bash
nvm use            # Node 22
npm install
npm run fetch:data # one-time: fetches Gen-1 data + sprites from PokéAPI
npm run dev        # http://localhost:5173
npm test           # Vitest engine + ui projects
npm run lint       # ESLint, must be zero warnings
npm run typecheck  # tsc --noEmit
npm run build      # production build
```

## Legal Disclaimer

PokeTrail is a non-commercial fan project. Pokémon and all related characters are trademarks of Nintendo / Game Freak / The Pokémon Company. This site is not affiliated with or endorsed by them. No ads, no donations, no microtransactions, ever.
