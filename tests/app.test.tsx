// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

describe('App shell (Phase 1 title placeholder)', () => {
  it('renders min-h-[100dvh] root layout (MOBILE-02)', () => {
    const { container } = render(<App />);
    const root = container.firstElementChild;
    if (!root) throw new Error('App did not render a root element');
    expect(root.className).toMatch(/min-h-\[100dvh\]/);
  });

  it('uses dark base bg-[#0a0a0a] (CLAUDE.md design token)', () => {
    const { container } = render(<App />);
    const root = container.firstElementChild;
    if (!root) throw new Error('App did not render a root element');
    expect(root.className).toMatch(/bg-\[#0a0a0a\]/);
  });

  it('renders the locked D-03 disclaimer text (FOUND-06)', () => {
    render(<App />);
    expect(screen.getByText(/non-commercial fan project/i)).toBeInTheDocument();
    expect(screen.getByText(/Nintendo/)).toBeInTheDocument();
    expect(screen.getByText(/Game Freak/)).toBeInTheDocument();
    expect(screen.getByText(/The Pokémon Company/)).toBeInTheDocument();
  });

  it('renders the PokeTrail wordmark', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /poketrail/i })).toBeInTheDocument();
  });

  it('renders a footer with safe-area-inset-bottom padding (MOBILE-02)', () => {
    const { container } = render(<App />);
    const footer = container.querySelector('footer');
    if (!footer) throw new Error('App did not render a <footer> element');
    expect(footer.className).toMatch(/safe-area-inset-bottom/);
  });
});
