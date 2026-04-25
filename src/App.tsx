// src/App.tsx
// Phase 1 title placeholder shell. Phase 3 (UI-01) replaces this with the full Title Screen.
// MOBILE-02: min-h-[100dvh] (NOT 100vh) + safe-area-inset-bottom on the disclaimer footer.
// FOUND-06 / D-03: locked disclaimer text in footer (verbatim, never reword).
import { Disclaimer } from './components/layout/Disclaimer';

export default function App() {
  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white flex flex-col">
      <main className="flex-1 flex items-center justify-center">
        {/* Phase 3 (UI-01) replaces this h1 with the full Title Screen */}
        <h1 className="text-4xl font-bold tracking-tight">PokeTrail</h1>
      </main>
      <footer className="text-center px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Disclaimer />
      </footer>
    </div>
  );
}
