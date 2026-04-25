# Phase 1: Foundation, Toolchain, Engine Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 01-foundation-toolchain-engine-core
**Areas discussed:** Branding + Legal/IP, Engine-Mechaniken, Stack-Pinnings, Persistence + State

---

## Branding + Legal/IP

| Option | Description | Selected |
|--------|-------------|----------|
| Pixel-Sprites self-hosted | Build-Script lädt Gen-1 Pixel-Sprites von PokéAPI, commit nach `public/sprites/`. Niedrigeres IP-Profil, retro-Look. | ✓ |
| Official-Artwork self-hosted | Sugimori-Art self-hosted. Sieht 'premium' aus, aber genau das Asset bei Nintendo-DMCA-Pattern. | |
| Mix — Pixel im Battle, Official im Pokédex | Pixel für Battle/Team, Official für Pokédex-Detail. Erhöht Asset-Bundle und IP-Risiko. | |

**User's choice:** Pixel-Sprites self-hosted

| Option | Description | Selected |
|--------|-------------|----------|
| Standard Fan-Project Disclaimer | Klassische Fan-Game-Formel als footer + about-section. | ✓ |
| Minimal-Disclaimer | Nur "© Nintendo / Game Freak — Fan project, not affiliated." | |
| Verbose Disclaimer + License-Page | Full Disclaimer + separate /legal Seite mit Asset-Quellen. | |

**User's choice:** Standard Fan-Project Disclaimer

| Option | Description | Selected |
|--------|-------------|----------|
| Default vercel.app Subdomain | `poketrail.vercel.app` o.ä., kein Custom-Domain, niedriges Profil. | ✓ |
| Custom-Domain | Eigene Domain — höheres Profil, schwerer zu wechseln, kostet Geld. | |
| Vercel Project-Name maskieren | Project-Name z.B. 'monster-trail-niklas', UI bleibt PokeTrail. | |

**User's choice:** Default vercel.app Subdomain

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit no-monetization in Disclaimer | "no ads, no donations, no microtransactions, ever" — Fair-Use-Argument. | ✓ |
| Schweigen — keine Aussage zu Monetize | Kein expliziter Statement, höheres DMCA-Risk-Profile. | |

**User's choice:** Explicit no-monetization in Disclaimer

**Notes:** Name "PokeTrail" war bereits in PROJECT.md "Out of Scope" als gelockt markiert (User accepted DMCA risk). Diese 4 Sub-Decisions sind die taktischen Details darüber.

---

## Engine-Mechaniken

| Option | Description | Selected |
|--------|-------------|----------|
| Modern minus Steel/Dark/Fairy | Moderne Effektivitäten ohne Gen-1-Bugs, programmatisch aus PokéAPI build-time. Nur 15 Typen. | ✓ |
| Gen-1 strict (mit Bugs) | Original Gen-1 Tabelle mit Psychic-vs-Ghost = 0×. Authentisch, aber spielt sich kaputt. | |
| Modern komplett (alle 18 Typen) | Steel/Dark/Fairy in der Tabelle, ungenutzte Spalten. Flexibler für Gen-2+. | |

**User's choice:** Modern minus Steel/Dark/Fairy

| Option | Description | Selected |
|--------|-------------|----------|
| Modern flat ~1/24 | 1/24 (≈4.17%) Crit-Chance pro Hit, ×1.5 Damage. Standard seit Gen 6. | ✓ |
| Gen-1 Speed-basiert | Crit = Speed/512, manche Pokémon dauer-critten. Bricht Balance. | |
| Modern Crit-Stages | Stage 0 = 1/24, Stage 1 = 1/8, Stage 2 = 1/2, Stage 3 = 1/1. Nötig für Phase 8 Held Items. | |

**User's choice:** Modern flat ~1/24

| Option | Description | Selected |
|--------|-------------|----------|
| Modern per-move physical/special | `damage_class` aus PokéAPI pro Move, programmatisch. | ✓ |
| Gen-1 type-based | Damage-Class kommt vom Typ: Normal/Fight/etc. = physical, Fire/Water/etc. = special. | |

**User's choice:** Modern per-move physical/special

| Option | Description | Selected |
|--------|-------------|----------|
| 70% Floor + Min-Damage 1 | Keine Move unter 70% Acc, Damage min 1. Anti-Frustration. | ✓ |
| Strict Gen-Mechanik (no floor) | Acc kann auf 33% fallen. Authentisch aber frustrierend in kurzen Runs. | |
| Strict floor + 1/256 Miss-Bug entfernen | Floor + entferne Gen-1 Bug. Reine Anti-Frustration. | |

**User's choice:** 70% Floor + Min-Damage 1

---

## Stack-Pinnings

| Option | Description | Selected |
|--------|-------------|----------|
| React 19.2 | Current line, Compiler-Memoization, Activity. Spec sagt "18+", 19 erfüllt das. | ✓ |
| React 18 | Maintenance-only, kein Compiler. Stabil aber legacy für Greenfield 2026. | |

**User's choice:** React 19.2

| Option | Description | Selected |
|--------|-------------|----------|
| Tailwind v4.2 mit @tailwindcss/vite | Oxide-Engine 5–10× schneller, CSS-first @theme. v4 = current. | ✓ |
| Tailwind v3 (klassisch) | Mit PostCSS + autoprefixer. Stabiler, aber Legacy. | |

**User's choice:** Tailwind v4.2 mit @tailwindcss/vite

| Option | Description | Selected |
|--------|-------------|----------|
| Beide ab Tag 1 | Immer + Zod ab Phase 1 — Patterns + Build-Pipeline + Future-Proofing. | ✓ |
| Nur Zod jetzt, Immer später | Marginal kleinerer Bundle in Phase 1–2. | |
| Nur Immer jetzt, Zod später | Build-Pipeline würde Zod-Schemas neu schreiben müssen — unsauber. | |

**User's choice:** Beide ab Tag 1

| Option | Description | Selected |
|--------|-------------|----------|
| no-restricted-imports auf src/engine/** | Plus Math.random/Date.now-Block. CI-enforced. | ✓ |
| Nur React-Imports blocken | Lass Math.random/Date.now durch — Risk: nicht-deterministische Engine. | |
| Pure Konvention — kein ESLint-Block | README-Doc ohne automatischen Check. PRs rutschen durch. | |

**User's choice:** no-restricted-imports auf src/engine/** (mit Math.random + Date.now Block)

---

## Persistence + State

| Option | Description | Selected |
|--------|-------------|----------|
| Drei separate Keys | save / pokedex / settings. Reset-save löscht nur save. Independent migrations. | ✓ |
| Single atomic Key | Alles in einem Blob. Reset würde Pokédex löschen ohne Spezial-Logik. | |
| Zwei Keys (run vs meta) | run + meta (pokedex+settings combined). Mittelweg, settings-migrate erwürgt pokedex. | |

**User's choice:** Drei separate Keys

| Option | Description | Selected |
|--------|-------------|----------|
| Versioning + Migration-Chain ab Phase 1 | Pattern + Utils gelockt, auch wenn Phase 1 nichts persistiert. Zero-cost insurance. | ✓ |
| Versioning erst in Phase 3 | Time-Pressure in Phase 3, Risk dass Versioning rutscht. | |

**User's choice:** Versioning + Migration-Chain ab Phase 1

| Option | Description | Selected |
|--------|-------------|----------|
| RunContext (slow) + BattleContext (fast) | Spec-konform (STATE-02), vermeidet Re-Render-Storm. Beide useImmerReducer. | ✓ |
| Drei Contexts — Run + Battle + Meta | Granularer, 3 Provider-Wrappers, marginal less re-render. | |
| Single Context | Verbietet Re-Render-Optimierung. Spec-Verletzung. | |

**User's choice:** RunContext (slow) + BattleContext (fast)

| Option | Description | Selected |
|--------|-------------|----------|
| Build-Script + Module-Init | Beide validieren — fail-fast bei Drift. DATA-05 erfüllt. | ✓ |
| Nur Build-Script | Runtime-Imports vertrauen JSONs blind. Riskant. | |
| Nur Module-Init | Build kann broken JSON committen. | |

**User's choice:** Build-Script + Module-Init

---

## Claude's Discretion

Areas where the user deferred to Claude or the planner:
- A11y/Mobile-Baseline-Implementierungs-Details (exakte Tailwind-Klassen, ARIA-Pattern-Auswahl)
- Vitest-Config-Layout (separate engine/UI configs vs single)
- Build-Script-Architektur (single vs multi-step pipeline)
- Smogon-Test-Cases-Auswahl (≥20 Pflicht; konkrete Matchups Claude)
- Color-Palette-Specifics jenseits `bg-[#0a0a0a]`
- ESLint + Prettier finale Rules-Set
- Vercel-Project-Config-Details

## Deferred Ideas

- Crit-Stages mit Scope Lens → Phase 8 (Held Items)
- Sound/Musik → Out of Scope v1
- PWA / vite-plugin-pwa → Phase 11
- Motion / Animations → Phase 10
- Custom-Domain für Vercel → Post-v1
- Lighthouse + axe-core Audits → Phase 11
