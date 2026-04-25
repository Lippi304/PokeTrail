# Feature Research

**Domain:** Pokémon Roguelike Browser Game (single-player, run-based)
**Researched:** 2026-04-25
**Confidence:** MEDIUM — Web access was unavailable for live verification of pokelike.xyz / PokéRogue feature lists. Findings are drawn from training-data knowledge of these games (PokéRogue, Pokémon Infinite Fusion, pokelike.xyz, Slay the Spire-style roguelites). Mainline mechanics (battle math, type chart, status effects) are HIGH confidence. Comparator-game-specific feature claims (e.g. "PokéRogue has X biomes") are MEDIUM and should be re-validated by playing the games before locking the roadmap.

## Research Method Note

The research session attempted to fetch live pages from `wiki.pokerogue.net` and `pokelike.xyz` for current feature inventories but `WebSearch` and `WebFetch` were not permitted in this environment. Recommendation: before Phase 1 kickoff, the user (or a research session with web access) should spend ~30 minutes playing pokelike.xyz and ~30 minutes playing PokéRogue to confirm the table-stakes list below matches reality. Nothing in this document is contradicted by the spec in `poketrail.md` — the spec is well-researched and aligns with the genre conventions documented here.

## Feature Landscape

### Table Stakes (Users Expect These)

A Pokémon-fan playing a Pokémon-style roguelike will silently expect every item below. Missing any one of them makes the product feel "off" or unfinished, even if the user can't articulate why.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Gen-1 starter trio (Bulbasaur/Charmander/Squirtle) at Lv 5 | Instantly recognizable entry point; signals "this is real Pokémon" | LOW | Already in Active. Lv 5 is canon. |
| Authentic damage formula (Level, Power, Atk/Def, STAB, Type, Random 0.85-1.0) | Hardcore fans will sanity-check damage numbers; wrong feel = "fake" | LOW | Already in Active. Spec formula matches Gen-1/2 mainline. |
| Full 18-type effectiveness chart | Type matchups are the *core* skill expression of Pokémon | LOW | Static table, ~324 entries. |
| STAB (Same-Type Attack Bonus, x1.5) | Without it, type-matched movesets feel meaningless | LOW | One multiplier in damage calc. |
| Physical / Special / Status move categories | Fans expect Atk vs Sp.Atk to matter (post-Gen-3 split) | LOW | Tag on each move; engine reads category. NOTE: Gen-1 originally had type-based split — modern players will expect the modern split. **Decision needed.** |
| 4 moves per Pokémon with PP | "Run out of PP" is part of run-resource management | LOW | PP regen only at heal events. |
| 6-Pokémon team max | Sacred number — anything else feels wrong | LOW | Already in Active. |
| Switching Pokémon mid-battle (costs a turn) | Type-matchup play depends on free switching | LOW | Standard turn action. |
| Status conditions: Burn / Paralyze / Poison / Sleep / Freeze | These are the canonical 5; missing any feels incomplete | MEDIUM | Already in Active (Phase 3). Sleep RNG (1-3 turns) and Freeze thaw (20%) are the trickiest. |
| Speed-stat determines turn order | Defining mechanic; without it combat feels random | LOW | Tie-break with random. |
| Critical hits (~1/24 base, x1.5 or x2) | Expected RNG flavor; clutch-crit moments are memorable | LOW | One roll per attack. **Not in Active list — should be added.** |
| HP bars with smooth depletion animation | The single most iconic Pokémon UI element | LOW | Already in Polish phase. Should arguably be Phase 1 — flat bars feel cheap. |
| Type-colored move buttons + type badges | Visual language of Pokémon; instant readability | LOW | Already in Active. |
| Battle log / message text | Narration is part of the Pokémon vibe ("Charmander used Ember!") | LOW | Already in Active. |
| Levels and XP gain after battles | Progression is the dopamine loop | LOW | Already in Active. |
| Evolution at level threshold (with cancel option) | Iconic moment; cancellation is canon since Gen 1 (B button) | LOW | Already in Active. |
| 8 Gym Badges + Elite Four + Champion structure | The mainline win condition; deviation needs strong justification | MEDIUM | Already in Active. |
| Mono-type Gym Leaders | Defines puzzle/strategy of each gym | LOW | Already in Active (Rock/Water/Electric/Grass/Poison/Psychic/Fire/Ground). |
| No healing between Elite Four battles (items only) | Canonical tension of the endgame gauntlet | LOW | Already in Active. |
| Catch wild Pokémon to recruit | The genre's defining verb | LOW | Already in Active (post-battle, no Pokéball mechanic — simpler). |
| Held items (Leftovers, Scope Lens, etc.) | Modern Pokémon expectation since Gen 2 | MEDIUM | Already in Active (Phase 3). |
| Healing items (Potion, Super Potion, Full Restore) | Standard run resource | LOW | Already in Active. |
| Persistent save / auto-save | Browser tab close should not nuke a 30-min run | LOW | Already in Active (localStorage). |
| Game Over on full team wipe | Roguelike commitment; "you lost the run" must be real | LOW | Already in Active. |
| Run summary screen on death/victory | Closure + motivation to retry | LOW | Already in Active. |

### Differentiators (Competitive Advantage)

These are where PokeTrail competes against pokelike.xyz, PokéRogue, and Infinite Fusion. Pick 2-3 to emphasize, not all of them.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Clean Apple-inspired Dark UI | pokelike.xyz looks utilitarian; PokéRogue uses pixel-art chrome. A modern, Linear-/Raycast-style UI is a real visual gap in the market. | MEDIUM | Already a stated design pillar. **Strong differentiator — protect it.** |
| Sub-45-min full run | PokéRogue runs are multi-hour; pokelike runs are short but unpolished. Tight, repeatable 30-45 min runs hit the "one more run before bed" sweet spot. | MEDIUM | Already in Core Value. Requires careful encounter pacing. |
| Reward-screen item choice (1 of 3 + skip) | Slay-the-Spire-style choice gives meaningful build decisions; skip-with-benefit is a classic StS pattern (here: keeping bag space). | LOW | Already in Active. **Strongest roguelike-genre differentiator.** |
| Visible run map with branching/node types (Encounter / Item / Arena) | Mental model that StS made standard for roguelikes; pokelike.xyz is mostly linear. | MEDIUM | Already in Active. Branching paths (not just linear) would be a real differentiator — currently spec is linear. **Consider for v1.x.** |
| Engine fully separated from UI (testable, swappable) | Not user-facing, but enables mod-friendliness, Gen 2+ expansion, future mobile/native ports without rewrite. | MEDIUM | Already an architectural decision. Pays off in v1.x. |
| Persistent Pokédex across runs | Meta-progression hook; gives reason to keep playing after first Champion win. | LOW | Already in Active (Phase 4). |
| English Pokémon names (no localization layer) | Closer to PokéAPI canon; reduces v1 complexity; appeals to international audience. | LOW | Already a Key Decision. |
| PWA / installable | "Open the game from my dock without a browser tab" is rare in this genre. | LOW | Already in Active (Phase 4). |
| Static data bundle (no API latency in battle) | Faster, more reliable than pokelike/PokéRogue, which can stutter on data fetches. | LOW | Already a Key Decision. |
| Hall of Fame with run stats (time, captures, KOs, badges) | Reason to share a screenshot; latent virality; replay motivation. | LOW | Already in Active (Phase 3). |

### Likely-Missing Table-Stakes Features (Add to Active)

After cross-checking against the genre, these features are *probably* expected by users but are not currently in PROJECT.md "Active". The user should consciously decide whether to include them in v1 or move them to Out of Scope:

| Feature | Why It's Probably Table-Stakes | Suggested Phase |
|---------|--------------------------------|-----------------|
| **Critical hits** | Universal Pokémon mechanic; without crits, combat math feels lifeless. ~1/24 base rate, x1.5 (modern) or x2 (Gen 1) damage. | Phase 1 (battle engine) |
| **Move accuracy / miss rolls** | Many iconic moves (Hyper Beam, Blizzard, Fire Blast) have <100% accuracy; ignoring this trivializes them. | Phase 1 (battle engine) |
| **Heal events / Pokémon Center nodes between routes** | Mainline players expect a "rest" beat between gym pushes. Without it, the run becomes pure attrition and HP/PP management dominates over strategy. | Phase 2 (route map) |
| **Ability to flee a wild encounter** | Classic mechanic; sometimes you don't want the fight. Could be "skip this encounter for nothing" on the route map. | Phase 2 (encounter UX) |
| **Stat stages (+1 / -1 from X-Items, Growl, etc.)** | Items like X-Attack are listed in Active, but stat-stage mechanics aren't called out. Without stages, X-Items have nothing to do. | Phase 3 (deepen battle) |
| **Move learning / replacement on level-up** | Pokémon learn moves at specific levels; the "forget a move?" prompt is iconic. Without it, movesets are static and feel hollow. | Phase 2 or 3 |
| **Run seed display** | Lets players share/replay specific runs; supports future Daily Challenge feature. Trivial to add now, expensive to retrofit. | Phase 2 (route generator) |
| **Confusion status** | Often grouped with the "main 5" but technically a volatile status. Users may notice if Confuse Ray etc. exist as moves but do nothing. | Phase 3 (with statuses) |

**Recommendation:** Critical hits, move accuracy, and heal/center nodes are the three most important. The current Active list will feel "almost right but slightly empty" without them.

### Anti-Features (Commonly Requested, Often Problematic)

Genre veterans will ask for these. Saying "no" early protects v1 scope.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full 1000+ Pokémon roster (Gen 1-9) | "Why limit to Kanto?" | Data volume balloons; movesets, abilities, mega/dynamax/terastal mechanics each multiply complexity by 2-3x. PokéRogue took years to reach this. | Keep Gen 1 in v1, expose data structure for later expansion. Already in Out of Scope — *good*. |
| Abilities (Intimidate, Levitate, Drought, etc.) | "Pokémon without abilities feels Gen-1-only" | Abilities introduce ~250 unique passive effects; each is a special case in the battle engine. Massive surface area. | Defer to v1.x. Make engine type signature ability-aware (`pokemon.ability?: Ability`) but no-op in v1. |
| Multiplayer / PvP | "I want to fight my friend's run team" | Requires backend, auth, matchmaking, lag-tolerant battle sync, anti-cheat. 5-10x project size. | Already in Out of Scope. Hold the line. |
| Cloud save / accounts | "I want to play on phone and laptop" | Requires backend (Supabase/Firebase), auth UX, conflict resolution, GDPR. | Already in Out of Scope. localStorage is fine for v1. PWA covers "feels like an app" need. |
| Real-time / live battles | "Turn-based feels slow" | Pokémon's *identity* is turn-based; real-time is a different game. Speed-up settings achieve the same goal without breaking the genre. | Settings-screen "Battle speed: slow / normal / fast" already in Active. *Correct call.* |
| Trading | "Pokémon has trading!" | Requires multiplayer infrastructure; meaningless in single-player roguelike. | Out of scope by design. Don't even mention it. |
| Breeding / IVs / EVs / Natures | "Competitive Pokémon depth" | Adds 3-4 layers of stat math + UI; appeals to <5% of audience; obscures the roguelike loop. | Defer to v2+. Use base stats only. Run-to-run variance comes from team composition, not stat optimization. |
| Mega Evolution / Dynamax / Z-Moves / Terastallization | "Modern Pokémon needs them" | Each is a separate mid-battle mechanic with unique UI, animations, and balance implications. | Out of scope for Gen 1. Tera/Mega only make sense if you do Gen 6+. |
| Online leaderboards | "Compare runs with the world" | Needs backend, anti-cheat (client-side game = trivial to fake scores). | Hall of Fame (local, in Active) gives 80% of the value with 5% of the work. |
| Sound and music | "Pokémon without music feels dead" | Audio assets, copyright concerns (using real Pokémon music = takedown risk), volume controls, audio engine. | Already in Out of Scope as "Phase 4 stretch". Acceptable. SFX without music could be a tiny win. |
| Achievements | "More content!" | Easy to over-engineer (50+ achievements with progress tracking, unlock UI, notification system). | Already in Out of Scope. Persistent Pokédex provides similar long-term goal. |
| Nuzlocke mode | "It's the hardcore mode of Pokémon" | Adds permadeath UI, nickname-prompt UX, "graveyard" view, balance considerations. Worth doing — but as v2. | Already correctly Out of Scope for v1, planned Phase 5. |
| Custom sprites / fan art | "PokéAPI sprites are boring" | Asset pipeline, licensing, storage, scope creep. | PokéAPI official artwork is the right call. Already a Key Decision. |
| Light mode toggle | "Accessibility / preference" | Doubles design surface; design language is dark-first. | Already a Key Decision: Dark only. |

## Feature Dependencies

```
[Type Chart] ────┐
[Damage Formula] ┼──> [Battle Engine] ──> [Wild Encounter] ──> [Catching] ──> [Team Mgmt]
[Stats / Speed] ─┘                                                                 │
                                                                                   ▼
[Battle Engine] ──> [Status Effects] ──> [Held Items] ──> [Stat Stages] ──> [X-Items]
       │
       ├──> [Move Categories] ──> [Move Accuracy] ──> [Crit System]
       │
       └──> [XP System] ──> [Level Up] ──> [Move Learning] ──> [Evolution]

[Battle Engine] + [Encounter] ──> [Route Generator] ──> [Route Map UI] ──> [Run Loop]
                                            │
                                            ├──> [Item Reward Nodes] ──> [Bag System]
                                            ├──> [Heal/Center Nodes]
                                            └──> [Arena Nodes] ──> [Gym Leader Battles] ──> [Badges]

[Run Loop] + [Badges×8] ──> [Elite Four Gauntlet] ──> [Champion] ──> [Victory + Hall of Fame]
[Run Loop] ──> [Game Over Screen]
[Run Loop] ──> [Auto-save] ──> [Continue Run]

[Catching] ──enhances──> [Persistent Pokédex] (cross-run meta-progression)

[Settings] ──> [Battle Speed] ──> [Animation toggle]
```

### Dependency Notes

- **Damage formula must come before everything else.** It's the single most-tested unit and every feature touches it. Phase 1 must lock it down with Vitest tests before adding status, items, or AI.
- **Status effects depend on the battle loop's turn structure.** Burn (post-turn damage), Sleep (skip-turn), and Paralyze (pre-turn miss) all hook into specific phases of the turn. Building status before the turn loop is solid is painful.
- **Move learning is a hidden dependency of evolution.** Many Pokémon learn signature moves at evolution (e.g. Wartortle learns Skull Bash on evolve in some sets). If move learning isn't in v1, evolutions feel incomplete.
- **Held items depend on the battle loop having "between-turn" hooks.** Leftovers heals at end-of-turn; this needs to be a first-class engine event, not a special case.
- **Bag system depends on item categories.** Healing/Status/Battle/Held are different at the data layer (Held items consume a slot but are equipped, not used). Worth designing the Item type union upfront.
- **Route map UI is independent of route generation logic** (good — can be developed in parallel). Generator outputs `RouteNode[]`; UI just renders.
- **Auto-save depends on serializable game state.** If you ever store a function or class instance in state, save breaks. Enforce JSON-safe state from Phase 1.
- **Persistent Pokédex enhances catching but doesn't require it for v1 mechanics.** Can ship Phase 4 without breaking earlier phases.
- **Evolution conflicts with "lock current moveset" expectations** if not handled carefully — when Charmander evolves to Charmeleon, what happens to current 4 moves? (Mainline answer: keep them. Should match.)

## MVP Definition

### Launch With (v1) — Phase 1-4 from PROJECT.md

The current Active list is well-scoped. Recommended additions to make it truly table-stakes:

**Phase 1 (Foundation + First Battle):**
- All current Active items — ✓
- **ADD: Critical hits** — trivial in damage formula, expected by users
- **ADD: Move accuracy rolls** — defines move quality
- **ADD: Move category split (Physical / Special)** — confirm decision in spec, currently ambiguous

**Phase 2 (Run Loop):**
- All current Active items — ✓
- **ADD: Heal / Pokémon Center node type** on the route map (between routes)
- **ADD: Move learning prompt on level-up** (when 5th move would be learned, pick which to forget)
- **ADD: Skip-encounter button** (flee from wild battle without reward)
- **CONSIDER: Branching route paths** (StS-style 2-choice forks) — pure differentiator

**Phase 3 (Full Game):**
- All current Active items — ✓
- **ADD: Confusion status** (volatile, but completes the canonical set)
- **ADD: Stat stages (-6 to +6) for X-Items and stat-changing moves** — without stages, X-Items are dead

**Phase 4 (Polish):**
- All current Active items — ✓
- **CONSIDER: Run seed display + "share seed" button** — virality hook, trivial

### Add After Validation (v1.x)

- **Branching route map with risk/reward forks** — if linear feels stale after 5 runs
- **Abilities as no-op-safe data field** — start collecting ability data, no behavior yet
- **Multiple starter generations selectable** — Eevee, Pikachu, Gen-2 starters
- **Daily Challenge (shared seed)** — needs backend or pure client-side date-seed
- **Achievements** — only if retention data shows users finish runs but don't replay
- **Sound effects** (no music to dodge copyright) — Howler.js, ~5 SFX

### Future Consideration (v2+)

- **Nuzlocke mode** — already planned as Phase 5
- **Gen 2+ Pokémon expansion** — datapack-style addition, generic data layer pays off here
- **Cloud save (Supabase auth)** — only if there's demand and >100 weekly active users
- **PvP / asynchronous trainer battles** — large architectural undertaking
- **Abilities, weather, terrain** — modern-Pokémon depth layer
- **Mega/Dynamax/Tera** — only meaningful with later-gen rosters

## Feature Prioritization Matrix

Focused on the *additions* and *contested* features (current Active items are all P1 by definition).

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Critical hits | HIGH | LOW | P1 |
| Move accuracy rolls | HIGH | LOW | P1 |
| Heal nodes between routes | HIGH | LOW | P1 |
| Move learning on level-up | HIGH | MEDIUM | P1 |
| Stat stages (+/- 6) | HIGH | MEDIUM | P1 (needed for X-Items in Active) |
| Skip / flee encounter | MEDIUM | LOW | P1 |
| Confusion status | MEDIUM | LOW | P2 |
| Run seed display | MEDIUM | LOW | P2 |
| Branching route paths (StS-style) | HIGH | MEDIUM | P2 |
| Sound effects (no music) | MEDIUM | MEDIUM | P3 |
| Abilities (data only, no behavior) | LOW | LOW | P2 |
| Daily Challenge | HIGH | HIGH | P3 |
| Achievements | LOW | MEDIUM | P3 |
| Cloud save | LOW | HIGH | P3 |
| Multiplayer | LOW | VERY HIGH | Out of scope |

**Priority key:**
- P1: Must have for v1 launch (Phase 1-4)
- P2: Should have, add in v1.x
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | pokelike.xyz | PokéRogue | Pokémon Infinite Fusion | PokeTrail Plan |
|---------|--------------|-----------|------------------------|----------------|
| Generation scope | Gen 1 focus | Gen 1-9, all forms | Gen 1-5 | Gen 1 only (v1), expandable |
| Run length | ~30 min | 2+ hours (200 waves) | Full ROM-hack length | 30-45 min (sweet spot) |
| Roguelike loop | Light (linear) | Deep (waves, biomes, eggs, Daily) | None — it's a fan ROM hack, not roguelike | Medium (route map, item choices, badges) |
| Branching paths | No (linear) | Biome transitions (limited choice) | N/A | Linear v1, branching v1.x |
| Item-choice rewards | Yes (basic) | Yes (modifier system, deep) | N/A | Yes (1 of 3 + skip) — matches PokéRogue style |
| Persistent meta-progression | Pokédex | Eggs, vouchers, candy, Pokédex, achievements | Save game | Pokédex (v1), more later |
| Statuses & abilities | Basic statuses | Full modern set + abilities | Full mainline | Statuses v1, abilities deferred |
| Held items | Limited | Full modifier system | Full mainline | Yes (Phase 3) |
| Save persistence | localStorage | Server-backed accounts | Local save file | localStorage (v1) |
| UI quality | Functional/utilitarian | Pixel-art retro | Pixel-art retro (mainline-clone) | Modern Dark / Apple-inspired — **clear gap** |
| Mobile support | Partial | Yes (responsive) | Desktop only | Responsive, PWA |
| Sound | Some | Yes (chiptune) | Yes (mainline music) | None v1 |
| Multiplayer | No | No | No | No |
| English-only | No (multi-lang) | Multi-language | English (mainly) | English-only (v1) |

**Strategic read:** PokéRogue dominates on depth and content. pokelike.xyz competes on speed/simplicity. Infinite Fusion is a different category (ROM hack, not roguelike). PokeTrail's defensible space is **modern UI + tight 30-45 min run length + clean architecture** — a "indie polish" play in a genre dominated by either content-maximalism (PokéRogue) or rough-edged simplicity (pokelike). Don't try to out-content PokéRogue. Win on feel.

## Validation Recommendations Before Phase 1

1. **Spend 30 minutes playing pokelike.xyz** — confirm the linear-route, item-choice, gym-progression structure described above. Note any UX moments that feel especially good or bad; bring them to `/gsd-discuss-phase` for Phase 1.
2. **Spend 30 minutes playing PokéRogue (first biome)** — observe modifier-choice UI, biome transition, wave structure. Decide whether "wave-based" vs "route-based" framing is preferred (current spec is route-based, which is more mainline-Pokémon).
3. **Decide on move-category split** — Gen-1-style (type-based) or Gen-3+-style (per-move physical/special split)? The spec says "physical/special/status" so the modern split is implied; confirm explicitly.
4. **Decide on critical hit formula** — Gen-1 (speed-based) or modern (~1/24 flat)? Recommendation: modern, simpler.
5. **Decide on branching routes for v1 vs v1.x** — biggest open differentiator.

## Sources

- `/Users/lippi304/Documents/PokeTrail/poketrail.md` — original spec, source of truth for in-scope features (HIGH confidence)
- `/Users/lippi304/Documents/PokeTrail/.planning/PROJECT.md` — current Active feature list (HIGH confidence)
- Knowledge of mainline Pokémon mechanics (Bulbapedia-canonical: damage formula, type chart, status effects, evolution, badges, Elite Four) (HIGH confidence)
- Knowledge of pokelike.xyz, PokéRogue, Pokémon Infinite Fusion gameplay structures from training data (MEDIUM confidence — recommend live verification before Phase 1)
- Slay the Spire roguelike-deckbuilder design vocabulary (item-choice screens, branching maps, run-based progression) (HIGH confidence)
- Web verification of competitor feature lists was **not performed** in this session due to tool restrictions; flagged for follow-up

---
*Feature research for: Pokémon roguelike browser game (PokeTrail)*
*Researched: 2026-04-25*
