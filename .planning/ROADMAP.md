# Roadmap: PokeTrail

## Overview

Ein vollständiger Pokémon-Roguelike-Run von Title Screen bis Champion in unter 45 Minuten — gebaut in 11 sauberen Phasen. Phase 1 ist bewusst heavy (Foundation, Toolchain, Engine-Core, A11y/Mobile-Baseline) weil "expensive to retrofit"-Items unten in der Architektur leben. Phasen 2–4 bringen die erste spielbare 1v1-Schleife (Engine FSM → Persistence/State/Title/Starter → Battle UI). Phasen 5–7 öffnen den Run-Loop (Route Generator, Team-Management, Items, erste Arena gegen Brock). Phasen 8–9 vertiefen das System (Status, Held Items, smarte AI) und schließen das Spiel ab (alle 8 Arenen, Top 4, Champion, Endscreens). Phasen 10–11 sind reine Polish-Audits: Pokédex + Animationen, dann PWA und finaler A11y/Mobile-Pass mit Lighthouse + realen Geräten.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation, Toolchain, Engine Core** - Project boots, deploys to Vercel, has pure engine fundamentals (RNG, typeChart, damage formula, golden tests) plus a11y/mobile baseline
- [ ] **Phase 2: Battle Engine FSM** - 9-phase finite state machine with stat stages and random wild AI exists and is unit-tested headlessly
- [ ] **Phase 3: Persistence + State + Title/Starter UI** - Game has a Title Screen, Starter Selection, Settings, and a versioned localStorage save with Zod migrations
- [ ] **Phase 4: First Battle UI (1v1 vs Wild)** - Player can fight a wild Pokémon end-to-end with HP bars, move buttons, battle log, XP gain, level-ups
- [ ] **Phase 5: Run Loop, Route Generator, Team** - Player advances through a generated route (Encounter/Item/Heal/Arena nodes), catches Pokémon, manages a team of 6
- [ ] **Phase 6: Item System, Bag, Reward Screen** - Player picks 1-of-3 items after eligible nodes, uses heal/status/X-items/Pokéballs in battle, manages a bag of 10
- [ ] **Phase 7: First Arena (Brock) + Badges** - Player can fight Brock with his curated Rock team, win, and see a badge in the run header
- [ ] **Phase 8: Status Effects + Held Items + Smart AI** - Burn/Paralyze/Poison/Sleep/Freeze/Confusion work, held items tick, gym AI prioritizes super-effective and switches on bad matchups
- [ ] **Phase 9: Full Arenas, Elite Four, Champion, Endgame** - All 8 arenas plus Top-4-and-Champion run-ender are playable; Game Over and Victory screens with run stats and Hall of Fame
- [ ] **Phase 10: Pokédex + Animations + Screen Transitions** - Persistent Pokédex grid (seen/caught), battle shake/fade/HP-tween, and slide/fade screen transitions
- [ ] **Phase 11: PWA + A11y/Mobile Audits** - App is installable, works offline, scores Lighthouse a11y ≥ 90, and renders correctly on real iOS Safari + Android Chrome at 375px

## Phase Details

### Phase 1: Foundation, Toolchain, Engine Core
**Goal**: Project boots locally and on Vercel, has the pure-TypeScript engine fundamentals (seedable RNG, type chart from PokéAPI, damage formula with crits and accuracy, golden tests), a build-time data pipeline with Zod validation, and an a11y/mobile baseline that the rest of the project will inherit. This phase is intentionally heavy because every researcher independently flagged these items as "expensive to retrofit."
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, ENG-01, ENG-02, ENG-03, ENG-04, ENG-05, A11Y-01, A11Y-02, A11Y-03, A11Y-04, MOBILE-01, MOBILE-02, MOBILE-03
**Success Criteria** (what must be TRUE):
  1. `npm run dev` starts a working Vite app with React 19 + Tailwind v4 dark theme; `npm test` runs Vitest with the engine golden table green
  2. The Vercel deployment URL serves the current main branch with the legal disclaimer visible on the title placeholder
  3. `src/data/pokemon-gen1.json`, `moves-gen1.json`, `typeChart.json` exist and pass Zod validation at module init; all 151 pixel sprites are committed under `public/sprites/`
  4. `engine/damage.ts` produces values matching ≥20 Smogon golden test cases, including crits, type effectiveness, STAB, accuracy floor, and min-damage-1
  5. ESLint blocks any `react`/`react-dom` import inside `src/engine/**` and the rule is enforced in CI
  6. Type badges in the design system always show a TEXT label (not color-only); buttons have visible focus rings, 44×44px tap targets, `touch-action: manipulation`, and the layout uses `100dvh`
**Plans**: TBD
**UI hint**: yes

### Phase 2: Battle Engine FSM
**Goal**: The 9-phase battle finite state machine, the stat-stage system, and the random-wild AI exist as pure TypeScript modules, are independently unit-tested, and can simulate a full 1v1 battle headlessly through the reducer. No React yet — this is the pure-engine layer the UI will plug into in Phase 4.
**Depends on**: Phase 1
**Requirements**: ENG-06, ENG-09, AI-01
**Success Criteria** (what must be TRUE):
  1. `engine/battleMachine.ts` exposes a `BattlePhase` union and an `isLegal(phase, action)` guard covering all 9 phases (`selecting → resolving → animatingPlayer → animatingEnemy → turnEnd → faintCheck → forceSwitch → enemyFaintReward → battleOver`)
  2. A Vitest scenario simulates a full Charmander-vs-Bulbasaur 1v1 battle through the reducer (no React) and ends in `battleOver` with deterministic outcome under a fixed RNG seed
  3. `engine/ai.ts` selects a legal random move via the seedable RNG; given the same seed and state, it picks the same move every time
**Plans**: TBD

### Phase 3: Persistence + State Management + Title/Starter UI
**Goal**: The user can open the app, see the Title Screen with "New Run" / "Continue Run" / Pokédex / Settings, pick a starter, and have all of it backed by the React Context split (RunContext + BattleContext) and three versioned localStorage keys with Zod-validated load and forward migrations. No battle yet — this phase locks down state architecture and the cold-start UX.
**Depends on**: Phase 2
**Requirements**: PERS-01, PERS-02, PERS-03, PERS-04, PERS-05, PERS-06, PERS-07, STATE-01, STATE-02, STATE-03, UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. Title Screen shows "PokeTrail" logo, "New Run", "Continue Run" (only when a save exists), Pokédex/Settings links, and a legal disclaimer footer
  2. Starter Selection shows 3 cards (Bulbasaur, Charmander, Squirtle) at Lv 5 with sprite/name/type/base stats; Confirm enables only after selection and persists the chosen starter to `poketrail.save` v1
  3. Settings exposes animations on/off, battle speed, text speed, "Reset save" (clears run save without touching Pokédex/settings), and run-seed display
  4. Closing and reopening the tab restores the run state; corrupting `poketrail.save` in DevTools and reloading shows the Title Screen with no crash and "New Run" still works
  5. React DevTools shows that updating `BattleContext` does not re-render `RunContext` consumers (split-context proof)
**Plans**: TBD
**UI hint**: yes

### Phase 4: First Battle UI (1v1 vs Wild)
**Goal**: From the Starter Selection, the user is dropped into a 1v1 battle against a wild Pokémon and can play it through to victory or defeat: pick moves, see HP bars animate, read the battle log, see crits/misses/effectiveness messages, gain XP, and level up. This is the first end-to-end vertical slice — a real battle screen powered by the Phase 2 engine.
**Depends on**: Phase 3 (state architecture), Phase 2 (battle FSM)
**Requirements**: BATT-01, BATT-02, BATT-03, BATT-04, BATT-05, BATT-06, BATT-07, BATT-08, BATT-09, LEVEL-01, LEVEL-02, ENG-07
**Success Criteria** (what must be TRUE):
  1. Player can start a new run, see a wild Pokémon at the top and their starter at the bottom, and execute moves until one side faints
  2. HP bars transition smoothly via CSS (not React state) and shift color green → amber → red as HP drops; Pokémon shake on hit and fade on faint
  3. Battle log shows the last 8 messages including "It's super effective!", "Not very effective…", "It had no effect.", "A critical hit!", "X's attack missed!" where applicable
  4. Move buttons disable when PP=0; "Switch" and "Bag" buttons exist but stay legal-action-gated by FSM phase
  5. Winning a battle awards XP and triggers a level-up that raises stats correctly (verified by reducer test against base-stat formula)
**Plans**: TBD
**UI hint**: yes

### Phase 5: Run Loop, Route Generator, Team Management
**Goal**: A run is now a sequence: the Route Generator produces a graph-shape `RouteNode[]` (Encounter | Item | Heal | Arena), the Route Map UI lets the player advance node by node, and the player can build a team of up to 6 Pokémon with catching, replacing, switching, and forced-switch on faint. Move-learning and evolution prompts appear at level-up. The save schema bumps to v2 and the first migration test passes.
**Depends on**: Phase 4
**Requirements**: ENG-10, RUN-01, RUN-02, RUN-03, RUN-04, RUN-05, RUN-06, RUN-07, RUN-08, TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05, TEAM-06, TEAM-07, TEAM-08, LEVEL-03, LEVEL-04, LEVEL-05
**Success Criteria** (what must be TRUE):
  1. After picking a starter, the player sees a Route Map with Encounter / Item / Heal / Arena nodes; only the next legal node is clickable, past nodes are dimmed
  2. Encounter nodes spawn level-scaled wild Pokémon (Route 1: Lv 3-7); player can fight then catch (free), skip, or flee; Heal nodes restore all HP and clear status
  3. Team View shows 6 slots with sprite/name/level/HP-bar/types/held-item; tapping opens detail with stats/moves/XP-to-next-level; fainted Pokémon are visually distinguished
  4. When the active Pokémon faints, the player is forced to pick a non-fainted replacement; when all faint, the run ends in Game Over
  5. On level-up, if the Pokémon would learn a new move with 4 already known, a "forget a move?" prompt appears; if it would evolve, the player can decline
  6. A `poketrail.save` v1 fixture loads cleanly via the v1 → v2 migration (Vitest fixture test)
**Plans**: TBD
**UI hint**: yes

### Phase 6: Item System, Bag, Reward Screen
**Goal**: The reward loop is complete: after eligible nodes, the player picks 1-of-3 items or skips. The Bag holds up to 10 items. In battle, the player can use heal items (Potion/Super/Hyper), status cures, X-stat boosters (driven by the stat-stage framework), and Pokéballs; using a battle item costs the turn. The held-item slot exists on team Pokémon (effects come in Phase 8).
**Depends on**: Phase 5
**Requirements**: ENG-08, ENG-11, ITEM-01, ITEM-02, ITEM-03, ITEM-04, ITEM-06, ITEM-07, REW-01, REW-02, REW-03, REW-04
**Success Criteria** (what must be TRUE):
  1. After defeating a wild Pokémon, the player sees a Reward Screen with the Pokémon's card and "Catch?" / "Skip" buttons; team-full triggers the Replace flow
  2. After certain nodes, the player sees 3 random item cards and can pick 1 or skip; if the bag is full (10 items), only Skip is allowed
  3. Bag View lists held items with quantities; the player can use a heal item out-of-battle to restore HP and a status cure to remove a status condition
  4. In battle, using an X-Item raises the Pokémon's corresponding stat stage by +1 (max +6) and the move buttons are disabled because the item used the turn
  5. Card animations slide or fade in (no jarring snaps) on Reward Screens
  6. Beating a Gym Leader awards the corresponding Badge plus a guaranteed rare item or Pokémon-choice (verified once Phase 7 lands)
**Plans**: TBD
**UI hint**: yes

### Phase 7: First Arena (Brock) + Badges
**Goal**: The arena infrastructure is in place: an Arena node spawns a fixed Gym Leader battle (Brock with his curated Rock team scaled to current run progress), the player must use items between switches (no mid-battle heal node), and on victory a Badge appears in the run header. This phase scaffolds the framework that Phase 9 will populate with the remaining 7 leaders.
**Depends on**: Phase 6
**Requirements**: ARENA-02, ARENA-03
**Success Criteria** (what must be TRUE):
  1. Reaching an Arena node on Route 1 starts a battle against Brock with a 2-Pokémon team (Geodude, Onix) at curve-appropriate levels and higher stat caps than wild Pokémon
  2. The player cannot flee a Gym battle (RUN-07 enforced); losing all team members triggers Game Over
  3. On victory, a Boulder Badge appears in the run header and persists across nodes; the run advances to the next route segment
**Plans**: TBD
**UI hint**: yes

### Phase 8: Status Effects + Held Items + Smart AI
**Goal**: Battles get tactical depth. All six status conditions (burn, paralyze, poison, sleep, freeze, confusion) work with correct mechanics, persist across switches for major statuses, and tick at end-of-turn via the FSM `turnEnd` phase. Held items have active effects (Leftovers heal, Scope Lens crit, Quick Claw priority). Gym/Elite-Four AI prioritizes super-effective moves and switches on severely disadvantaged matchups.
**Depends on**: Phase 7
**Requirements**: STATUS-01, STATUS-02, STATUS-03, STATUS-04, STATUS-05, STATUS-06, STATUS-07, STATUS-08, ITEM-05, AI-02, AI-03
**Success Criteria** (what must be TRUE):
  1. Burn halves Attack and deals 1/16 max-HP per turn; Poison deals 1/8; Paralyze halves Speed with 25% skip; Sleep prevents action 1-3 turns; Freeze prevents action with 20% thaw chance; Confusion has 33% self-hit chance
  2. A status-inflicting move on a target that already has a status leaves the existing status unchanged; major statuses persist across switch-out and the StatusBadge in the team view reflects this
  3. Holding Leftovers heals 1/16 max HP at end of turn; Scope Lens raises crit stage by 1; Quick Claw can flip turn order with the documented chance
  4. In a gym battle, the AI demonstrably picks a 2× super-effective move over a neutral one when both are legal, and switches its active Pokémon when the matchup is ≤0.5× outgoing or ≥2× incoming damage
**Plans**: TBD
**UI hint**: yes

### Phase 9: Full Arenas, Elite Four, Champion, Endgame
**Goal**: The game is now beatable. All 8 Gym Leaders (Brock, Misty, Lt. Surge, Erika, Koga, Sabrina, Blaine, Giselle/Giovanni) are populated with curated teams in canonical Kanto order and scale through the run. After 8 badges, the Elite Four sequence triggers (4 trainers back-to-back with no heal between, items only), then the Champion. Losing any of those ends the run; winning the Champion plays Victory + Hall of Fame.
**Depends on**: Phase 8
**Requirements**: ARENA-01, ARENA-04, ARENA-05, ARENA-06, ARENA-07, END-01, END-02, END-03, END-04
**Success Criteria** (what must be TRUE):
  1. A full run from Title to Champion can be completed in approximately 30-45 minutes by a competent player; all 8 badges populate the run header in order
  2. After the 8th badge, the Elite Four chains 4 trainers (4-6 Pokémon each) with no Pokémon Center between battles, items only; losing any battle ends the run immediately
  3. The Champion's mixed strong team is the 5th and final battle; defeating it shows the Victory Screen with team aufstellung, run stats, and "Play Again"
  4. Game Over Screen shows badges earned, Pokémon caught, levels reached, and time elapsed; "Try Again" returns to Title Screen
  5. Completing a run adds an entry to the local Hall of Fame (max 10 entries, FIFO eviction) which survives across runs
**Plans**: TBD
**UI hint**: yes

### Phase 10: Pokédex + Animations + Screen Transitions
**Goal**: The persistent Pokédex (its own localStorage key, insulated from save churn) lets the player review all 151 Gen-1 Pokémon as silhouette (seen) or full sprite (caught), filter by type and status. Motion is installed and powers screen transitions (`<AnimatePresence>` slide/fade) and battle animations (shake on hit, fade on faint, smooth HP-bar tween already exists from Phase 4 but is now polished).
**Depends on**: Phase 9
**Requirements**: UI-05, UI-06, POLISH-01, POLISH-02
**Success Criteria** (what must be TRUE):
  1. Pokédex screen renders a grid of all 151 Gen-1 Pokémon: silhouette = seen, full sprite = caught; type and status (seen / caught / unknown) filters change the visible set
  2. Pokédex state lives in `poketrail.pokedex` localStorage key and persists across runs and across "Reset save" (which only touches the run save)
  3. Navigating between Title / Starter / Battle / Reward / etc. plays a slide or fade transition driven by `<AnimatePresence>` (no jarring screen swaps)
  4. Battle: the attacker visually shakes on hit, the fainted Pokémon fades out, and HP-bar tweening uses the same CSS transition as Phase 4 but is verified smooth on a low-end test profile
**Plans**: TBD
**UI hint**: yes

### Phase 11: PWA + A11y/Mobile Audits
**Goal**: Final polish pass with audits, not implementation. `vite-plugin-pwa` makes the app installable from Chrome/Safari with a Workbox service worker that CacheFirst-caches sprites for 30 days so the game works offline once loaded. Real-device testing on iOS Safari and Android Chrome at 375px width plus axe-core / Lighthouse audits drive any remaining a11y or mobile fixes. Target Lighthouse Accessibility ≥ 90.
**Depends on**: Phase 10
**Requirements**: POLISH-03, POLISH-04, A11Y-05, MOBILE-04
**Success Criteria** (what must be TRUE):
  1. The app shows the install prompt in Chrome/Safari and installs as a standalone PWA with the correct icon, name, and theme color
  2. After first visit, sprites load from the service-worker cache and the game launches and plays a battle with the network disabled
  3. Lighthouse Accessibility audit on the deployed Vercel URL scores ≥ 90; axe-core finds no critical violations on the Battle, Route Map, Reward, and Pokédex screens
  4. Real iOS Safari and real Android Chrome (not DevTools simulator) at 375px viewport render Battle, Route Map, and Reward screens correctly with no clipped buttons, no horizontal scroll, no double-tap zoom
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation, Toolchain, Engine Core | 0/TBD | Not started | - |
| 2. Battle Engine FSM | 0/TBD | Not started | - |
| 3. Persistence + State + Title/Starter UI | 0/TBD | Not started | - |
| 4. First Battle UI (1v1 vs Wild) | 0/TBD | Not started | - |
| 5. Run Loop, Route Generator, Team | 0/TBD | Not started | - |
| 6. Item System, Bag, Reward Screen | 0/TBD | Not started | - |
| 7. First Arena (Brock) + Badges | 0/TBD | Not started | - |
| 8. Status Effects + Held Items + Smart AI | 0/TBD | Not started | - |
| 9. Full Arenas, Elite Four, Champion, Endgame | 0/TBD | Not started | - |
| 10. Pokédex + Animations + Screen Transitions | 0/TBD | Not started | - |
| 11. PWA + A11y/Mobile Audits | 0/TBD | Not started | - |
