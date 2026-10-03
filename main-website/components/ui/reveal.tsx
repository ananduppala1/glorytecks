import type { CSSProperties, ElementType, ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Scroll-reveal without an animation library.
//
// The view components used Framer Motion for one effect: fade-and-rise as an
// element enters the viewport, staggered by a per-item delay so lists reveal
// one after another. That cost 62 KB gzipped of client JavaScript and forced
// every view to be a Client Component, so the library was dropped.
//
// This module is a drop-in replacement with the same call shape, so the views
// did not have to be rewritten:
//
//     -import { motion } from 'framer' + '-motion';
//     +import { motion } from '@/components/ui/reveal';
//
// The Framer props are translated, at render time, into CSS custom properties
// on the element:
//
//     initial={{ opacity: 0, y: 24, x: -30, scale: 0.95 }}  → start state
//     transition={{ duration: 0.5, delay: i * 0.08 }}       → timing / stagger
//     whileInView                                           → play on scroll
//     animate (without whileInView)                         → play on mount
//
// The `gt-reveal` keyframes in globals.css read those properties, and
// REVEAL_SCRIPT (inlined in the root layout's <head>) flags each element with
// `data-inview` when it scrolls into view — or immediately, for mount
// animations. That script is ~600 bytes, runs before first paint, and does not
// wait for hydration, so these stay plain Server Components.
//
// Degradation: without JavaScript, or with `prefers-reduced-motion: reduce`,
// nothing is ever hidden and content renders in its final state.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Animation props accepted for source compatibility with the Framer Motion
 * call sites. `initial`, `animate`, `whileInView` and `transition` are read;
 * the rest are accepted and discarded. Typed loosely on purpose — this is a
 * boundary shim, and narrowing it would mean re-describing Framer's API.
 */
interface MotionProps {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  whileInView?: unknown;
  whileHover?: unknown;
  whileTap?: unknown;
  transition?: unknown;
  viewport?: unknown;
  variants?: unknown;
  layout?: unknown;
  layoutId?: unknown;
}

type RevealProps = MotionProps & {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Stagger, in seconds. Same as `transition={{ delay }}`. */
  delay?: number;
} & Record<string, unknown>;

type Values = Record<string, unknown>;

const asObject = (value: unknown): Values | undefined =>
  value && typeof value === 'object' ? (value as Values) : undefined;

/** Framer treats bare numbers as px for x/y. */
const length = (value: unknown) => (typeof value === 'number' ? `${value}px` : String(value));

/**
 * Translate Framer's `initial` + `transition` into the custom properties read
 * by the `gt-reveal` keyframes. Returns undefined when `initial` has nothing
 * this shim animates (e.g. the FAQ's `{ height: 0 }`), so the element renders
 * as a plain tag.
 */
function revealVars(initial: unknown, transition: unknown, delay: number | undefined) {
  const from = asObject(initial);
  if (!from || !['opacity', 'x', 'y', 'scale'].some((key) => key in from)) return undefined;

  const vars: Record<string, string> = {};
  if (typeof from.opacity === 'number') vars['--reveal-opacity'] = String(from.opacity);
  if (from.x !== undefined) vars['--reveal-x'] = length(from.x);
  if (from.y !== undefined) vars['--reveal-y'] = length(from.y);
  if (typeof from.scale === 'number') vars['--reveal-scale'] = String(from.scale);

  const timing = asObject(transition);
  if (typeof timing?.duration === 'number') {
    vars['--reveal-duration'] = `${timing.duration}s`;
    // Framer tweens an explicit duration with easeInOut; without one it uses
    // a snappy spring, which the default easing in globals.css approximates.
    vars['--reveal-ease'] = 'cubic-bezier(0.42, 0, 0.58, 1)';
  }
  const wait = typeof delay === 'number' ? delay : timing?.delay;
  if (typeof wait === 'number' && wait > 0) vars['--reveal-delay'] = `${wait}s`;

  return vars;
}

function createReveal(Tag: ElementType) {
  const Component = ({
    children,
    className = '',
    delay,
    initial,
    animate,
    whileInView,
    transition,
    // Discarded — see the note above.
    exit: _exit,
    whileHover: _whileHover,
    whileTap: _whileTap,
    viewport: _viewport,
    variants: _variants,
    layout: _layout,
    layoutId: _layoutId,
    style,
    ...rest
  }: RevealProps) => {
    const vars = revealVars(initial, transition, delay);

    if (!vars) {
      return (
        <Tag className={className || undefined} style={style} {...rest}>
          {children}
        </Tag>
      );
    }

    return (
      <Tag
        className={`reveal ${className}`.trim()}
        style={{ ...style, ...vars }}
        data-reveal={animate && !whileInView ? 'mount' : undefined}
        // REVEAL_SCRIPT adds `data-inview` before hydration; that attribute is
        // expected, not a mismatch.
        suppressHydrationWarning
        {...rest}
      >
        {children}
      </Tag>
    );
  };

  Component.displayName = `Reveal.${String(Tag)}`;
  return Component;
}

/**
 * Same surface as Framer's `motion`, for the element types this site uses.
 * Extend the list if a view needs another tag — each entry is one line and
 * costs nothing at runtime.
 */
export const motion = {
  div: createReveal('div'),
  section: createReveal('section'),
  aside: createReveal('aside'),
  article: createReveal('article'),
  header: createReveal('header'),
  footer: createReveal('footer'),
  nav: createReveal('nav'),
  ul: createReveal('ul'),
  ol: createReveal('ol'),
  li: createReveal('li'),
  p: createReveal('p'),
  span: createReveal('span'),
  h1: createReveal('h1'),
  h2: createReveal('h2'),
  h3: createReveal('h3'),
  h4: createReveal('h4'),
  a: createReveal('a'),
  figure: createReveal('figure'),
  form: createReveal('form'),
  label: createReveal('label'),
  button: createReveal('button'),
  tr: createReveal('tr'),
  td: createReveal('td'),
};

/**
 * `AnimatePresence` passthrough.
 *
 * Framer used it in exactly three places: the homepage roadmap tab crossfade,
 * the homepage FAQ accordion, and the course filter grid. Its only job is
 * animating elements OUT before React unmounts them. Entry animations still
 * play — a re-keyed or newly mounted `motion.*` element is picked up by
 * REVEAL_SCRIPT like any other — only the exit is dropped.
 */
export function AnimatePresence({ children }: { children?: ReactNode; mode?: string }) {
  return <>{children}</>;
}

/** Explicit wrapper for new code, where the `motion` shape is not wanted. */
export const Reveal = motion.div;

/**
 * Inlined in the root layout's <head>. Flags `.reveal` elements with
 * `data-inview` as they enter the viewport (once, like `viewport={{ once: true }}`),
 * or straight away for `data-reveal="mount"`. A MutationObserver picks up
 * elements as the HTML streams in and as client navigations mount new pages,
 * so it never waits on React.
 *
 * `reveal-ready` on <html> is what arms the hidden start state in CSS; it is
 * set last, so if anything here throws, content simply shows unanimated.
 */
export const REVEAL_SCRIPT = `(function(){try{
var io=new IntersectionObserver(function(es){for(var i=0;i<es.length;i++){if(es[i].isIntersecting){io.unobserve(es[i].target);es[i].target.setAttribute('data-inview','')}}});
function track(el){if(el.hasAttribute('data-inview'))return;if(el.getAttribute('data-reveal')==='mount')el.setAttribute('data-inview','');else io.observe(el)}
function scan(n){if(n.nodeType!==1)return;if(n.classList.contains('reveal'))track(n);var l=n.getElementsByClassName('reveal');for(var i=0;i<l.length;i++)track(l[i])}
new MutationObserver(function(rs){for(var i=0;i<rs.length;i++){var a=rs[i].addedNodes;for(var j=0;j<a.length;j++)scan(a[j])}}).observe(document.documentElement,{childList:true,subtree:true});
scan(document.documentElement);document.documentElement.classList.add('reveal-ready');
}catch(e){}})();`;

export default motion;
