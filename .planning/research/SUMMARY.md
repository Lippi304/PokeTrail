# Project Research Summary

**Project:** PokeTrail (Pokémon-Roguelike, browser, single-player)
**Domain:** Browser-based turn-based RPG / roguelike (client-only SPA, no backend)
**Researched:** 2026-04-25
**Confidence:** MEDIUM-HIGH (web verification was partially unavailable for live competitor checks and `npm view` version pinning; stack majors and architecture patterns are HIGH; some genre-feature claims and DMCA case-law specifics flagged MEDIUM)

## Executive Summary

PokeTrail ist eine deterministische, rundenbasierte Simulation mit dünner React-UI. Die vier Research-Streams konvergieren auf dieselbe Form: eine **pure TypeScript-Engine** (zero React-Imports, seedable PRNG, Battle-FSM) unter einer **React 19 + Tailwind 4 + Context/useReducer** UI, gefüttert aus **build-time generiertem statischen JSON**, sodass PokéAPI nie auf dem Gameplay-Pfad liegt. Engine/UI-Trennung, Build-Time-Datenfetch und seedable RNG sind non-negotiable Phase-1-Infrastruktur.

Das **größte nicht-technische Risiko ist legal/IP-Exposure**. Der Name "PokeTrail" + PokéAPI's `official-artwork` Sprites (direkte Kopien von TPCi's Sugimori-Art) bilden genau das Muster, das historisch Nintendo-DMCA-Enforcement gegen Fan-Games getriggert hat. Das muss vor jedem öffentlichen Deployment gelöst werden. Außerdem fehlen in der "Active"-Liste mehrere Table-Stakes-Mechaniken (Critical Hits, Accuracy Rolls, Heal-Nodes, Move-Learning bei Level-Up, Stat-Stages).

## Decisions Required Before Roadmap

| # | Decision | Why It Blocks | Recommended Default |
|---|----------|---------------|---------------------|
| 1 | **Branding + Sprite-Asset-Strategie** (legal/IP) | "PokeTrail" + official-artwork = textbook DMCA-Trigger | Rename auf nicht-Pokémon-Brand (z.B. "MonsterTrail", "Kanto Climb"); pixel sprites NOT official-artwork; self-hosted in `public/sprites/`; no monetization; Disclaimer auf Title Screen |
| 2 | **React 18 vs 19.2** | 19.2 ist current; 18 ist maintenance-only | **React 19.2** |
| 3 | **Immer + Zod ab Tag 1?** | Nested State wird sonst unmanageable; Zod ist einzige Defense gegen stale-save crashes | **Yes, both, Phase 1** |
| 4 | **Tailwind v3 vs v4** | v4 ist current mit eigenem Vite-Plugin | **Tailwind v4.2** mit `@tailwindcss/vite` |
| 5 | **Type-Chart-Era + Move-Category-Split** | Gen-1 hat 5 historische Bugs; Spec mixed bereits Eras (`spAttack`/`spDefense`) | **Modern Chart minus Steel/Dark/Fairy** + **modern per-move physical/special split**, programmatisch aus PokéAPI generiert |
| 6 | **Branching Route Paths in v1?** | Stärkster Differenzator vs pokelike.xyz | **Defer auf v1.x**, aber `routeGenerator` von Phase 2 als Graph-Shape (nodes + edges) bauen |
| 7 | **Sub-Decisions** | Critical-Hit-Formula, Accuracy-Floor, localStorage-Layout, Heal-Nodes, Move-Learn, Stat-Stages | Crit modern flat ~1/24; Accuracy floor 70%; drei separate localStorage keys; Heal-Nodes ja; Move-Learn ja; Stat-Stages -6/+6 ja |

## Key Findings

### Recommended Stack — see [STACK.md](./STACK.md)

- **Vite 6** + **React 19.2** + **TypeScript 5.7+** (`strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`)
- **Tailwind CSS v4.2** via `@tailwindcss/vite`
- **React Context + useReducer + Immer + use-immer**
- **Zod 3.x** für localStorage- + Build-Time-PokéAPI-Validation
- **Motion** (formerly framer-motion) — defer install auf Phase 4
- **Vitest 2** + `@testing-library/react@16` + `jsdom`
- **vite-plugin-pwa** in Phase 4
- **No router** — discriminated-union `screen` field

**Explicitly not used:** Redux/Zustand/Jotai, react-router, lodash/axios/moment, Storybook, framer-motion (renamed).

### Expected Features — see [FEATURES.md](./FEATURES.md)

**Table-Stakes-Lücken in Spec (müssen Phase 1-3 ergänzen):**
- **Critical Hits** (Phase 1)
- **Move Accuracy / Miss Rolls** (Phase 1)
- **Heal Nodes / Pokémon Center zwischen Routen** (Phase 2)
- **Move Learning Prompt bei Level-Up** (Phase 2 oder 3)
- **Stat Stages -6/+6** (Phase 3) — ohne sie haben X-Items in Spec nichts zu tun

**Differenzatoren in Spec (schützen):** Clean Apple-inspirierte Dark UI, sub-45-min Runs, 1-of-3 + skip Reward Screen, sichtbare Run-Map, Engine/UI-Trennung, persistent Pokédex, EN names only, PWA, statisches Daten-Bundle, Hall of Fame.

### Architecture — see [ARCHITECTURE.md](./ARCHITECTURE.md)

Drei Architektur-Regeln dominieren alles:
1. **Engine ist pure** — `(state, action, rng) → newState`, no React, no `Date.now()`, no `Math.random()`
2. **Battle ist 9-Phase Finite State Machine** mit Transition-Tabelle: `selecting → resolving → animatingPlayer → animatingEnemy → turnEnd → faintCheck → forceSwitch → enemyFaintReward → battleOver`
3. **RNG ist seedable + persisted** — mulberry32 PRNG, Seed + Counter im Save → reproduzierbare Bug-Reports, deterministische Tests, Daily-Challenge-Path

**Layers:** Presentation (`components/`) → Orchestration (`context/`) → Engine (`src/engine/`) → Data (`src/data/` + `utils/storage.ts`).

**ESLint `no-restricted-imports`** blockiert `react`/`react-dom` in `src/engine/**` — One-Line-Garantie für Engine-Purity.

**Versioned Save Schema** mit `SaveV1 | SaveV2 | ...` Union, Forward-Migration-Chain. UI-State NICHT persistiert. Battles werden NICHT mid-turn resumed.

**Build Order:** Steps 1-8 (Types → RNG → typeChart → damage → battleMachine → levelUp/AI → routeGenerator → Persistence → Reducer + Static Data) shippen ohne Rendering. Spiel ist via Reducer komplett unit-testbar bevor erste HP-Bar gezeichnet wird.

### Critical Pitfalls — see [PITFALLS.md](./PITFALLS.md)

1. **Nintendo DMCA Takedown** (existential, Phase 1) — Rename, Pixel-Sprites, self-hosted, no monetization, Disclaimer
2. **Damage-Formula-Bugs** (high, Phase 1) — Vitest Golden-Tests mit ~20 Smogon-Matchups
3. **Type-Chart-Errors** (high, Phase 1) — programmatisch aus PokéAPI `damage_relations` build-time
4. **Save-Korruption + Migration-Breakage** (high, Phase 1) — Versioning ab Tag 1 mit Zod
5. **Sprite-Hotlinking + PokéAPI Rate-Limits** (medium-high, Phase 1) — Build-Script lädt alle 151 Sprites in `public/sprites/`
6. **React Re-Render-Storms während Battle-Animationen** (medium, Phase 1) — Split Context + CSS-Transitions statt React-State
7. **Accessibility deferred auf Phase 4** (medium, **muss Phase 1 starten**) — Type-Badges mit TEXT-Label, Focus-Rings, 1-4 Keys, `aria-live`
8. **Mobile-UX-Baseline** (medium, Phase 1 baseline + Phase 4 polish) — 44×44px Tap-Targets, `100dvh`
9. **localStorage Quota** (medium, Phase 1) — try/catch auf jedem `setItem`
10. **Balance + Slot-Machine RNG** (medium, Phase 2/3) — Encounter-Weighting-Tiers, Accuracy-Floor 70%

## Implications for Roadmap

Spec's 4-Phasen-Struktur hält, **aber mehrere "Polish"-Items müssen in Phase 1** (a11y, mobile baseline, sprite hosting, save versioning).

### Phase 0 (Pre-Roadmap): Decisions Lock
6 cross-cutting Decisions blocken cleanen Roadmap. In `/gsd-discuss-phase 1` lösen.

### Phase 1: Foundation + First Battle (HEAVY)
- Vite 6 + React 19.2 + TS 5.7 strict + Tailwind v4.2 + Vercel Deploy mit Disclaimer
- ESLint flat config + `no-restricted-imports` für Engine
- `engine/rng.ts` (mulberry32, seedable)
- `engine/typeChart.ts` build-time aus PokéAPI + Vitest matchup tests
- `engine/damage.ts` mit 20-Case Smogon-Golden-Table inkl. **Crits + Accuracy**
- `engine/battleMachine.ts` 9-Phase FSM + `isLegal(phase, action)` Guard
- `utils/storage.ts` versioned Save mit Zod + try/catch + "Reset save"
- Build-time fetch script mit Zod-Validation, Output committed
- Self-hosted Pixel-Sprites in `public/sprites/`
- Title Screen mit Legal-Disclaimer + entschiedenes Branding
- Starter-Selection, 1v1 Battle Screen vs Wild Pokémon
- HP-Bars (CSS Transitions), typ-farbige Move-Buttons + PP, Battle-Log capped 8
- Basic Enemy AI (random)
- **A11y baseline:** Text-Label auf Type-Badges, Focus-Rings, 1-4 Key Support, `aria-live`
- **Mobile baseline:** `min-h-[44px]`, `touch-action: manipulation`, `100dvh`
- Split Context: `RunContext` (slow) + `BattleContext` (fast)

### Phase 2: Run Loop
- Seeded Route-Generator → `RouteNode[]` mit Node-Type-Union (Encounter | Item | **Heal** | Arena), graph-shape ready
- Route-Map UI mit Progress
- Catching post-victory, Team max 6 mit Replace-Flow
- Team View, XP + Level-Up, **Move-Learning Prompt**, Evolution mit Decline
- Item-System (Heal/Status/Battle/Held), **Stat-Stages -6/+6 framework**
- Reward Screen (1-of-3 + skip), Bag View, Bag max 10
- **Skip-encounter (Flee)** Button
- Erste Arena (Brock — Rock), Badge-Anzeige
- **Run-Seed Display** in Settings/Debug
- Save-Schema bump auf v2 mit Migration-Test

### Phase 3: Full Game
- Alle 8 Arenen mit kuratierten Leader-Teams
- Top 4 + Champion (kein Heilen zwischen)
- Difficulty-Curve / Level-Scaling
- 5 Status-Effekte + **Confusion** — full Status × Event Matrix tested
- Held-Items active effects (end-of-turn hooks via FSM `turnEnd`)
- Verbesserte AI (Type-Advantage, sinnvolle Switches)
- Game-Over + Run-Stats, Victory + Hall of Fame (10 Entries FIFO)
- Auto-Save: debounced, nur auf Phase-Boundaries, nie mid-Animation
- Playtest-Pass mit 5 Personen

### Phase 4: Polish (Audit-Pass, nicht Implementation)
- Persistent Pokédex (separater localStorage-Key)
- Battle-Animationen (Motion install hier)
- Screen-Transitions via `<AnimatePresence>`
- Settings (Animationen on/off, Speed)
- Title Screen subtler animierter Hintergrund
- Mobile **Audit** auf realem iOS Safari + Android Chrome
- A11y **Audit** mit axe-core / Lighthouse target ≥ 90
- PWA via vite-plugin-pwa (Manifest, SW, Sprite-CacheFirst 30-day)
- Color-Blindness Simulator Pass

### Research Flags
- **Phase 1:** mulberry32 + Zod 3 vs 4 + `npm view` für Version-Pins + Smogon Reference Data + PokéAPI Sprite-URL Schema
- **Phase 3:** Status-Effect-Interaction-Matrix + Gym-Leader-Team-Composition
- **Phase 4:** vite-plugin-pwa Workbox precache patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | React 19.2 + Tailwind v4.2 verifiziert; Patches via `npm view` zu pinnen |
| Features | MEDIUM | Mainline-Mechaniken HIGH; Comparator-Claims MEDIUM (30 min Playtest pokelike.xyz + PokéRogue empfohlen) |
| Architecture | HIGH | Engine/UI-Split, FSM, mulberry32, versioned Save sind conventional Patterns |
| Pitfalls | MEDIUM-HIGH | Domain-Knowledge HIGH; DMCA-Specifics MEDIUM (recent 2025-2026 Cases zu verifizieren) |

## Open Questions to Drive `/gsd-discuss-phase 1`

1. **Branding:** Renamen wir "PokeTrail"? Wenn ja, worauf? Was steht im Legal-Disclaimer?
2. **Sprites:** Pixel oder Official-Artwork? Self-hosted oder hotlinked?
3. **React 18 vs 19.2:** Push auf 19.2 bestätigen?
4. **Immer + Zod:** In Phase 1 adoptieren?
5. **Type-Chart:** Modern minus Steel/Dark/Fairy, build-time aus PokéAPI?
6. **Move-Category-Split:** Modern per-move physical/special?
7. **Critical-Hit-Formula:** Modern flat ~1/24?
8. **Catch-Mechanic:** Guaranteed bei Sieg oder Roll?
9. **localStorage-Layout:** Single atomic Key oder drei separate (save/pokedex/settings)?
10. **A11y + Mobile Baseline:** Move in Phase 1?
11. **Route-Generator Graph-Shape:** Phase 2 Generator output graph-ready?
12. **Vercel Deploy:** Day-1 Stub-Deploy mit Disclaimer — Vercel Project Name?

## Sources

### Primary (HIGH confidence)
- `react.dev/blog` — React 19.2 release notes
- `tailwindcss.com/blog` — Tailwind v4.0 GA + v4.2 release notes
- `/Users/lippi304/Documents/PokeTrail/poketrail.md` — Original Spec
- `/Users/lippi304/Documents/PokeTrail/.planning/PROJECT.md` — Active feature list
- Bulbapedia — Gen 1 mechanics, type chart, damage formula
- Smogon — Damage Calculator als Golden Reference
- PokéAPI — Fair Use Policy, sprite URL schema
- React official docs, mulberry32 (Tommy Ettinger, public domain)
- WCAG 2.1, MDN Web Storage API

### Secondary (MEDIUM confidence)
- pokelike.xyz, PokéRogue, Pokémon Infinite Fusion (Training Data; Live-Playtest empfohlen)
- Slay the Spire roguelike-deckbuilder vocabulary
- DMCA / Fan-Game Enforcement History (Pokémon Uranium, Prism, Brick Bronze)
- React Patterns + Save-Versioning Patterns
- Vite 6, Vitest 2, Zod 3, Immer 10, Motion rename, vite-plugin-pwa

### Tertiary (LOW confidence — needs validation)
- 2025-2026 Nintendo DMCA-Enforcement-Cases
- PokéAPI Sprite-URL-Schema Currency
- Vercel Quota / DMCA-Response-Policy
- `motion` vs `framer-motion` npm Package State

---
*Research completed: 2026-04-25*
*Ready for roadmap: ja — Phase 0 Decisions in `/gsd-discuss-phase 1` lösen*
