# nfstay Design Cheatsheet — hub.nfstay.com

> This file auto-loads in every Claude session for marketplace10.
> Follow these tokens exactly. Never introduce new hex values or random colours.
> Audited from live site via Playwright on 2026-03-23.

---

## Design Philosophy

nfstay uses a **clean, editorial, trust-first** aesthetic. Think premium property magazine, not SaaS dashboard. The style is characterised by:

- **Generous whitespace** — large section padding (88–140px vertical), wide margins
- **Minimal colour** — one accent colour (green), everything else is greyscale
- **Typographic hierarchy** — large bold headings, tight letter-spacing, serif italic for personality
- **Soft containers** — white cards on off-white backgrounds, thin borders, subtle shadows
- **Glass/frosted effects** — navbar uses `backdrop-filter: blur(12px)` with `rgba(255,255,255,0.92)`
- **No dark mode** — light only. The sign-in page has a dark panel but it's a feature panel, not a theme

---

## Colour Palette (10 colours only)

### Primary
| Name | Hex | RGB | Use |
|------|-----|-----|-----|
| **nfstay Green** | `#1E9A80` | `rgb(30, 154, 128)` | Buttons, checkmarks, active tabs, card top-borders, links, focus rings, progress bars |
| **Green Tint** | `#ECFDF5` | `rgb(236, 253, 245)` | Badge backgrounds, hover tints, very light green fills |

### Text
| Name | Hex | RGB | Use |
|------|-----|-----|-----|
| **Heading** | `#1A1A1A` | `rgb(26, 26, 26)` | Page headings (h1–h3), nav links, primary body text |
| **Logo Black** | `#0A0A0A` | `rgb(10, 10, 10)` | Logo text, sign-in headings, social login button text |
| **Button Black** | `#111111` | `rgb(17, 17, 17)` | Dark button backgrounds (e.g. hero "Get Started" on some variants) |
| **Body Grey** | `#6B7280` | `rgb(107, 114, 128)` | Subtitles, descriptions, secondary text, feature body copy |
| **Muted Grey** | `#9CA3AF` | `rgb(156, 163, 175)` | Strikethrough prices, placeholder text, disabled states |
| **Label Grey** | `#525252` | `rgb(82, 82, 82)` | Form labels (sign-in page) |
| **Hint Grey** | `#737373` | `rgb(115, 115, 115)` | Sign-in helper text ("or sign in with email", "Don't have an account?") |

### Backgrounds
| Name | Hex | RGB | Use |
|------|-----|-----|-----|
| **White** | `#FFFFFF` | `rgb(255, 255, 255)` | Cards, form inputs, navbar, modals |
| **Off-White** | `#F3F3EE` | `rgb(243, 243, 238)` | Page background, section fills, sign-in tab bar background |

### Borders
| Name | Hex | RGB | Use |
|------|-----|-----|-----|
| **Border** | `#E5E7EB` | `rgb(229, 231, 235)` | Card borders, divider lines, pricing list separators |
| **Border Warm** | `#E8E5DF` | `rgb(232, 229, 223)` | Sign-in card border, tab bar border (slightly warmer tone) |
| **Border Subtle** | `rgba(0,0,0,0.08)` | — | Homepage card borders, navbar border, very subtle separation |
| **Input Border** | `#E5E5E5` | `rgb(229, 229, 229)` | Form input borders, social login button borders |

---

## Typography

### Font Families
| Font | Use | Weights |
|------|-----|---------|
| **Inter** | Everything — body, headings, nav, buttons, labels, form inputs | 400, 500, 600, 700, 800, 900 |
| **Sora** | Logo only ("nf" box + "stay" text) | 400 (stay), 700 (nf) |
| **Playfair Display** | Accent italic text only (hero subheading: *"Find, negotiate and grow your portfolio"*) | 400 italic |

### Heading Scale (from live homepage)
| Element | Font Size | Weight | Letter Spacing | Line Height | Example |
|---------|-----------|--------|----------------|-------------|---------|
| Hero h1 | 46px | 500 | -1.4px | 53px | "Landlord-Approved Airbnb Properties" |
| Section h2 (large) | 48px | 700 | normal | normal | "Ready to find your first deal?" |
| Section h2 (medium) | 40px | 700 | normal | normal | "From first search to first profit" |
| Section h2 (small) | 34px | 700 | 0.34px | 39px | "What describes you?" |
| Subsection h2 | 24px | 700 | 0.24px | 28px | "Starting from scratch?" |
| Card h3 | 16–17px | 600 | 0.16px | 47px | "Academy first", "CRM pipeline" |
| Pricing title | 20px | 700 | normal | normal | "Full Access" |
| Step number | 56px | 900 | normal | normal | "01" |
| Step label | 11px | 700 | normal | normal | "DEAL MARKETPLACE" (uppercase) |

### Body Text Scale
| Context | Font Size | Weight | Colour |
|---------|-----------|--------|--------|
| Section body | 15px | 400 | Body Grey `#6B7280` |
| Nav links | 16px | 400 (desktop), 600 22px (mobile) | Heading `#1A1A1A` |
| Button text | 14–16px | 500–600 | White or Heading |
| Form labels | 14px | 500 | Label Grey `#525252` |
| Form inputs | 14px | 400 | Logo Black `#0A0A0A` |
| Small helper text | 14px | 400 | Hint Grey `#737373` |
| Badge text | 11–12px | 600–700 | nfstay Green or Heading |

---

## Layout & Spacing

### Containers
| Container | Max Width | Horizontal Padding | Use |
|-----------|-----------|-------------------|-----|
| Nav container | 1280px | 0 | Top navigation |
| Main content | 1680px | 0 | Full-width sections |
| Timeline/step sections | 1000px | 24px, margin 0 140px | Narrower content sections |
| Sign-in form | ~480px (implicit) | 25px | Auth form card |

### Section Padding
| Section Type | Vertical Padding |
|-------------|-----------------|
| Hero | 88px top, 0 bottom |
| Standard section | 96px top and bottom |
| Feature section (large) | 140px top and bottom |
| Section margins | 16px horizontal (with rounded corners) |

### Grid
- 4px / 8px increments — never arbitrary margins
- Gap between cards: 16–24px
- Gap between UI elements: 6–12px

---

## Components

### Navbar
- **Position:** Fixed, top
- **Background:** `rgba(255,255,255,0.92)` with `backdrop-filter: blur(12px)` (frosted glass)
- **Border:** None (clean edge)
- **Logo:** Sora 700 "nf" inside a 2px `#0A0A0A` rounded box (border-radius 8px) + Sora 400 "stay", letter-spacing 2px

### Buttons
| Type | Background | Text | Border Radius | Padding | Font |
|------|-----------|------|---------------|---------|------|
| Primary CTA (green) | `#1E9A80` | White | 14–16px | 13–14px 16–40px | Inter 500–600, 14–16px |
| Secondary (outline) | White | Heading | 10–12px | 10px 20px | Inter 500, 15px |
| Secondary (outline) | Transparent | `#0A0A0A` | 9999px (pill) | 8px 12px | Inter 500, 15px |
| Dark CTA | `#111111` | White | 16px | 13px 16px | Inter 500, 14px |
| Tab (active) | White | nfstay Green | 8–10px | 8px 10px | Inter 500, 12px |
| Tab (inactive) | Transparent | Body Grey | 8–10px | 8px 10px | Inter 500, 12px |
| Green shadow CTA | `#1E9A80` | White | 14px | 14px 40px | Inter 600, 16px, with `box-shadow: rgba(30,154,128,0.35) 0 4px 16px` |

### Cards
| Property | Value |
|----------|-------|
| Background | White `#FFFFFF` |
| Border | `1px solid #E8E5DF` or `1px solid rgba(0,0,0,0.08)` |
| Border radius | 12–16px |
| Shadow (default) | `rgba(0,0,0,0.08) 0 4px 24px -2px` or none |
| Shadow (hover) | `rgba(0,0,0,0.1) 0 8px 32px` |
| Green accent | 3–4px solid green top border on feature cards |
| Padding | 16–24px |

### Form Inputs (sign-in page)
| Property | Value |
|----------|-------|
| Background | White |
| Border | `1px solid #E5E5E5` |
| Border radius | 10px |
| Padding | 4px 12px (with icon indent ~40px left) |
| Font | Inter 400, 14px |
| Focus ring | nfstay Green |

### Checkmarks (pricing)
- Colour: `#1E9A80`
- Size: ~16px
- Used in feature lists with a light divider between each item

### Badges / Pills
| Type | Background | Text | Border Radius | Padding |
|------|-----------|------|---------------|---------|
| Section badge | Green Tint `#ECFDF5` | nfstay Green `#1E9A80` | 100px (pill) | 5px 14px |
| Step label | White or transparent | Heading, uppercase, 11px 700 | — | — |
| Featured badge | nfstay Green | White, 7px 600 | 4px | 2px 5px |

---

## Shadows
| Name | Value | Use |
|------|-------|-----|
| Card default | `rgba(0,0,0,0.08) 0 4px 24px -2px` | Standard cards |
| Card hover | `rgba(0,0,0,0.1) 0 8px 32px` | Hovered cards |
| Subtle | `rgba(0,0,0,0.04) 0 2px 8px` | Light elevation |
| Green glow | `rgba(30,154,128,0.35) 0 4px 16px` | Green CTA buttons |
| Green soft glow | `rgba(30,154,128,0.2) 0 4px 12px` | Secondary green elements |
| Input shadow | `rgba(0,0,0,0.05) 0 4px 8px -1px` | Sign-in button |
| Glass inset | `rgba(30,154,128,0.06) 0 4px 24px, rgba(255,255,255,0.8) 0 1px 0 inset` | Glass card with green tint |

---

## Motion
- Transitions: 200–300ms only — never decorative or slow
- Accordion: 0.2s ease-out
- Respect `prefers-reduced-motion`
- Card hover: `translateY(-1px)` + shadow change

---

## Patterns
- **Card hover:** `card-hover` class — subtle shadow + green border tint + translateY(-1px)
- **Skeleton loading:** `skeleton-shimmer` class — animated shimmer gradient
- **Scroll reveal:** `scroll-reveal` + `.revealed` — fade-up on scroll
- **Pulse dot:** `pulse-dot` class — for live indicators
- **Float animation:** `float-slow` (6s) / `float-fast` (4s)
- **Input style:** `input-nfstay` class — rounded-[10px], green focus ring
- **Glass navbar:** fixed + white 92% opacity + blur(12px)
- **Section separation:** off-white bg sections alternate with white bg sections; some sections have 16px horizontal margin with rounded corners

---

## Sign-In Page Specifics

The sign-in page is a **split layout**:
- **Left half:** White card (`border-radius: 24px`, `border: 1px solid #E8E5DF`) containing the form
- **Right half:** Dark feature panel (dark green/teal gradient) with stats and selling points
- **Page background:** `#F9FAFB` (slightly cooler than homepage off-white)

### Sign-in form structure
1. Logo (Sora, same as navbar)
2. Tab bar: "Sign In | Register" — off-white `#F3F3EE` background, `border-radius: 12px`, active tab is white with shadow
3. Social login buttons: pill-shaped (`border-radius: 9999px`), `border: 1px solid #E5E5E5`, transparent bg
4. Divider: "or sign in with email" — Hint Grey `#737373`
5. Form labels: Label Grey `#525252`, 14px 500
6. Inputs: white bg, `border: 1px solid #E5E5E5`, `border-radius: 10px`
7. Checkbox: nfstay Green bg when checked
8. "Forgot Password?" link: nfstay Green `#1E9A80`, 14px 500
9. Submit button: nfstay Green bg, white text, `border-radius: 10px`, subtle shadow
10. Footer: "Don't have an account? **Sign up**" — Hint Grey + nfstay Green link

---

## Responsive
- **Mobile first:** style for 375px, then `sm:`, `md:`, `lg:`, `xl:`
- Breakpoints: sm=640px, md=768px, lg=1024px, xl=1280px, 2xl=1400px
- Sign-in: stacks vertically on mobile (form only, dark panel hides)
- Homepage: hero text scales down, cards stack to single column

---

## Component Library
- **Always use shadcn/ui first** — 39+ primitives already installed
- **Icons:** Lucide React only — no other icon libraries
- **Conditional classes:** use `cn()` from `@/lib/utils`
- **Never hand-edit** files in `src/components/ui/` — those are shadcn-managed

---

## Hard Rules
1. Never introduce new hex values — use the 10 brand colours above only
2. Never use inline styles — Tailwind classes only
3. Never use CSS modules
4. No Lorem Ipsum — use realistic UK property data
5. Every component must have: normal state, empty state, loading state, error state
6. Do NOT revert or overwrite existing styles unless the task explicitly requires it
7. Green is the ONLY accent colour — no purples, blues, ambers, reds (except for semantic error/warning states in app UI)
