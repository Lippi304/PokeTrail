// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button primitive (A11Y-02 + MOBILE-01 + MOBILE-03)', () => {
  it('has min-h-[44px] and min-w-[44px] (MOBILE-01 — 44×44 tap target)', () => {
    render(<Button>OK</Button>);
    const btn = screen.getByRole('button', { name: /ok/i });
    expect(btn.className).toMatch(/min-h-\[44px\]/);
    expect(btn.className).toMatch(/min-w-\[44px\]/);
  });

  it('has touch-manipulation class (MOBILE-03 — suppresses double-tap zoom)', () => {
    render(<Button>OK</Button>);
    const btn = screen.getByRole('button', { name: /ok/i });
    expect(btn.className).toMatch(/touch-manipulation/);
  });

  it('has focus-visible:ring-2 (A11Y-02 — visible focus ring on keyboard nav)', () => {
    render(<Button>OK</Button>);
    const btn = screen.getByRole('button', { name: /ok/i });
    expect(btn.className).toMatch(/focus-visible:ring-2/);
  });

  it('renders children as label content', () => {
    render(<Button>Start Run</Button>);
    expect(screen.getByText('Start Run')).toBeInTheDocument();
  });

  it('forwards additional className without dropping baseline classes', () => {
    render(<Button className="custom-extra">OK</Button>);
    const btn = screen.getByRole('button', { name: /ok/i });
    expect(btn.className).toMatch(/custom-extra/);
    expect(btn.className).toMatch(/min-h-\[44px\]/);
  });

  it('defaults to type="button" (no accidental form submission)', () => {
    render(<Button>OK</Button>);
    const btn = screen.getByRole('button', { name: /ok/i });
    expect(btn).toHaveAttribute('type', 'button');
  });
});
