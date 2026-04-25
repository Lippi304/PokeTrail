# PokeTrail

## What This Is

PokeTrail ist ein browserbasiertes Pokémon-Roguelike: Spieler wählen einen Gen-1-Starter, kämpfen sich durch zufällig generierte Routen, sammeln Team-Mitglieder und Items, gewinnen Orden in 8 Arenen und müssen am Ende Top 4 + Champion besiegen. Inspiriert von [pokelike.xyz](https://pokelike.xyz/), aber mit cleanerem Dark-UI, modularer Architektur und englischen Pokémon-Namen. Zielgruppe: Pokémon-Fans, die einen schnellen 30–45 min Run im Browser spielen wollen.

## Core Value

Ein vollständiger Run von Starter-Auswahl bis Champion muss sich in unter 45 Minuten flüssig spielen lassen — Kämpfe fühlen sich richtig an (Schadensformel, Typ-Effektivität, STAB), und der Run-Loop (Route → Encounter → Reward → Arena) zieht in die nächste Runde.

## Requirements

### Validated

(None yet — ship to validate)

### Active

#### Foundation
- [ ] Vite + React 18 + TypeScript + Tailwind CSS Setup mit Dark-Theme als Default
- [ ] Statisches `pokemon-gen1.json` + `moves-gen1.json` zur Build-Zeit (151 Pokémon, kein Runtime-API-Call für Gameplay)
- [ ] PokéAPI nur für Sprite-URLs (official artwork)
- [ ] Typ-Effektivitäts-Tabelle (alle 18 Typen)
- [ ] Schadensformel inkl. STAB, Typ-Effektivität, Random-Faktor
- [ ] Engine-Tests mit Vitest (Schadensformel, Typ-Tabelle, Level-Up, Item-Effekte)
- [ ] Vercel-Deployment ab Tag 1 (auch leerer Stub) mit Auto-Deploy auf Push

#### Core Loop (Phase 1)
- [ ] Title Screen mit "New Run" / "Continue Run"
- [ ] Starter-Auswahl: Bulbasaur, Charmander, Squirtle (Lv 5)
- [ ] 1v1 Battle Screen gegen wildes Pokémon
- [ ] HP-Bars, Move-Buttons mit Typ-Farben + PP-Anzeige
- [ ] Battle-Log mit Kampfnachrichten
- [ ] Basis-Gegner-KI (random Move-Auswahl)

#### Run Loop (Phase 2)
- [ ] Routen-Generator: zufällige Encounter-Sequenzen, Level-Skalierung
- [ ] Route-Map UI mit Fortschritts-Anzeige (Encounter / Item / Arena Nodes)
- [ ] Pokémon fangen nach Kampf (Team max 6, Switch wenn voll)
- [ ] Team View mit Stats, Moves, XP
- [ ] XP + Level-Up System
- [ ] Evolution bei Level-Up (Spieler kann ablehnen)
- [ ] Item-System: Tränke, Status-Heiler, Kampf-Items, Held Items
- [ ] Reward Screen: 1 aus 3 Items wählen oder skippen (Bag max 10)
- [ ] Bag View
- [ ] Erste Arena (Brock — Rock)
- [ ] Orden-Anzeige

#### Full Game (Phase 3)
- [ ] Alle 8 Arenen mit Arenaleiter-Teams (Rock, Water, Electric, Grass, Poison, Psychic, Fire, Ground)
- [ ] Top 4 + Champion
- [ ] Schwierigkeitskurve und Level-Skalierung über den ganzen Run
- [ ] Status-Effekte: Burn, Paralyze, Poison, Sleep, Freeze
- [ ] Held Items mit aktiven Effekten
- [ ] Verbesserte Gegner-KI (Typ-Vorteil priorisieren, sinnvolle Switches)
- [ ] Game Over Screen + Run-Stats
- [ ] Victory Screen + Hall of Fame
- [ ] Auto-Save in localStorage nach jedem Event

#### Polish (Phase 4)
- [ ] Persistent Pokédex (Grid, Filter nach Typ/Status, gesehen vs. gefangen)
- [ ] Kampf-Animationen (Shake, Fade, HP-Bar Transition)
- [ ] Screen-Transitions (Slide/Fade)
- [ ] Settings-Screen (Animationen on/off, Speed slow/normal/fast)
- [ ] Title Screen mit subtilem animiertem Hintergrund
- [ ] Mobile responsive (Desktop-first, aber funktional auf Mobile)
- [ ] PWA-Support (installierbar)

### Out of Scope

- **Nuzlocke-Modus** — bewusst auf Phase 5 (post-v1) verschoben, um v1 fokussiert zu halten
- **Gen 2+ Pokémon** — v1 begrenzt auf Kanto (#1-#151), Datenstruktur generisch für späteren Ausbau
- **Multilanguage / Toggle DE/EN** — v1 nur Englisch (Bulbasaur statt Bisasam), keine i18n-Infrastruktur
- **Cloud Save / Auth** — nur localStorage, kein Backend in v1
- **Multiplayer / PvP** — out of scope, single-player only
- **Sound-Effekte / Musik** — Phase 4 Stretch, nicht v1-blocking
- **Achievements** — interessant, aber nicht v1
- **Light Mode** — bewusste Designentscheidung, Dark-only
- **Custom Sprites / eigene Artworks** — PokéAPI offizielles Artwork reicht
- **Runtime-Fetching der Pokémon-Daten** — verworfen wegen API-Latenz/Downtime-Risiko, statt dessen statisches JSON im Bundle

## Context

- **Inspiration:** [pokelike.xyz](https://pokelike.xyz/) — eigene Interpretation mit cleanerem Dark-UI und modularer Architektur
- **Detailed Spec:** `/Users/lippi304/Documents/PokeTrail/poketrail.md` enthält die ausführliche Original-Spezifikation (Tech-Stack, Game-Design, UI-Screens, State-Architektur, Projektstruktur)
- **Datenquelle:** PokéAPI v2 ([pokeapi.co](https://pokeapi.co)) — Daten zur Build-Zeit gefetched und als statisches JSON ins Bundle, Live-API nur für Sprite-URLs
- **Hosting:** Vercel mit Auto-Deploy ab Tag 1 — der User möchte sofort eine Live-URL haben, auch wenn das Spiel noch leer ist
- **Designsprache:** Apple-inspiriert (`rounded-2xl`, weiche Schatten, Glassmorphism wo passend), Inter-Font, große zentrale Pokémon-Sprites, Typ-Farben für Badges
- **Architektur-Prinzip:** Game-Engine strikt von UI getrennt (`src/engine/*` ohne React-Imports) — macht Engine-Tests trivial und ermöglicht spätere Backend-Migration
- **Granularität:** User möchte sauber Schritt für Schritt arbeiten — eher mehr kleinere Phasen mit klarem Verifikations-Gate als wenige große Phasen

## Constraints

- **Tech stack**: React 18+ mit Vite + TypeScript + Tailwind CSS — moderne, schnelle Toolchain ohne SSR-Overhead
- **Tech stack**: State via React Context + useReducer — kein Redux/Zustand in v1, Spec-Vorgabe
- **Tech stack**: Persistenz nur localStorage — kein Backend, kein Auth, alles client-side
- **Tech stack**: Vitest für Engine-Tests — Pflicht für Schadensformel, Typ-Tabelle, Level-Up, Item-Effekte. UI manuell getestet
- **Tech stack**: Keine `any`-Types, alles sauber typisiert (`strict: true` in tsconfig)
- **Tech stack**: Kein inline CSS, keine separaten CSS-Dateien — Tailwind only, `bg-[#0a0a0a]` als Base
- **Performance**: Keine Runtime-PokéAPI-Calls für Gameplay — statisches JSON im Bundle, Sprites lazy
- **Compatibility**: Desktop-first, aber Mobile responsive funktional
- **Hosting**: Vercel ab Tag 1 mit Git-basiertem Auto-Deploy
- **Code quality**: Komponenten max ~150 Zeilen pro Datei, Game-Logik strikt getrennt von UI
- **Scope**: v1 = Phase 1-4 (Foundation → Core Loop → Full Game → Polish), Nuzlocke und Gen 2+ explizit später

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Statisches Gen-1-JSON statt Runtime-Fetch | API-Latenz/Downtime würde Kämpfe blockieren — Daten ändern sich nicht | — Pending |
| PokéAPI nur für Sprites | Sprites sind groß, Daten klein → Daten ins Bundle, Sprites lazy von API | — Pending |
| Englische Pokémon-Namen (Bulbasaur statt Bisasam) | Näher an PokéAPI Original, kein i18n-Layer nötig in v1 | — Pending |
| Vercel-Deploy ab Tag 1 | Live-URL motiviert + frühes Feedback zu Build-Setup | — Pending |
| Engine strikt von UI getrennt (`src/engine/`) | Macht Vitest-Engine-Tests trivial, ermöglicht spätere Architektur-Pivots | — Pending |
| Engine-Tests Pflicht, UI manuell | Pragmatisch — kritische Game-Logik abgesichert, kein Test-Overhead für UI | — Pending |
| Sauber Schritt für Schritt (feine Granularität) | Wenige große Phasen wären schwerer zu verifizieren — kleinere Phasen + klare Gates | — Pending |
| Nuzlocke + Gen 2+ explizit out of scope für v1 | Fokus auf spielbares Komplettpaket vor Erweiterungen | — Pending |
| Dark Mode only, kein Toggle | Bewusste Design-Entscheidung — konsistente Ästhetik | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-25 after initialization*
