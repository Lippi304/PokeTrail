# Phase 1: Foundation, Toolchain, Engine Core - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 liefert das Fundament für alle nachfolgenden Phasen:
1. Bootbares Vite-6-Projekt mit React 19.2 + TypeScript 5.7 strict + Tailwind v4.2 Dark-Theme, deployed auf Vercel ab Tag 1 mit Legal-Disclaimer
2. Pure-TypeScript-Engine (`src/engine/**`, ESLint-enforced no React-Imports): seedable mulberry32 PRNG, Modern-Type-Chart minus Steel/Dark/Fairy aus PokéAPI, Damage-Formel mit STAB/Crits/Accuracy + ≥20 Smogon-Golden-Tests
3. Build-Time-Datenpipeline: `scripts/fetch-pokemon-gen1.ts` zieht 151 Pokémon + Moves + TypeChart aus PokéAPI, Zod-validiert, schreibt JSON nach `src/data/`, lädt Pixel-Sprites nach `public/sprites/`
4. A11y/Mobile-Baseline (Type-Badge-Text-Labels, 44×44px Tap-Targets, Focus-Rings, `100dvh`, `touch-action: manipulation`, 1-4-Keyboard-Shortcuts, `aria-live`)
5. Architektur-Patterns gelockt für spätere Phasen: 3 separate localStorage-Keys, Versioning + Migration-Chain ab Tag 1, Split Context (RunContext + BattleContext) mit Immer

**Nicht in Phase 1:** UI-Screens (Title/Starter/Battle kommen Phase 3-4), Persistence-Implementation (Phase 3), Battle-FSM (Phase 2), Run-Loop (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Branding + Legal/IP
- **D-01:** Name bleibt **PokeTrail** (User hat DMCA-Risk akzeptiert — siehe PROJECT.md Out of Scope)
- **D-02:** **Pixel-Sprites self-hosted** in `public/sprites/` (Gen-1 Pixel von PokéAPI `sprites.versions['generation-i']['red-blue'].front_default`, fallback yellow). Kein Official-Artwork. Niedrigeres IP-Profil + retro-Look passt zum Roguelike.
- **D-03:** **Standard Fan-Project Disclaimer** im Title-Screen-Footer + README: *"PokeTrail is a non-commercial fan project. Pokémon and all related characters are trademarks of Nintendo / Game Freak / The Pokémon Company. This site is not affiliated with or endorsed by them."*
- **D-04:** Vercel-Deployment auf **Default `vercel.app` Subdomain** (z.B. `poketrail.vercel.app` oder `poketrail-niklas.vercel.app`). Kein Custom-Domain in v1.
- **D-05:** **Explizit no-monetization** in Disclaimer + README: "no ads, no donations, no microtransactions, ever". Stärkt Fair-Use-Argument.

### Engine-Mechaniken
- **D-06:** **Modern Type-Chart minus Steel/Dark/Fairy** — programmatisch aus PokéAPI `damage_relations` zur Build-Zeit generiert, keine handgepflegte Tabelle. Psychic ist NICHT 0× gegen Ghost (Gen-1-Bug entfernt). Nur die 15 Typen die Gen-1-Pokémon haben.
- **D-07:** **Critical-Hit: Modern flat ~1/24** (≈4.17% pro Hit, ×1.5 Damage). Stat-Stages für Crit (Scope Lens etc.) kommen erst Phase 8.
- **D-08:** **Move-Category-Split: Modern per-move physical/special** — `damage_class` aus PokéAPI pro Move, NICHT typ-basiert. Hyper Beam = Special wie modern, nicht Physical wie Gen-1.
- **D-09:** **Accuracy-Floor 70% + Min-Damage 1** — keine Move-Accuracy fällt unter 70% (auch nach Drops), Damage gerundet auf min 1. Anti-Frustration-Schutz für kurze Roguelike-Runs.
- **D-10:** **STAB ×1.5**, **Random-Faktor 85-100%** (modern Standard, via seedable RNG).

### Stack-Pinnings
- **D-11:** **React 19.2** (NICHT 18) — Spec sagt "18+", Research empfiehlt 19.2. Greenfield-Projekt 2026 → current line statt maintenance-only.
- **D-12:** **Tailwind v4.2** mit `@tailwindcss/vite` Plugin (NICHT v3 + PostCSS). CSS-first `@theme` Config, Oxide-Engine.
- **D-13:** **Immer + use-immer + Zod alle ab Tag 1** in Phase 1. Auch wenn Phase 1 nichts persistiert: Build-Time-Fetch-Script nutzt Zod, und Patterns für Phase 3 müssen vorhanden sein.
- **D-14:** **ESLint flat config + `no-restricted-imports`** blockiert `react`/`react-dom` unter `src/engine/**`. Zusätzliche Rule blockt `Math.random` und `Date.now` in `src/engine/**` für PRNG-Discipline. CI-enforced.
- **D-15:** Vitest 2.x + `@testing-library/react@16` + `jsdom`. Engine-Tests in `environment: 'node'` für Speed.

### Persistence + State (Patterns gelockt für Phase 3)
- **D-16:** **Drei separate localStorage-Keys**: `poketrail.save` (Run-State, churned), `poketrail.pokedex` (persistent across runs), `poketrail.settings` (audio/speed/etc.). "Reset save" löscht nur `poketrail.save`.
- **D-17:** **Versioning + Migration-Chain ab Phase 1**. Jeder persisted Blob hat `version` field, `SaveV1 → SaveV2 → ...` Union, Zod `safeParse` mit Fallback auf Defaults. Auch wenn Phase 1 nichts persistiert — die Utils + Patterns werden gelockt.
- **D-18:** **Split Context: `RunContext` (slow) + `BattleContext` (fast)**. RunContext: team/badges/route/bag/currentNode. BattleContext: activePoke/hp/statusEffects/statStages/log. Beide via `useImmerReducer`. Vermeidet Re-Render-Storm im Battle (STATE-02).
- **D-19:** **Build-Script + Module-Init Zod-Validation** (BEIDE). `scripts/fetch-pokemon-gen1.ts` validiert PokéAPI-Response vor JSON-Write. `src/data/index.ts` validiert beim Import nochmal — fail-fast bei Drift.

### Claude's Discretion
- A11y/Mobile-Baseline-Implementierungs-Details (z.B. exakte Tailwind-Klassen für Focus-Rings, ARIA-Pattern-Auswahl)
- Vitest-Config-Layout (separate vitest.engine.config vs single config)
- Build-Script-Architektur (single script vs multi-step pipeline)
- Smogon-Test-Cases-Auswahl (≥20 — Pflicht; konkrete Matchup-Auswahl Claude)
- Color-Palette-Specifics für Dark-Theme (`bg-[#0a0a0a]` als Base ist gelockt, Rest offen)
- ESLint + Prettier finale Rules-Set jenseits der genannten Locks
- Vercel-Project-Config-Details (Build-Command, Output-Dir, Node-Version-Pin)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Vision + Scope
- `.planning/PROJECT.md` — Vision, Constraints, Out of Scope, Key Decisions Table
- `.planning/REQUIREMENTS.md` §FOUNDATION/DATA/ENGINE/A11Y/MOBILE — 24 Phase-1-Requirements (FOUND-01..07, DATA-01..05, ENG-01..05, A11Y-01..04, MOBILE-01..03)
- `.planning/ROADMAP.md` §"Phase 1: Foundation, Toolchain, Engine Core" — Goal + Success Criteria

### Research (Phase 0)
- `.planning/research/SUMMARY.md` — Executive Summary + Decisions-Required-Before-Roadmap (6 cross-cutting decisions, alle hier gelockt)
- `.planning/research/STACK.md` — Tech-Stack mit Versionen, Alternatives Considered, Compatibility-Notes
- `.planning/research/ARCHITECTURE.md` — Engine-Purity-Rules, Battle-FSM-Übersicht, Layer-Trennung
- `.planning/research/PITFALLS.md` — DMCA, Damage-Formula-Bugs, Type-Chart-Errors, Save-Korruption, Sprite-Hotlinking, Re-Render-Storms
- `.planning/research/FEATURES.md` — Table-Stakes-Lücken (Crits/Accuracy/Heal-Nodes/Move-Learn/Stat-Stages)

### Detail Spec
- `poketrail.md` — Original detaillierte Spezifikation (Tech-Stack-Begründung, Game-Design, UI-Screens, State-Architektur, Projektstruktur)

### External Domain References
- Bulbapedia — Gen 1 Mechanics, Damage Formula
- Smogon Damage Calculator — Golden-Test-Reference für ENG-04 (≥20 Matchups)
- PokéAPI v2 (`pokeapi.co`) — Build-Time-Datenquelle, `damage_relations` für Type-Chart, `damage_class` per Move für Move-Category-Split
- React 19.2 Release Notes (`react.dev/blog`)
- Tailwind v4.2 Release Notes (`tailwindcss.com/blog`)
- mulberry32 PRNG (Tommy Ettinger, public domain) — RNG-Implementation
- WCAG 2.1 — A11y-Baseline-Standards

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Keine** — Greenfield-Projekt, `src/` existiert noch nicht. Phase 1 startet mit `npm create vite@latest`.

### Established Patterns
- **Keine** — Phase 1 IST der Pattern-Etablierungsschritt. Alle nachfolgenden Phasen erben:
  - `src/engine/**` als pure-TS Layer (no React)
  - `src/data/**` als typed JSON imports mit Zod-Validation
  - `src/contexts/**` als Split-Context-Pattern (Run + Battle)
  - `src/utils/storage.ts` als versioned-localStorage-Wrapper
  - Tailwind-Dark-Theme als Default (`bg-[#0a0a0a]` Base)

### Integration Points
- **Vercel** — Auto-Deploy auf push to main, default `vercel.app` Subdomain
- **PokéAPI** — Build-Time-Fetch only, NIEMALS Runtime auf Gameplay-Pfad
- **GitHub** — Repo-Struktur (CLAUDE.md, README.md, .gitignore, .editorconfig, Prettier-Config aus FOUND-07)

</code_context>

<specifics>
## Specific Ideas

- **Dark-Theme-Base:** `bg-[#0a0a0a]` als Default-Background (aus CLAUDE.md gelockt)
- **Komponenten-Limit:** max ~150 Zeilen pro Datei (CLAUDE.md)
- **Inspiration-Reference für Game-Loop:** [pokelike.xyz](https://pokelike.xyz/) — eigene Interpretation mit cleanerem Dark-UI
- **Designsprache:** Apple-inspiriert (`rounded-2xl`, weiche Schatten, Glassmorphism wo passend), Inter-Font, große zentrale Pokémon-Sprites, Typ-Farben für Badges
- **Engine-Discipline:** `(state, action, rng) → newState` als pure function signature für Engine-Reducer

</specifics>

<deferred>
## Deferred Ideas

- **Crit-Stages mit Scope Lens** — D-07 lockt flat ~1/24 für Phase 1. Crit-Stage-Framework kommt mit Phase 8 (Held Items).
- **Sound-Effekte / Musik** — Out of Scope für v1 (PROJECT.md), nicht in Phase 1.
- **PWA / vite-plugin-pwa** — Phase 11 (POLISH-03, POLISH-04). Nicht Phase 1.
- **Motion / Animations-Library** — Phase 10 (POLISH-01, POLISH-02). Nicht Phase 1.
- **Routing / react-router** — Bewusst nicht im Stack (discriminated-union `screen` field reicht). Nie nötig.
- **Custom-Domain für Vercel** — Default subdomain in v1; Custom-Domain potenziell post-v1 wenn Projekt stabil.
- **Lighthouse-Audits + axe-core** — Tools werden Phase 11 (A11Y-05, MOBILE-04) eingeführt; Phase 1 setzt nur die Baseline.

</deferred>

---

*Phase: 01-foundation-toolchain-engine-core*
*Context gathered: 2026-04-25*
