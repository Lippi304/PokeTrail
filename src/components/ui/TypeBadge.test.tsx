// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypeBadge } from './TypeBadge';

describe('TypeBadge (A11Y-01 — always show TEXT label, never color-only)', () => {
  it.each([
    'normal',
    'fire',
    'water',
    'electric',
    'grass',
    'ice',
    'fighting',
    'poison',
    'ground',
    'flying',
    'psychic',
    'bug',
    'rock',
    'ghost',
    'dragon',
  ])('renders the %s type with its TEXT label', (type) => {
    render(<TypeBadge type={type} />);
    // case-insensitive because the badge applies `uppercase` via Tailwind
    expect(screen.getByText(new RegExp(`^${type}$`, 'i'))).toBeInTheDocument();
  });

  it('falls back to a neutral palette for unknown types but still shows the text', () => {
    render(<TypeBadge type="moon" />);
    expect(screen.getByText(/moon/i)).toBeInTheDocument();
  });
});
