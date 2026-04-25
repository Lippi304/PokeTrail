// src/components/ui/Button.tsx
// A11y + mobile baseline primitive (A11Y-02 + MOBILE-01 + MOBILE-03).
// Locks 44×44 minimum tap target, touch-action: manipulation, and a visible
// focus ring on keyboard navigation. Phase 3+ inherits these defaults — no
// retrofitting required at the screen level.
import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={[
        // 44×44 minimum tap target (MOBILE-01)
        'min-h-[44px] min-w-[44px]',
        // Suppress double-tap zoom (MOBILE-03)
        'touch-manipulation',
        // Visible focus ring on keyboard navigation (A11Y-02)
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]',
        // Default styling — Apple-inspired rounded-2xl per CONTEXT.md design language
        'inline-flex items-center justify-center rounded-2xl px-4 py-2',
        'bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors',
        className,
      ].join(' ')}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
