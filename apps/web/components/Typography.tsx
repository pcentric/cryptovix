import React from 'react';

type TypographyProps = React.HTMLAttributes<HTMLElement>;

/**
 * Page-level heading (h1)
 * Used for top-level page titles
 */
export const PageTitle = React.forwardRef<
  HTMLHeadingElement,
  TypographyProps
>(({ className = '', ...props }, ref) => (
  <h1
    ref={ref}
    className={`text-4xl font-bold text-zinc-100 ${className}`}
    {...props}
  />
));
PageTitle.displayName = 'PageTitle';

/**
 * Section heading (h2)
 * Used for card and section titles
 */
export const SectionTitle = React.forwardRef<
  HTMLHeadingElement,
  TypographyProps
>(({ className = '', ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-2xl font-semibold text-zinc-100 ${className}`}
    {...props}
  />
));
SectionTitle.displayName = 'SectionTitle';

/**
 * Field label (p)
 * Used for form labels and descriptions
 */
export const Label = React.forwardRef<
  HTMLParagraphElement,
  TypographyProps
>(({ className = '', ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm font-normal text-zinc-400 ${className}`}
    {...props}
  />
));
Label.displayName = 'Label';

/**
 * Monospace stat display (span)
 * Used for BTC prices, VIX values, timestamps with tabular alignment
 */
export const Stat = React.forwardRef<
  HTMLSpanElement,
  TypographyProps
>(({ className = '', ...props }, ref) => (
  <span
    ref={ref}
    className={`font-mono font-semibold text-zinc-100 ${className}`}
    {...props}
  />
));
Stat.displayName = 'Stat';

/**
 * Large monospace stat display (span)
 * Used for hero values like VIX gauge
 */
export const StatLarge = React.forwardRef<
  HTMLSpanElement,
  TypographyProps
>(({ className = '', ...props }, ref) => (
  <span
    ref={ref}
    className={`font-mono text-3xl font-bold text-zinc-100 ${className}`}
    {...props}
  />
));
StatLarge.displayName = 'StatLarge';

/**
 * Badge text (span)
 * Used for status labels and badges
 */
export const Badge = React.forwardRef<
  HTMLSpanElement,
  TypographyProps
>(({ className = '', ...props }, ref) => (
  <span
    ref={ref}
    className={`text-sm font-semibold ${className}`}
    {...props}
  />
));
Badge.displayName = 'Badge';

/**
 * Generic monospace text (code)
 * Used for code snippets and generic mono output
 */
export const MonoText = React.forwardRef<
  HTMLElement,
  TypographyProps
>(({ className = '', ...props }, ref) => (
  <code
    ref={ref}
    className={`font-mono font-normal text-zinc-300 ${className}`}
    {...props}
  />
));
MonoText.displayName = 'MonoText';
