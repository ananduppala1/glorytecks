import coreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * Flat ESLint config (ESLint 9 / eslint-config-next 16).
 *
 * Two rules are deliberately relaxed rather than "fixed", because satisfying
 * them would mean rewriting components that work today — and this is a
 * framework migration, not a refactor:
 *
 *   react-hooks/set-state-in-effect
 *     Three components sync external state into React on mount: the header's
 *     scroll listener, the mobile-breakpoint hook, and the demo modal syncing
 *     its `defaultCourse` prop. These are the original implementations and they
 *     behave correctly; rewriting them risks visual regressions for a lint
 *     preference. Flagged, not silenced.
 *
 *   @next/next/no-location-assign-relative-destination
 *     ErrorBoundary intentionally does a full page load after a crash — a soft
 *     router push would keep the broken React tree alive.
 */
const config = [
  ...coreWebVitals,
  ...nextTypescript,
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  {
    rules: {
      // SafeImage and the blog body renderer fall back to a plain <img> for
      // image hosts outside the next/image allow-list — see lib/images.ts.
      '@next/next/no-img-element': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      '@next/next/no-location-assign-relative-destination': 'warn',
      // `_priority` / `_actionTypes` are intentional API-parity placeholders.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['eslint.config.mjs', 'postcss.config.mjs', 'next.config.mjs', 'tailwind.config.ts'],
    rules: { 'import/no-anonymous-default-export': 'off' },
  },
];

export default config;
