# NFStay Design Cheatsheet — hub.nfstay.com

> This file auto-loads in every Claude session for marketplace10.
> Follow these tokens exactly. Never introduce new hex values or random colours.

## Brand Colours (CSS variables from index.css)

| Token | Light mode | Dark mode | Use for |
|-------|-----------|-----------|---------|
| `--primary` | `145 63% 42%` (green) | `145 63% 42%` | Buttons, links, active states, ring |
| `--primary-foreground` | `0 0% 100%` (white) | `0 0% 100%` | Text on primary backgrounds |
| `--secondary` | `210 20% 96%` (light gray) | `217 33% 18%` | Secondary buttons, subtle backgrounds |
| `--accent` | `145 63% 42%` (same green) | `145 63% 42%` | Highlights, active sidebar |
| `--accent-light` | `149 80% 96%` (very light green) | — | Badge backgrounds, hover tints |
| `--destructive` | `0 84% 60%` (red) | `0 63% 31%` | Delete buttons, error states |
| `--muted` | `210 20% 96%` | `217 33% 18%` | Disabled states, placeholder backgrounds |
| `--muted-foreground` | `215 16% 47%` | `215 20% 65%` | Secondary text, hints |
| `--border` | `214 32% 91%` | `217 33% 18%` | All borders |

### Semantic colours
| Token | Value | Use for |
|-------|-------|---------|
| `--success` | `160 60% 45%` | Success toasts, confirmed states |
| `--warning` | `38 92% 50%` | Warning badges, caution states |
| `--danger` | `0 84% 60%` | Error states, destructive actions |
| `--info` | `217 91% 60%` | Info badges, neutral alerts |

### Hero section (dark header)
| Token | Value |
|-------|-------|
| `--hero-bg` | `215 50% 11%` |
| `--hero-surface` | `215 35% 18%` |
| `--hero-border` | `215 22% 28%` |
| `--hero-text` | `0 0% 100%` |
| `--hero-sub` | `215 20% 65%` |

### Nickel theme (orange — /nickel landing only)
| Token | Value |
|-------|-------|
| `--primary` | `24 90% 55%` (orange) |
| `--secondary` | `0 0% 100%` |

## Fonts
- **Body:** `Inter` (weights: 400, 500, 600, 700, 800)
- **Headings:** `Plus Jakarta Sans` (weights: 400, 500, 600, 700, 800)
- **Accent/quotes:** `Playfair Display` (italic for decorative text)
- **Fallback:** `system-ui, -apple-system, sans-serif`

## Spacing
- **Grid:** 4px / 8px increments — never arbitrary margins
- **Container:** max-width `1400px`, padding `2rem`, centred
- **Border radius:** `--radius: 0.625rem` (lg), `-2px` (md), `-4px` (sm)

## Component Library
- **Always use shadcn/ui first** — 39+ primitives already installed
- **Icons:** Lucide React only — no other icon libraries
- **Conditional classes:** use `cn()` from `@/lib/utils`
- **Never hand-edit** files in `src/components/ui/` — those are shadcn-managed

## Badge Variants (defined in index.css)
| Class | Background | Text colour |
|-------|-----------|-------------|
| `badge-green` | `accent-light` | `accent-foreground` |
| `badge-green-fill` | `primary` | white |
| `badge-amber` | `hsl(46 100% 97%)` | `hsl(28 73% 26%)` |
| `badge-red` | `hsl(0 86% 97%)` | `hsl(0 72% 51%)` |
| `badge-gray` | `hsl(220 14% 96%)` | `hsl(220 9% 26%)` |
| `badge-dark` | `hsl(222 84% 5%)` | white |

## Patterns (defined in index.css)
- **Card hover:** `card-hover` class — subtle shadow + green border tint + translateY(-1px)
- **Skeleton loading:** `skeleton-shimmer` class — animated shimmer gradient
- **Scroll reveal:** `scroll-reveal` + `.revealed` — fade-up on scroll
- **Pulse dot:** `pulse-dot` class — for live indicators
- **Float animation:** `float-slow` (6s) / `float-fast` (4s)
- **Input style:** `input-nfstay` class — rounded-[10px], green focus ring

## Motion
- Transitions: 200–300ms only — never decorative or slow
- Accordion: 0.2s ease-out
- Respect `prefers-reduced-motion`

## Responsive
- **Mobile first:** style for 375px, then `sm:`, `md:`, `lg:`, `xl:`
- Breakpoints: sm=640px, md=768px, lg=1024px, xl=1280px, 2xl=1400px

## Hard rules
1. Never introduce new hex values — use existing CSS variables only
2. Never use inline styles — Tailwind classes only
3. Never use CSS modules
4. No Lorem Ipsum — use realistic UK property data
5. Every component must have: normal state, empty state, loading state, error state
6. Do NOT revert or overwrite existing styles unless the task explicitly requires it
