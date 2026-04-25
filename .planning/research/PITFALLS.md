# Pitfalls Research

**Domain:** Pokémon-Roguelike-Browser-Game (React + TS, client-only, localStorage)
**Researched:** 2026-04-25
**Confidence:** MEDIUM-HIGH (domain knowledge from Pokémon community, PokéAPI docs, React best practices; WebSearch unavailable for this run — flag any LOW items for verification before commit-relevant decisions)

> Scope reminder: PokeTrail is a Gen-1 Kanto roguelike, single-player, client-side only, 30–45 min runs, Vercel-hosted, inspired by pokelike.xyz. v1 = Phases 1–4 (Foundation → Core Loop → Full Game → Polish).

---

## Critical Pitfalls

### Pitfall 1: Nintendo / The Pokémon Company DMCA Takedown

**What goes wrong:**
The Pokémon Company International (TPCi) and Nintendo have an aggressive, well-documented track record of issuing DMCA takedowns and cease-and-desist notices against fan games. Notable casualties: Pokémon Uranium, Pokémon Prism, Pokémon Brick Bronze (Roblox), AM2R-style Pokémon clones, and various ROM-hack distribution sites. Even browser-only fan projects have been targeted when they reach critical visibility. Vercel will comply with DMCA notices and take the deployment down, with no warning, potentially with an account-level strike.

**Why it happens:**
Three things consistently trigger enforcement: (1) **use of trademarked name** in product name or domain ("Pokémon" / "Poké" / "Pokéball" / specific Pokémon names in branding rather than just data references), (2) **use of copyrighted assets** — official sprites, official artwork, music, sound effects, font logo, (3) **monetization** in any form (ads, donations, Patreon, premium tier) which removes any "fan tribute" defense. Even fully free, name-only-collision projects get hit if they go viral.

PokeTrail currently uses (a) the name "PokeTrail" — derivative of "Poké" (RISK), and (b) PokéAPI's "official artwork" sprites, which are extracted directly from official games (HIGH RISK).

**How to avoid:**
- **Do NOT use official artwork sprites in production.** PokéAPI's `official-artwork` field returns the high-resolution Ken Sugimori artwork directly owned by TPCi. Use either (a) PokéAPI's pixel sprites from `sprites.front_default` (still copyrighted but lower-profile, used by many tools without enforcement), (b) CC-licensed community sprites (e.g., PokeSprite, Smogon community sprites — verify license per asset), or (c) commission/generate original sprite art that is "Pokémon-inspired" but legally distinct.
- **Avoid the Pokémon trademark in branding.** "PokeTrail" is risky. Safer: a name with no Pokémon root (e.g., "MonsterTrail", "CritterRunner", "Kanto Climb"). Keep "Pokémon" only as in-app data labels, never in title/domain/marketing.
- **No monetization, ever.** No ads, donations, Patreon, "buy me a coffee" links. Monetization is the single biggest enforcement trigger.
- **Add a clear disclaimer**: "Pokémon and Pokémon character names are trademarks of Nintendo / The Pokémon Company. This is a non-commercial fan project, not affiliated with or endorsed by Nintendo." This does not provide legal protection but signals good-faith fan use and is standard practice.
- **Keep visibility moderate.** Don't post on r/pokemon, don't pitch to gaming press, don't go viral on TikTok. Most fan projects survive by staying small.
- **Prepare a takedown response plan**: Have offline backups, alternate hosting (e.g., self-hosted via Cloudflare Pages with anonymous Stripe-less account), and a "rebrand-and-redeploy" plan ready.

**Warning signs:**
- Reaching r/pokemon front page or top 10 on Hacker News
- Receiving emails from "[lawfirm] on behalf of Nintendo of America"
- Vercel sending an "abuse report received" notice
- Sudden 4xx errors on sprite URLs (PokéAPI under takedown pressure has happened in the past)

**Phase to address:**
**Phase 0 / Foundation (Phase 1)** — decide branding and asset strategy BEFORE writing the title screen. Document the decision in PROJECT.md. Add legal disclaimer to title screen during Phase 1.

---

### Pitfall 2: Damage Formula Bugs (off-by-one, integer math, STAB misapplied)

**What goes wrong:**
The Gen 1 damage formula in the spec uses floating-point math, but the original game uses integer truncation at multiple steps. Players who grew up with Gen 1 will spot wrong damage values immediately ("Tackle from a Lv 5 Charmander should do 4–5 to Squirtle, not 7"). Common bugs:
- **STAB applied to status moves** (status moves don't deal damage; STAB is meaningless and can crash if power is null).
- **Type effectiveness multiplied wrong for dual types** (Bug-on-Grass-Flying = 2× × 0.5× = 1×, but bugs often apply only the first type, or multiply 2× × 2× because of operator precedence).
- **Off-by-one in level scaling** (`(2 * Level / 5 + 2)` — without explicit parens, JS evaluates `2 * Level` first, which is correct, but a refactor like `2 * (Level / 5) + 2` silently breaks for low levels due to floor-division differences).
- **Critical hit chance using wrong base** (Gen 1 crit is `Speed / 512` based, not the `1/16` from later gens — the spec doesn't mention crits at all, which is itself a hole).
- **Random factor applied wrong** (Gen 1 uses 217/255 to 255/255, often miscoded as `Math.random() * (1.0 - 0.85) + 0.85` which is fine, but some implementations apply random BEFORE type/STAB instead of after).
- **Min-damage-1 rule missing** (in real Pokémon, any successful attack does at least 1 HP damage even when math rounds to 0).

**Why it happens:**
The formula looks simple in pseudocode but has 6+ multiplication steps where order, rounding, and edge cases matter. Developers test the happy path (Tackle Lv 5 vs Lv 5) and miss boundary conditions (Lv 1 attacks, 0×-effectiveness moves, status moves, sleeping target).

**How to avoid:**
- **Vitest unit tests for the damage formula are non-negotiable.** Cover: (a) STAB on/off, (b) all type effectiveness multipliers including 0×, (c) physical vs special, (d) min-damage-1 rule, (e) level extremes (1, 50, 100), (f) status moves return 0 damage without crashing, (g) random factor bounds.
- **Use a known-good reference table.** Pin exact expected values from a trusted Gen 1 calculator (e.g., Smogon damage calc set to Gen 1) for ~20 sample matchups; treat these as golden tests.
- **Decide upfront: Gen 1 mechanics or modern mechanics?** They differ significantly (Special split into SpAtk/SpDef in Gen 2; Steel/Dark types added in Gen 2; crit formula changed). The spec uses post-Gen-1 stat names (`spAttack`, `spDefense`) — so it's already a hybrid. Document this explicitly.
- **Centralize the formula in `src/engine/battle.ts`.** No copy-pasting. Every consumer goes through one function.
- **Use `Math.floor` explicitly at each step**, not implicit truncation. JS does not truncate by default; `5/2` is `2.5`, not `2`.

**Warning signs:**
- "This Tackle did weird damage" in playtesting
- Tests passing but feel wrong during play
- Different damage values on same matchup across runs (random factor bug)
- NaN or Infinity in HP after crit on a status move

**Phase to address:**
**Phase 1 (Foundation)** — formula must be correct AND tested before Phase 2 builds on it. Add type-chart and damage-formula tests as a hard gate.

---

### Pitfall 3: Type Chart Errors (especially Gen 1 vs modern differences)

**What goes wrong:**
The 18-type chart has 324 cells, and the spec says "alle 18 Typen" but PokeTrail is Gen 1 — which only had 15 types (no Steel, no Dark, no Fairy). Several Gen 1 type matchups differ from modern:
- Ghost was useless against Psychic in Gen 1 (a famous bug — coded as 0× instead of 2×).
- Bug was super-effective against Poison in Gen 1 (changed to neutral in Gen 2).
- Ice Beam vs Fire was 2× in Gen 1 (changed).
- Poison was 2× vs Bug in Gen 1.

Hand-typing 324 entries also introduces typos: copy-pasting a row, swapping super/not-very-effective on a single cell, missing a 0× immunity (Ground vs Flying, Normal/Fighting vs Ghost, Electric vs Ground, Psychic vs Dark in modern, Ghost vs Normal).

**Why it happens:**
Developers grab "the Pokémon type chart" from the first Google result, which is the modern (Gen 6+) chart with Fairy. They build on Gen 1 Pokémon data with a Gen 9 type chart, producing inconsistent gameplay (Charizard being weak to Fairy when no Fairy Pokémon exist).

**How to avoid:**
- **Decide: Gen 1-accurate type chart, or modern chart applied to Gen 1 Pokémon?** Both are valid choices for a fan game; document the decision. Recommendation for PokeTrail: **modern chart minus Steel/Dark/Fairy** (since no Gen 1 Pokémon have those types). This avoids the Ghost-Psychic bug while staying Kanto-coherent.
- **Source the chart from PokéAPI.** `GET /api/v2/type/{name}` returns `damage_relations` with `double_damage_to`, `half_damage_to`, `no_damage_to`. Build the chart programmatically at build time, then commit the generated JSON. Single source of truth.
- **Vitest tests for ~30 known matchups** including the famous ones (Water > Fire 2×, Ground > Electric 2× and immune to Electric attacks, Ghost > Normal immunity, dual-type stacking).
- **Type-chart lookup function returns `1` (neutral) for unknown types**, not `undefined` — protects against typos cascading.

**Warning signs:**
- Test fails on a "should be obvious" matchup
- Player reports "my Pikachu's Thunder did damage to a Diglett" (Electric vs Ground should be 0×)
- Dual-type Pokémon multiplier looks wrong (Geodude is Rock/Ground, should be 4× weak to Water)

**Phase to address:**
**Phase 1 (Foundation)** — generate type chart from PokéAPI at build time, commit JSON, add tests.

---

### Pitfall 4: Save State Corruption and Migration Breakage

**What goes wrong:**
PokeTrail auto-saves to localStorage after every event. Three failure modes:
1. **Schema drift between deploys**: You deploy a new version that adds a field to `RunState` (e.g., `nuzlockeMode: boolean`). Returning players with old saves crash on `undefined.toUpperCase()` or similar. Worst case: game crashes on title screen, "Continue Run" button is broken, no recovery.
2. **Mid-write tab close**: User closes tab during a state update; localStorage write completes but with partial data (rare in practice — localStorage writes are synchronous/atomic per key — but a multi-key save sequence can leave inconsistent state across `poketrail-run`, `poketrail-pokedex`, `poketrail-settings`).
3. **JSON.parse throwing on corrupted data**: Browser quota errors, dev-tools manipulation, browser extensions, or storage clears can leave malformed JSON. Unhandled `JSON.parse(null)` returns `null`, but `JSON.parse('{broken')` throws.

**Why it happens:**
Developers serialize the live state shape directly without versioning. Then they refactor the state shape and forget about saved games in the wild. Also: no try/catch around `JSON.parse`.

**How to avoid:**
- **Version every persisted blob.** Wrap saves in `{ version: 1, data: {...} }`. On load, check version → run migration chain → save back. Treat this as Phase 1 infrastructure, not a Phase 4 polish.
- **Centralize persistence in one module** (`hooks/useLocalStorage.ts` or `utils/storage.ts`). Every read/write goes through it.
- **Defensive load**: try/catch around `JSON.parse`, validate shape with a runtime guard (zod is overkill for a fan game; a manual `isValidRunState(obj)` is fine), fall back to "no save" rather than crashing.
- **"Reset save" button in Settings** (already in spec — keep it).
- **Single atomic save of the whole state object**, not three separate keys updated in sequence. One key (`poketrail-state`) with `{ run, pokedex, settings }` avoids cross-key inconsistency. Or accept the risk and make each key self-contained.
- **Migration tests**: keep example v1, v2, v3 save blobs in `tests/fixtures/saves/` and assert they load cleanly after migration.

**Warning signs:**
- After a deploy, user reports "Continue Run does nothing / crashes"
- Sentry/console errors `Cannot read property X of undefined` from state-loader paths
- Pokédex resets but Run persists (or vice versa) — sign of cross-key inconsistency

**Phase to address:**
**Phase 1 (Foundation)** for the versioning wrapper and load-defensive code. **Phase 3 (Full Game)** when Auto-Save formally lands — must use the v1 wrapper from day one.

---

### Pitfall 5: localStorage Quota Exhaustion

**What goes wrong:**
Browsers cap localStorage at ~5 MB per origin (Chrome/Edge: 10 MB, Safari: 5 MB, mobile Safari: stricter). PokeTrail's run state is small (~tens of KB), but pitfalls cause growth:
- **Caching Pokémon data + sprites in localStorage** (spec section 4.1 + 8.2 mentions this). 151 Pokémon × full move data + base64 sprites would easily exceed 5 MB.
- **Battle log accumulation**: if you persist `BattleState.log: string[]` and never trim, a long run with verbose logs grows unbounded.
- **Hall of Fame / Run history growth**: appending every completed run with full team snapshots eventually fills storage.

When quota is hit, `setItem` throws `QuotaExceededError` (or in Safari private mode, throws on every write). If unhandled, every save fails silently (or worse, the game appears to save but doesn't).

**Why it happens:**
"localStorage is just key-value, why not stick the API cache in there too." Developers don't realize 5 MB is small once you include sprites, and don't write quota-handling code.

**How to avoid:**
- **PokéAPI data goes in the BUILD bundle, not localStorage.** The spec already pivots this way (`pokemon-gen1.json` static at build time) — keep that decision firm. Don't backslide to "cache PokéAPI responses in localStorage."
- **Sprites are URLs, not base64.** Browser HTTP cache handles sprite caching. Never base64-encode sprites into localStorage.
- **Trim the battle log.** Keep last N=50 messages in memory, persist only run-level summary if needed.
- **Cap Hall of Fame to N=10 entries**, FIFO eviction.
- **Wrap all `setItem` calls in try/catch.** On `QuotaExceededError`: clear non-essential keys (Pokédex first? probably not — it's the persistent reward), show user-facing message, fall back to in-memory only.
- **Estimate save size in dev tools**: log `JSON.stringify(state).length` periodically; alarm above 100 KB.

**Warning signs:**
- `QuotaExceededError` in console
- Saves silently failing after long sessions
- Safari Private Mode users reporting saves don't persist (Safari throws on EVERY localStorage write in private mode)
- Save blob > 1 MB

**Phase to address:**
**Phase 1 (Foundation)** for the storage-wrapper with try/catch. **Phase 3 (Full Game)** when battle log + auto-save expand.

---

### Pitfall 6: PokéAPI Rate Limiting / Fair Use Violations

**What goes wrong:**
PokéAPI is free, has no auth, and historically had no hard rate limit — but it has a published Fair Use policy and uses Cloudflare. Aggressive clients have been blocked by IP. Live deployment scenarios that violate fair use:
- **Fetching all 151 Pokémon on every page load** (no cache) — 151 requests × every visitor.
- **Fetching sprites via PokéAPI sprite URLs at high traffic** — sprite URLs return GitHub-hosted PNGs (raw.githubusercontent.com) which has its own rate limits and bandwidth caps, AND can be hotlink-blocked.
- **Tight retry loops on failure** — if the API hiccups and your code retries every 50 ms, you DDoS yourself off the network.

PokéAPI has gone down before (most recently for hours during traffic spikes from viral fan projects). If your game requires the API at runtime to function, downtime = your game is broken.

**Why it happens:**
Developers treat free APIs as infinite. Or they conflate "free to use" with "free to abuse."

**How to avoid:**
- **Build-time fetch, runtime static** (spec already says this — keep it firm). Run a `scripts/fetch-pokemon.ts` script that hits PokéAPI once during `npm run build` (or even better, manually pre-build), saves `pokemon-gen1.json` and `moves-gen1.json` to `src/data/`, and commits them. Zero runtime API calls for gameplay.
- **Sprites: download at build time, host on Vercel.** PokéAPI sprite URLs point to `raw.githubusercontent.com/PokeAPI/sprites/...`. Best practice: download all 151 official sprites + animated sprites once, put them in `public/sprites/`, reference as `/sprites/1.png`. Eliminates hotlinking, eliminates GitHub bandwidth concerns, makes game work fully offline.
- **If you must runtime-fetch**: throttle to ≤10 concurrent (spec mentions this), add exponential backoff on errors, cache aggressively, set a User-Agent header identifying your app + contact email (PokéAPI maintainers ask for this in their docs).
- **Never** fetch in a tight loop from `useEffect` without a dependency check.

**Warning signs:**
- 429 Too Many Requests responses
- Cloudflare 1015 errors ("you are being rate limited")
- 502/503 from PokéAPI during traffic spikes
- Slow first-paint because the app is waiting on an API call

**Phase to address:**
**Phase 1 (Foundation)** — establish build-time fetch script and static JSON. **Phase 1 also**: decide and execute sprite-hosting strategy (download or hotlink).

---

### Pitfall 7: Sprite Hotlinking Issues

**What goes wrong:**
PokéAPI sprite URLs (e.g., `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png`) are served from GitHub's raw content CDN, which:
- Has bandwidth limits per repository
- Will rate-limit/block aggressive hotlinkers
- Can change URL schema without notice (has happened in PokéAPI history)
- Is intended for development, not production hotlinking
- Has slow first-byte from many regions

For "official artwork" specifically (`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png`), the legal risk also escalates — these are direct copies of TPCi's commercial artwork.

**Why it happens:**
Spec says "PokéAPI nur für Sprite-URLs" — easy to interpret as "use the URLs directly in `<img src>`."

**How to avoid:**
- **Self-host sprites**: build script downloads all 151 (× variants you need) into `public/sprites/`. Vercel CDN serves them. No external dependency at runtime.
- **Use pixel sprites, not official artwork.** Lower legal exposure (still copyrighted, but pixel sprites are de-facto tolerated in fan tools; official artwork is what TPCi sells in books/merchandise).
- **Lazy-load sprites with `loading="lazy"`** on `<img>` to avoid loading all 151 on Pokédex open.
- **Fallback sprite** for missing IDs (a `?` Pokéball PNG) so a missing file doesn't break the layout.

**Warning signs:**
- Broken sprite icons in production but not local dev
- 429 from raw.githubusercontent.com in network tab
- Slow Pokédex render (waiting on 151 external requests)

**Phase to address:**
**Phase 1 (Foundation)** — sprite strategy decided alongside data fetch script.

---

### Pitfall 8: React Re-Render Storms During Battle Animations

**What goes wrong:**
Battle screens are state-heavy: HP changes per tick, animations, log lines stream in, status badges update, button enable/disable flips. With React Context + useReducer (spec choice), every dispatch re-renders every Context consumer. Naive implementation:
- Animating an HP bar over 60 frames = 60 dispatches = 60 full Context re-renders = whole battle screen re-renders, including the gegner's sprite, log scroll, move buttons, etc.
- A single battle turn can trigger 20+ dispatches (damage, status tick, log append, animation phase changes), each cascading re-renders.
- Eventually: dropped frames, sluggish input, mobile devices stutter or freeze.

**Why it happens:**
React Context broadcasts updates to all consumers regardless of whether the consumed slice changed. `useReducer` creates a new state object reference on every dispatch. Without memoization, the entire tree subscribed to the Context re-renders.

**How to avoid:**
- **Animate via CSS transitions, not React state.** HP bar animation = set a CSS `transition: width 600ms ease-out` once, then update the `width` style ONCE per damage event. Browser interpolates. No 60-frame React state churn.
- **Battle log: render only the last N=8 messages**, not the full history. Or use `React.memo` on `<BattleLogLine>` components.
- **Split Context**: one for `RunState` (slow-changing — team, badges, route) and one for `BattleState` (fast-changing — HP, log, phase). UI consumers subscribe only to what they need.
- **Or use `useSyncExternalStore` with selectors** (works with vanilla state without adopting Zustand) for fine-grained subscriptions. But this adds complexity — start with split Contexts.
- **Memoize expensive child components** (`React.memo` + stable props via `useMemo`/`useCallback`).
- **Avoid `setInterval`-based animation loops in React state.** Use `requestAnimationFrame` or, better, CSS keyframes / `transition`.
- **Profile with React DevTools "Highlight updates"** during a battle — anything blinking outside the HP bar and log is over-rendering.

**Warning signs:**
- Battle feels laggy on mobile but smooth on desktop
- "Highlight updates" lights up the whole battle screen on every tick
- Dropping frames in DevTools Performance tab during animations
- Input lag pressing move buttons rapidly

**Phase to address:**
**Phase 1 (Foundation)** — set the Context-split pattern. **Phase 4 (Polish)** — animations land; profile and fix.

---

### Pitfall 9: Balance Issues (game too easy / too hard / RNG-dominated)

**What goes wrong:**
Three sub-failures common in roguelike Pokémon clones:
1. **Type-coverage paralysis**: Player gets a starter with bad coverage (Bulbasaur into Brock is fine; Charmander into Brock is brutal). With 8 fixed-type gyms, starter choice can predetermine win-rate. If the player can't switch out of a bad start, the run feels unfair.
2. **Snowball effect**: A strong early Pokémon catch (e.g., Mewtwo on route 3 due to bad weighting) trivializes everything. Conversely, a string of bad encounters ruins a run with no recovery path.
3. **RNG dominance**: Crit rates, sleep RNG, accuracy misses (Hydro Pump 80%) mean a single coin-flip can end a 30-min run. Roguelikes need RNG, but unrewindable instant-loss RNG is frustrating.
4. **Level scaling miscalibration**: Player's team is Lv 30, gym leader is Lv 18 → trivial. Or gym leader Lv 45 → impossible without grinding.

**Why it happens:**
Developers tune balance once (against their own playstyle) and ship. Without telemetry or playtesting from multiple players, balance is anecdotal.

**How to avoid:**
- **Encounter-pool weighting per route**, with hard rarity tiers. Common (70%), Uncommon (25%), Rare (4%), Legendary (1%, route-restricted). Mewtwo NEVER appears on route 3.
- **Level scaling bands**: Each route N has `playerExpectedLevel = f(routeIndex)`; encounter levels are `playerExpectedLevel ± 2`. Gym leader = `playerExpectedLevel + 1` to `+3`.
- **Catch-up mechanic**: If player team avg level is below expected, give bonus XP. Keeps weak runs viable.
- **Reroll for free choice**: Starter choice should preview gym 1 type (or guarantee no hard-counter). Or: 3 starter options shown, player picks blind, but a free reroll exists.
- **Type-coverage hint**: Show gym leader's type BEFORE the gym battle starts (in the route map). Players can plan team composition. This is a roguelike, not a memorization game.
- **Soften RNG**: clamp accuracy floor to 70% (no 50% accuracy garbage moves), reduce crit chance, no instant-KO moves.
- **Playtest with 5 different people, complete a run each.** Track win rate, time-to-loss, frustration moments.

**Warning signs:**
- You always win or always lose
- Single playtester dataset (just yours)
- "I lost because crit" is the most common complaint
- 80%+ of losses happen at the same gym

**Phase to address:**
**Phase 3 (Full Game)** — explicit "Schwierigkeitskurve" task already exists. Add playtesting + telemetry-light (console logs of run outcomes) as part of phase exit gate.

---

### Pitfall 10: Mobile UX Issues for Turn-Based Browser Games

**What goes wrong:**
Spec says "Mobile responsive (Desktop-first, aber funktional auf Mobile)" + "Mobile-first responsive" — which contradict, but signal mobile matters. Common failures:
- **Move buttons too small for thumbs** (44×44 px minimum per Apple HIG / WCAG; design-mockup buttons often end up 28×28).
- **Battle screen requires scrolling** to see both HP bars + buttons on phone landscape.
- **Modal dialogs not closable on mobile** (no escape key, no back-button handling).
- **iOS Safari "double-tap zoom"** triggered by rapid button presses.
- **Input lag from 300ms tap delay** (mostly historic, but `touch-action: manipulation` is still needed).
- **Viewport zoom on input focus** (settings inputs).
- **No safe-area-inset handling** (notch/home-indicator overlap).
- **PWA install prompt missing** despite spec listing PWA support.

**Why it happens:**
Desktop-first development with occasional Chrome-DevTools mobile-toggle checks. Real-device testing skipped.

**How to avoid:**
- **Test on real iOS Safari + Android Chrome** at least once per phase. DevTools simulator hides input/touch issues.
- **Min tap target 44×44 px** for all interactive elements. Use Tailwind's `min-h-[44px] min-w-[44px]` on buttons.
- **`touch-action: manipulation`** on interactive elements via CSS to disable double-tap zoom.
- **Battle screen must fit in 100vh** without scroll on a 667px-tall phone (iPhone SE benchmark). Use `dvh` units (`100dvh`) to handle mobile address-bar collapse.
- **Viewport meta**: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` (already standard via Vite template).
- **`env(safe-area-inset-*)` padding** on root layout.
- **Animation toggle in settings** matters more on mobile (battery + motion sickness).

**Warning signs:**
- "I clicked Tackle but nothing happened" (tap target missed)
- Layout broken on iPhone but fine in DevTools
- Battery drain during a single run
- Battle screen scrolls on mobile

**Phase to address:**
**Phase 4 (Polish)** explicitly. But **Phase 1** should establish min-tap-size and dvh baseline; cheap to do early, expensive to retrofit.

---

### Pitfall 11: Accessibility (Color-Blind Type Colors, Keyboard Nav)

**What goes wrong:**
Type colors are the primary visual differentiator — and many type-pair distinctions break under color blindness:
- **Red-green color blindness** (8% of males, 0.5% of females): Fire (red) vs Grass (green) indistinguishable. Also affects Poison (purple) vs Psychic (pink).
- **Blue-yellow color blindness** (rarer, ~0.01%): Water vs Electric similar.
- HP bar going green → yellow → red is a common single-cue indicator that fails for color-blind players.

Keyboard navigation:
- Battle entirely mouse/touch driven; no Enter/Arrow keys for Move selection means power users and accessibility users are excluded.
- Modal traps not implemented (Tab cycles outside modal).
- Focus indicators removed by Tailwind's reset (`focus:outline-none` everywhere).

Screen-reader:
- Battle log updates via DOM mutation aren't announced (need `aria-live`).
- Sprites with `<img alt="">` empty don't tell SR users which Pokémon is on screen.

**Why it happens:**
A11y is "Phase 4 polish" thinking, but retrofitting focus management and ARIA is brittle. Developers without lived experience of color blindness or screen readers don't naturally test for it.

**How to avoid:**
- **Type badges show TEXT label always** (e.g., "FIRE" written on the orange badge), not color-only. Two-cue redundancy.
- **HP bar uses both color AND fill percentage AND numeric `47/85`** (already in good designs, but verify).
- **Type icons** alongside colors (PokéAPI / community has SVG type icons).
- **Test with a color-blindness simulator** (Chrome DevTools → Rendering → Emulate vision deficiencies).
- **Keyboard nav**: 1–4 keys for moves, Enter to confirm, Esc to back out. Document in Settings.
- **Visible focus rings** — keep Tailwind's `focus:ring-2 focus:ring-blue-500` or equivalent. Don't blanket-disable focus styles.
- **`aria-live="polite"`** on battle log container so SR users hear new lines.
- **Meaningful `alt` text**: `alt="Charizard, level 36, fire flying type"`.
- **Animation toggle** also helps vestibular-sensitive users (already in Settings).
- **Run axe-core or Lighthouse a11y audit** at end of Phase 4. Target 90+ Lighthouse a11y score.

**Warning signs:**
- Lighthouse a11y < 90
- Color-blind playtester says "I can't tell types apart"
- Tab key takes you to URL bar from inside a battle (focus escaped)
- Screen reader silent during battle

**Phase to address:**
**Phase 1 (Foundation)** — establish "type badges always show text label" and keyboard-friendly focus baseline. **Phase 4 (Polish)** — full a11y pass with audit tool.

---

### Pitfall 12: Addictive RNG / Slot-Machine Loop Without Player Agency

**What goes wrong:**
Roguelikes thrive on RNG, but Pokémon-clone RNG can feel exploitative or hollow:
- "1 of 3 random items" choice with mostly-useless options = no real choice.
- Encounter table that's pure RNG = can't strategize team composition.
- Item rewards skewed to obviously-best item = illusion of choice.
- Loot-box-shaped reward animations on a free game = makes parents/regulators uncomfortable, especially given Pokémon's child audience.

Conversely, removing all RNG = predictable = boring.

**Why it happens:**
Easy to throw `Math.random()` everywhere. Hard to design meaningful choices with bounded RNG.

**How to avoid:**
- **Reroll mechanic**: Player can spend an in-run currency or skip a reward to reroll. Even "skip and regenerate" is fine.
- **Item pool tiered**: Common/Uncommon/Rare; reward shows 1 of each tier so the choice is "which type of benefit" not "which dice roll."
- **Show encounter possibilities for upcoming routes** (e.g., route 3 has 5-Pokémon pool revealed) — turns RNG into a probability decision.
- **No loot-box aesthetics** — no spinning slot animations, no "rare drop" gold particles. Calm reveal.
- **No real-money interaction** — never. Even cosmetic. (Reinforces the no-monetization rule from Pitfall 1.)

**Warning signs:**
- Players say "I just kept skipping all the rewards"
- Players say "the items I got didn't matter"
- Reward screens feel like the most exciting part (means the actual gameplay is underweighted)

**Phase to address:**
**Phase 2 (Core Loop)** — reward design when item-system lands. Revisit in **Phase 3** when full item set is in.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode type chart in TS object literal | Saves writing a build script | Diverges from PokéAPI source of truth; manual updates for any gen change | Acceptable if Gen-1-only forever AND committed JSON has tests |
| Skip save versioning in v0 | Fewer files | First post-launch refactor breaks every existing save | Never — version from day 1, it's 10 lines |
| Copy-paste damage formula into AI module for "preview damage" | Saves a function-extraction refactor | Two formulas drift, AI sees different damage than reality | Never — extract from day 1 |
| `any` for PokéAPI responses | Fast prototyping | Breaks on every API field change, no autocomplete | Only in throwaway fetch script, never in `src/` |
| Single Context for all state | Simple setup | Re-render storms in battle screen | Acceptable until first mobile lag; then split |
| Inline sprites via base64 | Single-file bundle | Bundle size explodes, mobile parse time grows | Never for 151 Pokémon |
| Skip `aria-*` until Phase 4 | Faster Phase 1–3 | Retrofitting focus management is painful | Acceptable for visual polish, NOT for keyboard nav (do that in Phase 1) |
| Use official-artwork sprites in dev "we'll swap later" | Looks beautiful in screenshots | Forget to swap; ship with high-IP-risk assets | Never — pick the safe sprite source on day 1 |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| PokéAPI | Runtime fetch in production | Build-time script generates static JSON; commit to repo |
| PokéAPI sprites | Hotlink raw.githubusercontent.com | Download at build time to `public/sprites/`, serve from Vercel |
| PokéAPI types endpoint | Manually transcribing chart | Programmatically derive from `damage_relations` field |
| localStorage | One key per concern + sequential writes | Single atomic key for state OR independent self-contained keys |
| localStorage | No try/catch | Wrap every read/write; handle quota + parse errors |
| Vercel | Push directly to `main` with broken state | Use Preview Deployments for branch validation before merge |
| Vercel | Commit large sprite folder without `.vercelignore` review | Verify build output size; sprites in `public/` are deployed as-is |
| React Context | Single Context for everything | Split slow-vs-fast state contexts |
| Browser PWA | Stale service worker locks old version | Implement update-available toast + `skipWaiting` strategy |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Pokédex grid renders 151 `<img>` eagerly | Slow first paint, network waterfall | `loading="lazy"`, virtualize if > 200 | Immediately on mobile 3G |
| Battle log array grows unbounded | Memory grows during long run | Cap at last 50 messages in state | After ~30 min of play |
| Animations driven by `setInterval` + state updates | Frame drops, input lag | CSS transitions / `requestAnimationFrame` | Mobile devices first |
| `JSON.stringify(state)` on every reducer action for save | Save-write blocks UI thread; long saves janky | Debounce save by 200ms; save only on event boundaries | When state grows past ~50 KB |
| Unmemoized derived data (e.g., `team.filter(p => !p.fainted)` in render) | Sluggish team view, GC churn | `useMemo` for derived collections | Noticeable on lower-end Android |
| Loading all Gen 1 data (151 Pokémon + moves) on title screen | Slow time-to-interactive | Lazy-import `pokemon-gen1.json` only when starter screen mounts | If JSON > 200 KB |
| Loading ALL sprite URLs into title-screen state | Pre-fetching 151 PNGs nobody asked for | Sprite URLs are cheap; don't pre-load images | At first mobile data-cap test |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting localStorage as source of truth without validation | Tampered save with Lv 100 Mewtwo, or crash from manipulated data | Validate shape on load; clamp values to sane ranges before use |
| Rendering battle-log strings via `dangerouslySetInnerHTML` | XSS if any string ever flows in from user input (Pokémon nicknames in Phase 5 Nuzlocke!) | Plain text rendering only; React's default `{string}` is safe |
| Accepting Pokémon nicknames without length/character limits (future) | Layout breaks, potential storage bloat, possible XSS vector | Cap at 12 chars, alphanumeric + space, validate on input |
| Exposing API keys in client bundle | N/A in v1 (no backend) — but if Sentry/analytics added, public DSN is fine, secrets are not | Use Vite env vars correctly: `VITE_*` is public, others server-only |
| Service worker caching sensitive data (future cloud save) | Cached auth tokens persist on shared devices | Don't cache `/api/auth/*` routes; honor `Cache-Control: no-store` |
| Including PII in console logs / Sentry breadcrumbs | Player nicknames, IPs surface in error reports | Scrub before send; for v1 (no auth) low risk |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No "Are you sure?" before starting a new run that overwrites save | Player loses 30-min run by misclick | Confirm modal when active save exists |
| Battle text auto-advances too fast on "fast" speed setting | Player misses what happened | "Fast" still requires click to advance, just removes typing animation |
| No "speed up animation" affordance | Veterans grind through slow animations every run | Speed setting from Phase 1, not Phase 4 |
| HP bar updates instantly (no animation) | Feels cheap, players miss damage feedback | Animate HP transition (CSS transition), even at "fast" speed (just shorter duration) |
| Catch confirmation has no preview of moves/stats | Player declines/accepts blindly | Show full Pokémon card with stats and moves before catch decision |
| Team-full-replace flow loses old Pokémon without confirmation | Player accidentally releases their favorite | Two-step confirm; show what's being replaced |
| Evolution happens automatically with no choice | Glumanda evolves into Glutexo at Lv 16, player wanted to keep cute form | Spec already says "Spieler kann ablehnen" — must implement (don't drop in v1) |
| Type-effectiveness hidden until move lands | Player can't strategize | Show "(Super Effective!)" preview on move-button hover/long-press |
| Game Over with no run summary | Player feels nothing was learned | Show route reached, gym beaten, Pokémon caught, time |
| No way to view enemy team in trainer battles | Surprise switches feel unfair | Reveal trainer's team count (silhouettes) at battle start |
| Can't skip starter intro / replay it on demand | Annoying after 5th run | Skippable; shorter on subsequent runs |

---

## "Looks Done But Isn't" Checklist

- [ ] **Damage formula**: Often missing min-damage-1 rule, status-move null-power guard, dual-type stacking — verify with golden-test table of 20 matchups.
- [ ] **Type chart**: Often missing 0× immunities (Ground vs Flying, Normal vs Ghost) — verify by listing every immunity and asserting the multiplier is 0.
- [ ] **Save/load**: Often missing version key, parse-error fallback — verify by manually corrupting localStorage and reloading.
- [ ] **Auto-save**: Often saves WHILE animating (mid-state-update) — verify by saving only on event boundaries (post-turn, post-encounter), not every dispatch.
- [ ] **Evolution**: Often missing the "decline" path — verify the decline flow keeps the pre-evolution and Pokédex doesn't double-register.
- [ ] **Status effects**: Often missing tick-on-switch, tick-on-faint, immunity-to-self-type (Fire can't be burned) — verify with tests for each status × event matrix.
- [ ] **Item use**: Often missing "uses a turn" cost — verify item use ends player turn.
- [ ] **PP tracking**: Often missing "0 PP = move disabled" — verify struggle fallback or move-grayed-out UI.
- [ ] **Critical hits**: Spec doesn't mention; verify implemented per chosen formula (Gen 1 speed-based vs modern fixed).
- [ ] **Catch logic**: Often missing failure cases (catch rate calculation, ball type) — for PokeTrail's "fang nach Sieg" mechanic, verify whether catch is guaranteed (simpler) or rolled.
- [ ] **Mobile tap targets**: Often look fine in DevTools mobile mode but fail on real iOS Safari — verify on a real phone.
- [ ] **Color-blind type colors**: Often "looks fine to me" — verify with browser color-blindness simulator.
- [ ] **Keyboard nav**: Often only works for buttons in tab order; verify Esc closes modals, arrows nav move buttons, Enter confirms.
- [ ] **PWA**: Often missing manifest.json or icons; verify Lighthouse PWA audit passes.
- [ ] **Continue Run**: After a deploy with state-shape change, often crashes silently — verify migration path or fallback-to-new-run.
- [ ] **Vercel deploy**: Often "works locally"; verify build output runs (Vite build sometimes hides issues that Vite dev hides).
- [ ] **Sprite licensing/branding**: "We'll fix later"; verify before any public sharing.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Nintendo DMCA on deployed game | HIGH | Take down within 24h, rename project, regenerate sprite assets, redeploy on alt host, restore Git history clean of branding |
| Damage formula wrong post-launch | LOW (single function) | Fix formula in `engine/battle.ts`, ship hotfix, players notice "balance patch" rather than "bug" |
| Save corruption breaks Continue Run | MEDIUM | Add try/catch around load, fallback to "no save" with apologetic toast; ship migration that handles old shapes |
| localStorage quota hit in production | LOW–MEDIUM | Add quota error handler that clears non-essential keys (Pokédex last); add a "Storage Full — clear old data?" modal |
| PokéAPI down during build | LOW | Already-committed JSON keeps building; manually retry build later; pin a known-good JSON to the repo |
| React re-render storms found late | MEDIUM | Profile, identify hot Context, split it; usually 1–2 days of work |
| Mobile UX broken at v1 launch | LOW–MEDIUM | Most fixes are CSS-only (tap-target sizing, dvh units); ship within a week |
| Balance feedback says "too hard at gym 3" | LOW | Adjust level scaling constants; data-driven hotfix |
| Color-blind player can't play | LOW | Add type icons + text labels (1–2 day fix) |
| Save-shape change breaks all Continue Runs after deploy | MEDIUM–HIGH | Roll back deploy or ship migration; user trust hit |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Nintendo DMCA | Phase 1 (asset + branding decision) | Manual: name search, sprite source documented |
| Damage formula bugs | Phase 1 | Vitest golden-table tests pass |
| Type chart errors | Phase 1 | Vitest test of ~30 known matchups |
| Save corruption / migration | Phase 1 (versioning) + Phase 3 (auto-save) | Manual: corrupt localStorage, reload, no crash |
| localStorage quota | Phase 1 (wrapper) + Phase 3 (size cap) | Manual: log save size; verify try/catch path |
| PokéAPI rate limit | Phase 1 (build-time fetch) | Verify zero PokéAPI calls in production network tab |
| Sprite hotlinking | Phase 1 (sprite host strategy) | Verify all sprite URLs are same-origin |
| React re-render storms | Phase 1 (Context split) + Phase 4 (profile) | React DevTools "highlight updates" during battle |
| Balance issues | Phase 3 + ongoing playtesting | 5 playtesters complete a run; track outcomes |
| Mobile UX | Phase 1 (tap-target baseline) + Phase 4 (full pass) | Real-device test on iOS Safari + Android Chrome |
| Accessibility | Phase 1 (keyboard + text labels) + Phase 4 (audit) | Lighthouse a11y > 90; color-blindness sim |
| Slot-machine RNG | Phase 2 (reward design) + Phase 3 (item set) | Player feedback: "choices feel meaningful" |
| Save state versioning | Phase 1 | Migration test fixtures load cleanly |
| Evolution decline path | Phase 2 (level-up) | Manual test: decline keeps pre-evo |
| Status effect edge cases | Phase 3 | Vitest matrix of status × event |

---

## Sources

- **PokéAPI documentation & Fair Use Policy** — pokeapi.co/docs/v2 (HIGH confidence on caching/fair-use guidance)
- **Bulbapedia / Pokémon community wiki** — Gen 1 mechanics, type chart history, damage formula references (HIGH confidence on formula details)
- **Smogon University** — competitive Pokémon mechanics, damage calculator as golden reference (HIGH confidence)
- **DMCA / fan-game enforcement history** — Pokémon Uranium, Pokémon Prism, Pokémon Brick Bronze takedowns (MEDIUM-HIGH confidence; pattern is well-documented in game-dev press, specific 2025-2026 cases not verified this run)
- **React official docs** — Context performance characteristics, memoization patterns (HIGH confidence)
- **WCAG 2.1** — color contrast, tap target, keyboard nav requirements (HIGH confidence)
- **MDN Web Storage API** — localStorage quota, error handling (HIGH confidence)
- **Vercel docs** — Preview Deployments, build output handling (HIGH confidence)
- **Personal/community knowledge** — React re-render patterns, mobile Safari quirks, PWA gotchas (MEDIUM confidence)

> **Note on confidence:** WebSearch was unavailable during this research run. All findings are drawn from the researcher's training data. **LOW-confidence flags for verification before acting:**
> - Specific 2025-2026 Nintendo DMCA cases — verify with current news before relying on "they're enforcing" assumption
> - Current PokéAPI Fair Use Policy exact wording — verify at pokeapi.co/docs/v2 before launch
> - Current Vercel quota / DMCA-response policy — verify before assuming alt-hosting is needed quickly
> - Current PokéAPI sprite URL schema — verify URLs still resolve before downloading at build time

---
*Pitfalls research for: Pokémon-Roguelike-Browser-Game (PokeTrail)*
*Researched: 2026-04-25*
