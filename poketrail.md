# PokeTrail — Game Specification Document (GSD)

> Pokémon Roguelike Browser Game — React Web App
> Author: Lippi | Generated with Claude
> Status: Phase 1 — Foundation

---

## 1. Projektübersicht

**PokeTrail** ist ein browserbasiertes Pokémon-Roguelike-Spiel. Der Spieler startet mit einem Starter-Pokémon, kämpft sich durch zufällig generierte Routen, sammelt Team-Mitglieder und Items, verdient Orden in Arenakämpfen und versucht am Ende die Top 4 + Champion zu besiegen.

**Inspiriert von:** [pokelike.xyz](https://pokelike.xyz/)
**Ziel:** Eigene Interpretation mit cleanerem Dark-UI, modularer Architektur und späterer Erweiterbarkeit.

---

## 2. Tech-Stack

| Komponente       | Technologie                              |
|------------------|------------------------------------------|
| Framework        | React 18+ (Vite als Bundler)             |
| Sprache          | TypeScript                               |
| Styling          | Tailwind CSS (Dark Theme)                |
| Pokémon-Daten    | PokéAPI (https://pokeapi.co/api/v2/)     |
| Sprites          | PokéAPI Sprite-URLs (official artwork)   |
| State Management | React Context + useReducer               |
| Persistenz       | localStorage (Spielstand lokal)          |
| Hosting          | Vercel                                   |
| Package Manager  | npm                                      |

---

## 3. Design-Richtlinien

### 3.1 Theme
- **Durchgehend Dark Mode** — kein Light Mode Toggle
- Farbpalette:
  - Background: `#0a0a0a` (near black)
  - Surface/Cards: `#141414` bis `#1a1a1a`
  - Border/Subtle: `#2a2a2a`
  - Primary Accent: `#3b82f6` (blue-500, für Buttons/Highlights)
  - Secondary Accent: `#f59e0b` (amber-500, für Gold/Badges/XP)
  - Danger/HP Low: `#ef4444` (red-500)
  - Success/HP Full: `#22c55e` (green-500)
  - Text Primary: `#f5f5f5`
  - Text Secondary: `#a3a3a3`

### 3.2 UI-Stil
- Apple-inspirierte Ästhetik: weiche Rundungen (`rounded-2xl`), subtile Schatten, Glassmorphism-Effekte wo passend
- Smooth Transitions/Animationen (CSS transitions, keine ruckartigen State-Wechsel)
- Pokémon-Sprites groß und zentral im Fokus
- Typ-Farben für Badges und Pokémon-Karten (Feuer = orange, Wasser = blau, etc.)
- Mobile-first responsive, aber Desktop ist Hauptziel

### 3.3 Typografie
- Font: `Inter` (Google Fonts) oder System-Font-Stack
- Headings: Semi-Bold/Bold
- Body: Regular, `text-sm` bis `text-base`

---

## 4. Pokémon-Daten

### 4.1 Datenquelle
- **PokéAPI v2** als primäre Datenquelle
- Beim ersten Laden: relevante Daten fetchen und im localStorage cachen
- Fallback: Statische JSON-Datei mit Gen 1 Basisdaten als Offline-Backup

### 4.2 Scope: Generation 1 (Kanto)
- Pokédex #1–#151
- Nur Gen 1 Moves (oder curated Moveset pro Pokémon)
- Typ-Tabelle: alle 18 Typen für Effektivität, aber nur Gen 1 Pokémon

### 4.3 Benötigte Daten pro Pokémon
```
{
  id: number,
  name: string,
  types: string[],           // ["fire", "flying"]
  baseStats: {
    hp: number,
    attack: number,
    defense: number,
    spAttack: number,
    spDefense: number,
    speed: number
  },
  moves: Move[],             // 4 Moves zur Verfügung
  sprite: string,            // URL zum Artwork/Sprite
  evolutionChain: number[],  // [4, 5, 6] = Charmander → Charmeleon → Charizard
  evolveLevel: number | null // Level bei dem Evolution möglich ist
}
```

### 4.4 Move-Daten
```
{
  id: number,
  name: string,
  type: string,
  category: "physical" | "special" | "status",
  power: number | null,
  accuracy: number,
  pp: number,
  effect: string | null      // z.B. "burn", "paralyze", "stat_boost"
}
```

---

## 5. Game Design

### 5.1 Spielablauf (Core Loop)

```
[Starter wählen]
      ↓
[Route N] → Wildes Pokémon → Kampf → Fangen ODER besiegen
      ↓
[Item-Auswahl] → 1 aus 3 zufälligen Items wählen (oder skippen)
      ↓
[Nächste Route / Arena]
      ↓
[Arena-Kampf] → Arenaleiter besiegen → Orden erhalten
      ↓
... (8 Arenen)
      ↓
[Top 4] → 4 Kämpfe hintereinander
      ↓
[Champion] → Finaler Kampf
      ↓
[Sieg / Niederlage → Game Over Screen]
```

### 5.2 Struktur eines Runs

| Phase             | Routen | Encounters pro Route | Arena am Ende |
|-------------------|--------|----------------------|---------------|
| Früh (Orden 1-2)  | 2-3    | 1-2 Encounters       | Ja            |
| Mitte (Orden 3-5) | 2-3    | 2-3 Encounters       | Ja            |
| Spät (Orden 6-8)  | 2-3    | 2-3 Encounters       | Ja            |
| Top 4 + Champion  | —      | 5 Kämpfe am Stück    | —             |

- Zwischen den Routen: Item-Auswahl oder Team-Heilung
- **Insgesamt ca. 30-45 Minuten pro Run**

### 5.3 Starter-Auswahl
- Klassisch: Bisasam, Glumanda, Schiggy (Bulbasaur, Charmander, Squirtle)
- Starter starten auf Level 5
- Anzeige: Sprite, Name, Typ, Basiswerte

### 5.4 Encounter-System
- Nach jedem Routen-Kampf: Spieler darf das besiegte Pokémon fangen (zum Team hinzufügen) oder skippen
- Maximale Teamgröße: **6 Pokémon**
- Wenn Team voll: Pokémon tauschen oder ablehnen
- Encounter-Level skaliert mit Fortschritt (Route 1 = Lv 3-7, Arena 8 = Lv 45-50)
- Pokémon-Pool pro Route nach Schwierigkeit/Seltenheit gewichtet

### 5.5 Kampfsystem

#### Grundmechanik
- Rundenbasiert, 1v1
- Spieler wählt: **Attacke | Pokémon wechseln | Item benutzen**
- Schnelleres Pokémon (Speed-Stat) greift zuerst an
- Schadensformel (vereinfacht):

```
Schaden = ((2 * Level / 5 + 2) * Power * (Atk / Def)) / 50 + 2) * STAB * TypeEffectiveness * Random(0.85-1.0)
```

- **STAB** (Same Type Attack Bonus): x1.5 wenn Move-Typ = Pokémon-Typ
- **Typ-Effektivität**: x2 (super effektiv), x1 (normal), x0.5 (nicht sehr effektiv), x0 (kein Effekt)

#### Status-Effekte (Basis-Set)
| Status     | Effekt                                    |
|------------|-------------------------------------------|
| Burn       | -50% Atk, Schaden pro Runde               |
| Paralyze   | -50% Speed, 25% Chance nicht anzugreifen  |
| Poison     | Schaden pro Runde (1/8 max HP)            |
| Sleep      | Kann 1-3 Runden nicht angreifen           |
| Freeze     | Kann nicht angreifen, 20% Chance aufzutauen|

#### Arena-Kämpfe
- 8 Arenen, jeweils ein Typ-Fokus (Stein, Wasser, Elektro, Pflanze, Gift, Psycho, Feuer, Boden)
- Arenaleiter hat 2-4 Pokémon (skaliert mit Fortschritt)
- Arenaleiter-Pokémon sind stärker als wilde Pokémon gleichen Levels
- Nach Sieg: Orden + Belohnung (seltenes Item oder Pokémon-Auswahl)

#### Top 4 + Champion
- 5 Trainer hintereinander
- Kein Heilen zwischen Kämpfen (Ausnahme: Items im Inventar)
- Jeder Trainer hat 4-6 Pokémon
- Champion hat ein gemischtes, starkes Team
- **Verlieren = Game Over, Run ist vorbei**

### 5.6 Level-System
- Pokémon bekommen XP nach Kämpfen
- XP-Formel: basiert auf Level-Differenz und gegnerischen Basis-Stats
- Level Up → Stats steigen, neue Moves möglich
- Evolution bei bestimmtem Level (z.B. Glumanda → Glutexo bei Lv 16)
- Evolution: kurze Animation/Übergang, Spieler kann ablehnen (optional)

### 5.7 Item-System

#### Item-Kategorien
| Kategorie  | Beispiele                                      |
|------------|------------------------------------------------|
| Heilung    | Trank (20 HP), Supertrank (50 HP), Top-Trank (Full) |
| Status     | Gegengift, Paralyse-Heiler, Vollheilung        |
| Kampf      | X-Angriff (+1 Atk Stage), X-Tempo (+1 Spe)    |
| Held Items | Überreste (Heal pro Runde), Scope-Linse (Crit+)|

#### Item-Auswahl
- Nach bestimmten Encounters: 3 zufällige Items werden angeboten
- Spieler wählt 1 oder skippt
- Inventar-Limit: 10 Items
- Items werden im Kampf manuell eingesetzt (kostet eine Runde)

---

## 6. UI-Screens & Komponenten

### 6.1 Screen-Flow

```
[Title Screen]
    ↓
[Starter Selection]
    ↓
[Game Screen] ←→ [Team View] ←→ [Bag/Items]
    ↓
[Battle Screen]
    ↓
[Reward Screen] (Pokémon fangen / Item wählen)
    ↓
[Map/Route Progress]
    ↓
[Game Over] oder [Victory/Hall of Fame]
```

### 6.2 Komponenten-Übersicht

#### Title Screen
- Logo "PokeTrail"
- "New Run" Button (Primary)
- "Continue Run" Button (wenn Spielstand existiert)
- Pokédex-Link, Settings-Link
- Subtiler animierter Hintergrund (Partikel oder Pokéball-Muster)

#### Starter Selection
- 3 Starter nebeneinander als Karten
- Hover/Tap: Stats und Typ anzeigen
- Confirm-Button nach Auswahl

#### Battle Screen (Hauptscreen)
- Oben: Gegner-Pokémon (Sprite, HP-Bar, Name, Level, Status)
- Unten: Eigenes Pokémon (Sprite, HP-Bar, Name, Level, Status)
- Action-Bar: 4 Move-Buttons (mit Typ-Farbe + PP-Anzeige)
- Seiten-Buttons: Pokémon-Switch, Bag
- Battle-Log: scrollbare Textbox mit Kampfnachrichten
- Animationen: HP-Bar smooth transition, Shake bei Treffer, Fade bei KO

#### Team View
- 6 Slots (Grid oder Liste)
- Pro Pokémon: Sprite, Name, Level, HP-Bar, Typ-Badge(s), Held Item
- Tap zum Detail: Stats, Moves, XP bis nächstes Level

#### Route/Map Progress
- Horizontaler oder vertikaler Pfad
- Nodes: Encounter (Pokéball-Icon), Item (Stern), Arena (Badge-Icon)
- Aktueller Standort markiert
- Vergangene Nodes ausgegraut, kommende leicht sichtbar

#### Reward Screen
- Nach Kampf: Pokémon-Karte mit "Fangen?" / "Weiter"
- Nach Route: 3 Item-Karten zur Auswahl
- Smooth Card-Flip oder Slide-In Animation

#### Game Over Screen
- "Game Over" + Stats des Runs (Orden, gefangene Pokémon, Level)
- "Try Again" Button → zurück zum Title Screen
- Optional: Run-Zusammenfassung speichern

#### Victory Screen
- "Champion!" Celebration
- Team-Aufstellung anzeigen
- Run-Stats (Zeit, Pokémon gefangen, Items benutzt)
- "Play Again" Button

### 6.3 Pokédex (Persistent)
- Grid mit allen 151 Gen 1 Pokémon
- Gesehen = Silhouette, Gefangen = Farbig mit Sprite
- Persistent über Runs hinweg (localStorage)
- Filter: nach Typ, nach Status (gesehen/gefangen/unbekannt)

### 6.4 Settings
- Animationen an/aus
- Kampfgeschwindigkeit (langsam/normal/schnell)
- Text-Speed
- Sound an/aus (für spätere Implementierung)
- Spielstand löschen

---

## 7. State-Architektur

### 7.1 Game State
```typescript
interface GameState {
  screen: "title" | "starter" | "route" | "battle" | "reward" | "team" | "bag" | "pokedex" | "settings" | "gameOver" | "victory";
  run: RunState | null;
  pokedex: PokedexState;     // persistent über Runs
  settings: SettingsState;
}

interface RunState {
  team: Pokemon[];            // max 6
  bag: Item[];                // max 10
  badges: Badge[];            // gesammelte Orden
  currentRoute: number;       // aktuelle Route
  currentNode: number;        // Position auf der Route
  routeMap: RouteNode[];      // generierte Route
  battleState: BattleState | null;
}

interface BattleState {
  playerPokemon: Pokemon;
  enemyPokemon: Pokemon;
  turn: number;
  log: string[];
  phase: "select" | "animating" | "result";
}
```

### 7.2 Persistenz
- `localStorage.setItem("poketrail-run", JSON.stringify(run))`
- `localStorage.setItem("poketrail-pokedex", JSON.stringify(pokedex))`
- `localStorage.setItem("poketrail-settings", JSON.stringify(settings))`
- Auto-Save nach jedem Encounter/Event

---

## 8. PokéAPI Integration

### 8.1 Endpoints
```
GET /api/v2/pokemon/{id}          → Stats, Types, Sprites, Moves
GET /api/v2/pokemon-species/{id}  → Evolution Chain ID
GET /api/v2/evolution-chain/{id}  → Evolution Details
GET /api/v2/type/{name}           → Typ-Effektivität
GET /api/v2/move/{id}             → Move Details
```

### 8.2 Caching-Strategie
1. Beim ersten App-Start: Gen 1 Pokémon-Daten (151) batch-fetchen
2. Daten in localStorage cachen mit Version-Key
3. Bei jedem Start: Version prüfen, nur bei Mismatch neu laden
4. Fallback: Statisches `pokemon-data.json` im Build für Offline-Nutzung

### 8.3 Rate Limiting
- PokéAPI hat kein Auth, aber Fair-Use-Policy
- Requests throttlen (max 10 concurrent)
- Gecachte Daten bevorzugen

---

## 9. Projektstruktur

```
poketrail/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                  # Tailwind + globale Styles
│   │
│   ├── components/
│   │   ├── screens/
│   │   │   ├── TitleScreen.tsx
│   │   │   ├── StarterSelect.tsx
│   │   │   ├── BattleScreen.tsx
│   │   │   ├── RewardScreen.tsx
│   │   │   ├── RouteMap.tsx
│   │   │   ├── TeamView.tsx
│   │   │   ├── BagView.tsx
│   │   │   ├── PokedexView.tsx
│   │   │   ├── SettingsView.tsx
│   │   │   ├── GameOverScreen.tsx
│   │   │   └── VictoryScreen.tsx
│   │   │
│   │   ├── battle/
│   │   │   ├── PokemonSprite.tsx
│   │   │   ├── HealthBar.tsx
│   │   │   ├── MoveButton.tsx
│   │   │   ├── BattleLog.tsx
│   │   │   └── StatusBadge.tsx
│   │   │
│   │   ├── ui/
│   │   │   ├── Card.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── TypeBadge.tsx
│   │   │
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── ScreenTransition.tsx
│   │
│   ├── context/
│   │   └── GameContext.tsx         # useReducer + Context Provider
│   │
│   ├── hooks/
│   │   ├── useGame.ts             # Game-State Hook
│   │   ├── useBattle.ts           # Battle-Logik Hook
│   │   ├── usePokemonData.ts      # PokéAPI Fetch + Cache
│   │   └── useLocalStorage.ts     # Persistenz Hook
│   │
│   ├── engine/
│   │   ├── battle.ts              # Schadensberechnung, Runden-Logik
│   │   ├── typeChart.ts           # Typ-Effektivitäts-Tabelle
│   │   ├── routeGenerator.ts      # Zufällige Routen + Encounters
│   │   ├── levelUp.ts             # XP, Level, Evolution
│   │   ├── itemEffects.ts         # Item-Logik
│   │   └── ai.ts                  # Gegner-KI (Move-Auswahl)
│   │
│   ├── data/
│   │   ├── pokemon-gen1.json      # Offline-Fallback Pokémon-Daten
│   │   ├── moves-gen1.json        # Offline-Fallback Move-Daten
│   │   ├── items.ts               # Item-Definitionen
│   │   ├── gymLeaders.ts          # Arenaleiter-Teams
│   │   ├── eliteFour.ts           # Top 4 + Champion Teams
│   │   └── typeColors.ts          # Typ → Farbe Mapping
│   │
│   ├── types/
│   │   ├── pokemon.ts
│   │   ├── battle.ts
│   │   ├── items.ts
│   │   └── game.ts
│   │
│   └── utils/
│       ├── api.ts                 # PokéAPI Wrapper
│       ├── random.ts              # Gewichteter Zufall, Shuffle
│       └── format.ts              # Name-Formatting, Stat-Display
│
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 10. Entwicklungsphasen

### Phase 1 — Fundament (MVP)
**Ziel:** Ein spielbarer Kampf mit echten Pokémon-Daten

- [ ] Vite + React + TypeScript + Tailwind Setup
- [ ] PokéAPI Integration: Gen 1 Pokémon laden + cachen
- [ ] Typ-Effektivitäts-Tabelle implementieren
- [ ] Schadensformel implementieren
- [ ] Starter-Auswahl Screen (Bisasam, Glumanda, Schiggy)
- [ ] Battle Screen: 1v1 Kampf gegen wildes Pokémon
- [ ] HP-Bars, Move-Buttons mit Typ-Farben
- [ ] Battle-Log mit Kampfnachrichten
- [ ] Basis-KI: Gegner wählt zufälligen Move

### Phase 2 — Core Loop
**Ziel:** Ein vollständiger Run von Start bis Arena 1

- [ ] Routen-Generator: zufällige Encounter-Sequenzen
- [ ] Route-Map UI (Fortschritts-Anzeige)
- [ ] Pokémon fangen nach Kampf (Team erweitern)
- [ ] Team View: Übersicht, Switch-Möglichkeit
- [ ] XP + Level-Up System
- [ ] Evolution bei Level-Up
- [ ] Item-System: Tränke, Status-Heiler
- [ ] Item-Auswahl nach bestimmten Encounters
- [ ] Bag View
- [ ] Erste Arena: Rocko/Brock (Stein-Typ)
- [ ] Orden-Anzeige

### Phase 3 — Full Game
**Ziel:** Kompletter Run mit allen 8 Arenen + Top 4

- [ ] Alle 8 Arenen mit Arenaleiter-Teams
- [ ] Top 4 + Champion implementieren
- [ ] Schwierigkeitskurve: Level-Skalierung über den Run
- [ ] Status-Effekte (Burn, Paralyze, Poison, Sleep, Freeze)
- [ ] Held Items (Überreste, Scope-Linse, etc.)
- [ ] Gegner-KI verbessern (Typ-Vorteil priorisieren, Switches)
- [ ] Game Over Screen + Run-Stats
- [ ] Victory Screen + Hall of Fame
- [ ] Auto-Save nach jedem Event

### Phase 4 — Polish & Features
**Ziel:** Feinschliff, Pokédex, Animationen

- [ ] Pokédex (persistent, Grid-Ansicht, Filter)
- [ ] Kampf-Animationen (Shake, Fade, HP-Bar Transition)
- [ ] Screen-Transitions (Slide/Fade zwischen Screens)
- [ ] Sound-Effekte (optional, Howler.js oder Tone.js)
- [ ] Settings Screen (Speed, Animationen, Sound)
- [ ] Title Screen mit animiertem Hintergrund
- [ ] Responsive: Mobile-Optimierung
- [ ] Achievements-System
- [ ] PWA-Support (installierbar)

### Phase 5 — Nuzlocke Mode (Erweiterung)
**Ziel:** Hardcore-Modus für Wiederspielwert

- [ ] Nuzlocke-Regeln:
  - Nur das erste Pokémon pro Route fangen
  - Pokémon das bei 0 HP ist → permanent tot (aus Team entfernt)
  - Nickname-Pflicht für jedes Pokémon
  - Game Over wenn alle Pokémon tot
- [ ] UI-Anpassungen: "Tot"-Markierung, Friedhof-Ansicht
- [ ] Schwierigkeitsbalancing für Nuzlocke

---

## 11. Erweiterbarkeit (Zukunft)

- **Gen 2+ Support**: Datenstruktur ist generisch, neue Pokémon = neue Daten
- **Cloud Save**: Supabase Auth + DB für persistente Saves
- **Leaderboards**: Schnellste Runs, wenigste KOs, etc.
- **Daily Challenge**: Seed-basierter Run den alle spielen
- **Multiplayer**: PvP-Kämpfe (WebSocket)
- **Custom Sprites**: Eigene Artwork-Integration

---

## 12. Wichtige Hinweise für Claude Code

1. **Immer TypeScript** — keine `any` Types, alles sauber typisiert
2. **Komponenten klein halten** — max ~150 Zeilen pro Datei
3. **Game-Logik von UI trennen** — Engine-Dateien haben kein React
4. **PokéAPI-Daten cachen** — nicht bei jedem Render neu fetchen
5. **Tailwind für alles** — kein inline CSS, keine separaten CSS-Dateien
6. **Dark Theme ist Default** — kein Light Mode, `bg-[#0a0a0a]` als Basis
7. **Mobile responsive** — aber Desktop-first entwickeln
8. **Phasenweise vorgehen** — Phase 1 muss spielbar sein bevor Phase 2 startet
9. **Testen durch Spielen** — nach jeder Phase einen kompletten Testlauf machen
