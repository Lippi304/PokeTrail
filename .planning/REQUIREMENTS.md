# PokeTrail — v1 Requirements

**Version:** v1.0
**Last updated:** 2026-04-25
**Status:** Defined, ready for roadmap

---

## v1 Requirements

REQ-IDs follow `[CATEGORY]-[NUMBER]` format. Each requirement is testable, user-centric, and atomic.

### FOUNDATION — Setup, Toolchain, Deployment

- [x] **FOUND-01**: Project boots locally via `npm run dev` with Vite 6 + React 19.2 + TypeScript 5.7 strict mode
- [x] **FOUND-02**: Tailwind CSS v4.2 is wired via `@tailwindcss/vite`, dark theme is the default with the spec's color palette
- [x] **FOUND-03**: TypeScript config enforces `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, no `any` allowed
- [x] **FOUND-04**: Vitest 2 + `@testing-library/react@16` + `jsdom` are configured and `npm test` runs the suite
- [x] **FOUND-05**: ESLint flat config blocks `react`/`react-dom` imports under `src/engine/**` (`no-restricted-imports`)
- [ ] **FOUND-06**: Vercel deployment is live from day 1 with auto-deploy on push to main and a legal disclaimer on the title screen
- [x] **FOUND-07**: Repo has README, `.gitignore`, `.editorconfig`, and Prettier config

### DATA — Pokémon Data Pipeline

- [ ] **DATA-01**: Build-time fetch script (`tsx scripts/fetch-pokemon-gen1.ts`) downloads all 151 Gen-1 Pokémon from PokéAPI, validates with Zod, and writes `src/data/pokemon-gen1.json`
- [ ] **DATA-02**: Build-time script downloads all referenced moves and writes `src/data/moves-gen1.json` with Zod validation
- [ ] **DATA-03**: Build-time script downloads all 18 type matchups from PokéAPI `damage_relations` and writes `src/data/typeChart.json` (no hand-typed cells)
- [ ] **DATA-04**: All 151 Gen-1 pixel sprites are downloaded into `public/sprites/` and committed (no PokéAPI hotlinking at runtime)
- [ ] **DATA-05**: All static JSON files are validated with Zod schemas at module-init time so any drift fails loud

### ENGINE — Pure TypeScript Game Engine (no React)

- [ ] **ENG-01**: `engine/rng.ts` exports a seedable mulberry32 PRNG with a counter; the engine never uses `Math.random()` or `Date.now()`
- [ ] **ENG-02**: `engine/typeChart.ts` resolves single- and dual-type matchups (modern chart minus Steel/Dark/Fairy types since no Gen-1 Pokémon have those types)
- [ ] **ENG-03**: `engine/damage.ts` implements the standard damage formula with STAB (×1.5), type effectiveness, modern flat ~1/24 critical hit (×1.5), and a min-damage-1 floor
- [ ] **ENG-04**: `engine/damage.ts` is covered by a Vitest golden table of ≥20 known matchups derived from Smogon damage calc
- [ ] **ENG-05**: Move accuracy rolls happen via the seedable RNG with a 70% floor on any move
- [ ] **ENG-06**: `engine/battleMachine.ts` implements a 9-phase finite state machine: `selecting → resolving → animatingPlayer → animatingEnemy → turnEnd → faintCheck → forceSwitch → enemyFaintReward → battleOver` with an `isLegal(phase, action)` guard
- [ ] **ENG-07**: `engine/levelUp.ts` handles XP gain, level-up stat increases, and evolution at the species's evolve level (player can decline)
- [ ] **ENG-08**: `engine/itemEffects.ts` implements heal items, status cures, X-stat boosters (using the stat-stage system), and held-item end-of-turn hooks
- [ ] **ENG-09**: `engine/ai.ts` initially selects random legal moves; later upgraded to prioritize type advantage and switch on bad matchups
- [ ] **ENG-10**: `engine/routeGenerator.ts` produces a graph-shape `RouteNode[]` (Encounter | Item | Heal | Arena) seeded from the run RNG; v1 UI renders linearly but the generator is graph-ready
- [ ] **ENG-11**: `engine/statStages.ts` implements -6/+6 stat stages used by X-Items and status moves

### PERSISTENCE — localStorage Save System

- [ ] **PERS-01**: `utils/storage.ts` writes three separate versioned localStorage keys: `poketrail.save`, `poketrail.pokedex`, `poketrail.settings`
- [ ] **PERS-02**: Every persisted blob has a `version` field and a forward-migration chain (`SaveV1 → SaveV2 → ...`)
- [ ] **PERS-03**: All saves are validated with Zod schemas on load; invalid saves fall back to defaults instead of crashing
- [ ] **PERS-04**: All `setItem` calls are wrapped in try/catch to handle quota exhaustion gracefully
- [ ] **PERS-05**: Settings exposes a "Reset save" button that clears the run save without touching Pokédex/settings
- [ ] **PERS-06**: Auto-save fires only on phase boundaries (post-battle, post-encounter, post-arena), never mid-animation, never mid-battle turn
- [ ] **PERS-07**: Closing the tab mid-battle restarts the encounter on resume (battles are not resumed mid-turn)

### STATE — React State Management

- [ ] **STATE-01**: Game state lives in React Context + `useImmerReducer` (Immer + use-immer) — no Redux, no Zustand
- [ ] **STATE-02**: Context is split into `RunContext` (slow-changing run state) and `BattleContext` (fast-changing battle state) to prevent re-render storms
- [ ] **STATE-03**: All state shapes are typed with no `any` (`GameState`, `RunState`, `BattleState`, etc.)

### UI — Title, Starter, Settings, Pokédex

- [ ] **UI-01**: Title Screen shows "PokeTrail" logo, "New Run" button, "Continue Run" button (when save exists), Pokédex/Settings links, and a legal disclaimer footer
- [ ] **UI-02**: Title Screen has a subtle animated background (particles or pokéball pattern)
- [ ] **UI-03**: Starter Selection shows 3 cards (Bulbasaur, Charmander, Squirtle) at level 5 with sprite/name/type/base stats; Confirm button enables after selection
- [ ] **UI-04**: Settings screen offers: animations on/off, battle speed (slow/normal/fast), text speed, "Reset save" button, run-seed display (debug)
- [ ] **UI-05**: Pokédex screen shows a grid of all 151 Gen-1 Pokémon: silhouette = seen, full sprite = caught; filterable by type and status (seen / caught / unknown)
- [ ] **UI-06**: Pokédex state persists across runs in `poketrail.pokedex` localStorage key

### BATTLE — Battle Screen UI

- [ ] **BATT-01**: Battle screen shows enemy Pokémon top (sprite, HP bar, name, level, status badge) and own Pokémon bottom (same)
- [ ] **BATT-02**: Action bar shows 4 move buttons with type colors and PP counter; disabled if PP=0
- [ ] **BATT-03**: Side buttons offer "Switch Pokémon" and "Bag" actions (legal-action-gated by FSM phase)
- [ ] **BATT-04**: Battle log shows scrollable text with the last 8 messages visible
- [ ] **BATT-05**: HP-bar transitions are CSS-animated (not React-state-driven) and color-shift green → amber → red with HP %
- [ ] **BATT-06**: "Shake" animation plays on hit; "fade" plays on faint
- [ ] **BATT-07**: Damage display shows the type-effectiveness multiplier as text ("It's super effective!", "Not very effective…", "It had no effect.")
- [ ] **BATT-08**: Critical hits are surfaced as text in the battle log ("A critical hit!")
- [ ] **BATT-09**: Move misses are surfaced as text ("X's attack missed!")

### RUN — Run Loop and Route Map

- [ ] **RUN-01**: Route Map UI shows current run's nodes (Encounter / Item / Heal / Arena) with current position highlighted; past nodes are dimmed, future nodes are visible
- [ ] **RUN-02**: Player can advance to the next node by clicking it (only the next legal node is clickable)
- [ ] **RUN-03**: Encounter nodes spawn a wild Pokémon; player fights, then either catches (free if won) or skips
- [ ] **RUN-04**: Heal/Center nodes restore all team Pokémon to full HP and clear status
- [ ] **RUN-05**: Item nodes show 3 random items (1 of 3 + skip)
- [ ] **RUN-06**: Arena nodes spawn a fixed Gym Leader battle with a curated team
- [ ] **RUN-07**: Player can flee a wild encounter (skip without rewards); cannot flee Gym/Elite Four/Champion battles
- [ ] **RUN-08**: A run targets 30–45 minutes from start to Champion

### TEAM — Team Management

- [ ] **TEAM-01**: Player team is capped at 6 Pokémon
- [ ] **TEAM-02**: After a victory, player can catch the defeated wild Pokémon (one-click confirm)
- [ ] **TEAM-03**: When team is full and player wants to catch, a Replace flow asks which team member to release (two-step confirm)
- [ ] **TEAM-04**: Team View shows all 6 slots with sprite/name/level/HP-bar/type-badges/held-item; tap opens detail with stats/moves/XP-to-next-level
- [ ] **TEAM-05**: Player can switch active Pokémon during battle (counts as a turn) or out-of-battle (free)
- [ ] **TEAM-06**: A Pokémon at 0 HP is marked "fainted" in Team View and cannot be sent into battle until healed
- [ ] **TEAM-07**: When the active Pokémon faints, player is forced to switch to a non-fainted team member (forceSwitch FSM phase)
- [ ] **TEAM-08**: When all team Pokémon faint, the run ends in Game Over

### LEVEL — XP, Leveling, Evolution

- [ ] **LEVEL-01**: Pokémon gain XP after winning a battle, calculated from level differential and enemy base stats
- [ ] **LEVEL-02**: Level-ups raise stats according to base-stat formula
- [ ] **LEVEL-03**: When a Pokémon learns a new move at level-up, player gets a "forget a move?" prompt with the 4 current moves + the new move
- [ ] **LEVEL-04**: Pokémon evolve at their evolve-level threshold (e.g., Charmander → Charmeleon at 16); player can decline
- [ ] **LEVEL-05**: Encounter level scales with run progress (Route 1: Lv 3-7; Arena 8: Lv 45-50)

### ITEM — Inventory and Item Effects

- [ ] **ITEM-01**: Bag holds at most 10 items; full bag prevents picking up new items (skip is always allowed)
- [ ] **ITEM-02**: Heal items: Potion (+20 HP), Super Potion (+50 HP), Hyper Potion (full restore)
- [ ] **ITEM-03**: Status items: Antidote (cure poison), Paralyze Heal, Burn Heal, Awakening, Ice Heal, Full Heal (cure all)
- [ ] **ITEM-04**: Battle items: X-Attack, X-Defense, X-Speed, X-Special (apply +1 stat stage to active Pokémon)
- [ ] **ITEM-05**: Held items: Leftovers (heal 1/16 max HP per turn), Scope Lens (+1 crit stage), Quick Claw (chance to move first)
- [ ] **ITEM-06**: Using a battle item costs the player's turn
- [ ] **ITEM-07**: Reward Screen after eligible nodes shows 3 random items; player picks 1 or skips

### REWARD — Post-Battle and Post-Route Rewards

- [ ] **REW-01**: After defeating a wild Pokémon, Reward Screen shows the Pokémon card with "Catch?" / "Skip" buttons
- [ ] **REW-02**: After certain nodes, Reward Screen shows 3 item cards; player picks 1 or skips
- [ ] **REW-03**: After defeating a Gym Leader, player receives the corresponding Badge plus a guaranteed rare item or Pokémon-choice
- [ ] **REW-04**: Card animations use slide-in or fade transitions (no jarring snaps)

### COMBAT-STATUS — Status Effects

- [ ] **STATUS-01**: Burn applies -50% Attack and 1/16 max-HP damage at end of turn
- [ ] **STATUS-02**: Paralyze applies -50% Speed and 25% chance to skip the turn
- [ ] **STATUS-03**: Poison deals 1/8 max-HP damage at end of turn
- [ ] **STATUS-04**: Sleep prevents action for 1-3 turns (RNG-rolled at sleep onset)
- [ ] **STATUS-05**: Freeze prevents action with 20% per-turn thaw chance
- [ ] **STATUS-06**: Confusion: 33% chance per turn to hit self for typeless damage (added beyond original spec)
- [ ] **STATUS-07**: Status-inflicting moves only apply status if the target doesn't already have one
- [ ] **STATUS-08**: Status persists across switch-out for major status conditions (burn/paralyze/poison/sleep/freeze)

### ARENA — Gym Leaders, Elite Four, Champion

- [ ] **ARENA-01**: All 8 Gym Leaders are implemented in the Kanto order: Brock (Rock), Misty (Water), Lt. Surge (Electric), Erika (Grass), Koga (Poison), Sabrina (Psychic), Blaine (Fire), Giselle/Giovanni (Ground)
- [ ] **ARENA-02**: Each Gym Leader has 2-4 Pokémon scaled to current run progress; their Pokémon use higher stat caps than wild
- [ ] **ARENA-03**: Each Gym victory awards a Badge that's displayed in the run header
- [ ] **ARENA-04**: After all 8 Badges, Elite Four sequence triggers: 4 trainers back-to-back with no heal between battles (items only)
- [ ] **ARENA-05**: Each Elite Four trainer has 4-6 Pokémon
- [ ] **ARENA-06**: Champion is the 5th and final battle with a mixed strong team
- [ ] **ARENA-07**: Losing any Elite Four / Champion battle ends the run (Game Over)

### AI — Enemy Decision-Making

- [ ] **AI-01**: Wild Pokémon AI selects a random legal move
- [ ] **AI-02**: Gym Leader / Elite Four AI prioritizes super-effective moves when available
- [ ] **AI-03**: Gym Leader / Elite Four AI switches Pokémon when the matchup is severely disadvantaged (≤0.5× incoming or 2× outgoing)

### END — Game Over and Victory

- [ ] **END-01**: Game Over screen shows the run summary (badges earned, Pokémon caught, levels reached, time elapsed)
- [ ] **END-02**: Game Over screen has "Try Again" button that returns to Title Screen
- [ ] **END-03**: Victory screen plays a Champion celebration with team aufstellung, run-stats, and "Play Again" button
- [ ] **END-04**: Victory adds the run to a local Hall of Fame (max 10 entries, FIFO eviction)

### A11Y — Accessibility (baseline in Phase 1)

- [ ] **A11Y-01**: Type badges always include the type's text label, not just the color (color-blind support)
- [ ] **A11Y-02**: All interactive elements have visible focus rings (keyboard navigation)
- [ ] **A11Y-03**: Number keys 1-4 trigger the corresponding move buttons in battle
- [ ] **A11Y-04**: Battle log uses `aria-live="polite"` so screen readers announce new messages
- [ ] **A11Y-05**: Lighthouse Accessibility audit scores ≥ 90 (Phase 4 audit)

### MOBILE — Mobile-Friendly Baseline

- [ ] **MOBILE-01**: All interactive elements have a minimum tap target size of 44×44px
- [ ] **MOBILE-02**: Layout uses `100dvh` units (not `100vh`) and `viewport-fit=cover` for safe-area handling
- [ ] **MOBILE-03**: Touch interactions use `touch-action: manipulation` to suppress double-tap zoom
- [ ] **MOBILE-04**: Battle screen renders correctly on iOS Safari and Android Chrome at 375px width (Phase 4 audit)

### POLISH — Animations, Transitions, PWA

- [ ] **POLISH-01**: Screen transitions use `<AnimatePresence>` from Motion (slide or fade between Title/Starter/Battle/Reward/etc.)
- [ ] **POLISH-02**: Battle animations include shake on hit, fade on faint, and smooth HP-bar transition
- [ ] **POLISH-03**: PWA manifest is generated by `vite-plugin-pwa`; the app is installable from Chrome/Safari
- [ ] **POLISH-04**: Service worker uses CacheFirst with 30-day expiry for `public/sprites/*` so the app works offline once loaded

---

## v2 Requirements (Deferred)

These are recognized table-stakes or natural next steps but explicitly deferred from v1.

- Branching route paths (graph-shape generator already in v1, but UI rendering is Phase 2.x)
- Nuzlocke mode (permadeath, nickname mandate, friedhof-view)
- Gen 2+ Pokémon (Johto and beyond)
- Cloud save with Supabase auth (currently localStorage only)
- Daily Challenge (seeded run shared globally — RNG infrastructure already supports this)
- Sound effects and music (Howler.js or Tone.js)
- Achievements system
- Custom sprites / fan-art integration
- Move-tutor or TM/HM system
- Held-item upgrades or evolution-by-trade workarounds (Gen-1 trade evolutions)

## Out of Scope

Boundaries set during questioning and research:

- **Multilanguage / i18n** — v1 is English only (Bulbasaur, not Bisasam); no toggle, no infrastructure
- **Light Mode toggle** — Dark mode is the deliberate aesthetic, not a setting
- **Multiplayer / PvP** — single-player only, no WebSocket
- **Backend / auth / user accounts** — fully client-side, no server
- **Runtime PokéAPI fetching for gameplay** — eliminated by build-time JSON pipeline (latency + IP risk)
- **Official artwork sprites** — pixel sprites used instead (lower IP profile)
- **Rebrand to non-Pokémon name** — explicitly kept "PokeTrail" with legal disclaimer (user accepted DMCA risk)
- **Pokéball-roll catch mechanic** — guaranteed catch on victory chosen for simpler reward loop
- **Gen-1 quirks** (e.g., speed-based crits, Gen-1 type chart with Ghost-vs-Psychic immunity bug, Gen-1 special split) — modern mechanics chosen for clarity and balance
- **Storybook, react-router, Redux/Zustand/Jotai, lodash/axios/moment, framer-motion** — explicitly not in stack

---

## Traceability

Each requirement is mapped to exactly one phase by the roadmapper.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| FOUND-06 | Phase 1 | Pending |
| FOUND-07 | Phase 1 | Complete |
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| DATA-05 | Phase 1 | Pending |
| ENG-01 | Phase 1 | Pending |
| ENG-02 | Phase 1 | Pending |
| ENG-03 | Phase 1 | Pending |
| ENG-04 | Phase 1 | Pending |
| ENG-05 | Phase 1 | Pending |
| ENG-06 | Phase 2 | Pending |
| ENG-07 | Phase 4 | Pending |
| ENG-08 | Phase 6 | Pending |
| ENG-09 | Phase 2 | Pending |
| ENG-10 | Phase 5 | Pending |
| ENG-11 | Phase 6 | Pending |
| PERS-01 | Phase 3 | Pending |
| PERS-02 | Phase 3 | Pending |
| PERS-03 | Phase 3 | Pending |
| PERS-04 | Phase 3 | Pending |
| PERS-05 | Phase 3 | Pending |
| PERS-06 | Phase 3 | Pending |
| PERS-07 | Phase 3 | Pending |
| STATE-01 | Phase 3 | Pending |
| STATE-02 | Phase 3 | Pending |
| STATE-03 | Phase 3 | Pending |
| UI-01 | Phase 3 | Pending |
| UI-02 | Phase 3 | Pending |
| UI-03 | Phase 3 | Pending |
| UI-04 | Phase 3 | Pending |
| UI-05 | Phase 10 | Pending |
| UI-06 | Phase 10 | Pending |
| BATT-01 | Phase 4 | Pending |
| BATT-02 | Phase 4 | Pending |
| BATT-03 | Phase 4 | Pending |
| BATT-04 | Phase 4 | Pending |
| BATT-05 | Phase 4 | Pending |
| BATT-06 | Phase 4 | Pending |
| BATT-07 | Phase 4 | Pending |
| BATT-08 | Phase 4 | Pending |
| BATT-09 | Phase 4 | Pending |
| RUN-01 | Phase 5 | Pending |
| RUN-02 | Phase 5 | Pending |
| RUN-03 | Phase 5 | Pending |
| RUN-04 | Phase 5 | Pending |
| RUN-05 | Phase 5 | Pending |
| RUN-06 | Phase 5 | Pending |
| RUN-07 | Phase 5 | Pending |
| RUN-08 | Phase 5 | Pending |
| TEAM-01 | Phase 5 | Pending |
| TEAM-02 | Phase 5 | Pending |
| TEAM-03 | Phase 5 | Pending |
| TEAM-04 | Phase 5 | Pending |
| TEAM-05 | Phase 5 | Pending |
| TEAM-06 | Phase 5 | Pending |
| TEAM-07 | Phase 5 | Pending |
| TEAM-08 | Phase 5 | Pending |
| LEVEL-01 | Phase 4 | Pending |
| LEVEL-02 | Phase 4 | Pending |
| LEVEL-03 | Phase 5 | Pending |
| LEVEL-04 | Phase 5 | Pending |
| LEVEL-05 | Phase 5 | Pending |
| ITEM-01 | Phase 6 | Pending |
| ITEM-02 | Phase 6 | Pending |
| ITEM-03 | Phase 6 | Pending |
| ITEM-04 | Phase 6 | Pending |
| ITEM-05 | Phase 8 | Pending |
| ITEM-06 | Phase 6 | Pending |
| ITEM-07 | Phase 6 | Pending |
| REW-01 | Phase 6 | Pending |
| REW-02 | Phase 6 | Pending |
| REW-03 | Phase 6 | Pending |
| REW-04 | Phase 6 | Pending |
| STATUS-01 | Phase 8 | Pending |
| STATUS-02 | Phase 8 | Pending |
| STATUS-03 | Phase 8 | Pending |
| STATUS-04 | Phase 8 | Pending |
| STATUS-05 | Phase 8 | Pending |
| STATUS-06 | Phase 8 | Pending |
| STATUS-07 | Phase 8 | Pending |
| STATUS-08 | Phase 8 | Pending |
| ARENA-01 | Phase 9 | Pending |
| ARENA-02 | Phase 7 | Pending |
| ARENA-03 | Phase 7 | Pending |
| ARENA-04 | Phase 9 | Pending |
| ARENA-05 | Phase 9 | Pending |
| ARENA-06 | Phase 9 | Pending |
| ARENA-07 | Phase 9 | Pending |
| AI-01 | Phase 2 | Pending |
| AI-02 | Phase 8 | Pending |
| AI-03 | Phase 8 | Pending |
| END-01 | Phase 9 | Pending |
| END-02 | Phase 9 | Pending |
| END-03 | Phase 9 | Pending |
| END-04 | Phase 9 | Pending |
| A11Y-01 | Phase 1 | Pending |
| A11Y-02 | Phase 1 | Pending |
| A11Y-03 | Phase 1 | Pending |
| A11Y-04 | Phase 1 | Pending |
| A11Y-05 | Phase 11 | Pending |
| MOBILE-01 | Phase 1 | Pending |
| MOBILE-02 | Phase 1 | Pending |
| MOBILE-03 | Phase 1 | Pending |
| MOBILE-04 | Phase 11 | Pending |
| POLISH-01 | Phase 10 | Pending |
| POLISH-02 | Phase 10 | Pending |
| POLISH-03 | Phase 11 | Pending |
| POLISH-04 | Phase 11 | Pending |

**Coverage:** 115/115 v1 requirements mapped to exactly one phase.
