# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** PartyMaker
**Updated:** 2026-09-17 18:21 KST
**Category:** Wedding After-Party Live Show
**Design Dials:** Variance 8/10 (Bold / Asymmetric) | Motion 8/10 (Scene-driven) | Density 6/10 (Standard)

---

## Global Rules

### Color Palette

#### Core UI

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Deep background | `#07070C` | `--pm-ink-deep` |
| Background | `#0B0B14` | `--pm-ink` |
| Surface | `#181725` | `--pm-surface` |
| Foreground | `#F7F3E8` | `--pm-ivory` |
| Muted | `#A9A7B8` | `--pm-muted` |
| Guest/Admin action | `#D7FF3F` | `--pm-lime` |
| Alert/action | `#FF5D73` | `--pm-coral` |
| Focus | `#45D7FF` | `--pm-cyan` |

#### Main Screen wedding scene

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Champagne light | `#F2D492` | `--pm-wedding-champagne` |
| Blush | `#E7A6A1` | `--pm-wedding-blush` |
| Lavender | `#B9ADEB` | `--pm-wedding-lavender` |
| Sage status | `#A8C3A0` | `--pm-wedding-sage` |
| Moonlight | `#B8D8E8` | `--pm-wedding-moonlight` |
| Pearl highlight | `#F6F0E4` | `--pm-wedding-pearl` |

**Color Notes:** Dark live-show UI with a restrained midnight wedding garden on the beam screen. Do not use rose invitation backgrounds or neon rainbow lighting in the 3D scene.

### Typography

- **Heading Font:** Bricolage Grotesque Variable
- **Body Font:** Noto Sans KR Variable
- **Mood:** live show, confident, playful, legible at projector distance
- Never use wedding script fonts such as Great Vibes; PartyMaker is an operating surface, not an invitation.

### Spacing Variables

*Density: 6/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Guest `/guest`

- Purpose: QR → profile form → mission/poll controller.
- Keep all interactive controls as semantic HTML; never require WebGL to participate.
- Minimum touch target `44px`, visible focus, safe-area padding, no decorative scroll journey.

### Main Screen `/screen`

- Purpose: projector/TV show surface viewed from across the room.
- R3F Canvas is a decorative background. QR, copy, poll results and scores remain HTML overlays.
- Stage/Cue state controls camera, wedding lighting, particles and tree growth.
- Use champagne, blush, lavender, sage, moonlight and pearl; avoid oversaturated neon.
- DPR range `1–1.5`; lazy-load the scene only on `/screen`; provide reduced-motion and WebGL fallback.

### Admin `/admin`

- Purpose: MC and preparation committee show control.
- No WebGL. Prioritize current state, next cue, destructive-action clarity and one-hand operation.
- Keep the existing dark high-contrast action colors and fixed bottom transport controls.

### Shared controls

```css
.control {
  min-height: 44px;
  border: 1px solid var(--pm-border);
  border-radius: var(--pm-radius-md);
  background: var(--pm-surface);
  color: var(--pm-ivory);
  transition: border-color var(--pm-duration-base) var(--pm-ease-out);
}

.control:focus-visible {
  outline: 3px solid var(--pm-cyan);
  outline-offset: 3px;
}
```

---

## Style Guidelines

**Style:** Midnight Wedding Garden / Live Show Control

**Keywords:** sophisticated, nocturnal, champagne light, pearl, cinematic depth, readable, playful but not childish

**Surface rule:** The Guest phone is a controller, the Main Screen is the show, and Admin is an operational console. Do not turn PartyMaker into a promotional scroll website.

### Experience Pattern

- Guest: one continuous QR → form → game participation flow.
- Screen: Stage/Cue changes move one shared 3D garden camera and lighting system.
- Admin: explicit state and commands; no decorative 3D.
- The Screen scene must never obscure QR codes, prompts, answer totals or scores.

---

## Motion

**State-driven camera transition** — Trigger: authoritative Stage/Cue change | Duration: `1.25–1.45s` | Easing: `power3.inOut`

- GSAP animates Three.js camera position, target, tree growth and emissive color.
- Reveal may raise scene energy; routine version updates must not restart the whole scene.
- Geometry and material instances are created once, never inside `useFrame`.
- Use requestAnimationFrame through R3F; pause continuous rendering under reduced motion.
- Do not use ScrollTrigger on Guest, Screen or Admin. The live event advances through MC commands, not scrolling.

---

## Anti-Patterns (Do NOT Use)

- ❌ Generic templates
- ❌ No portfolio

### Additional Forbidden Patterns

- ❌ **Promotional scroll storytelling** — PartyMaker is an event tool, not a marketing homepage
- ❌ **WebGL on Guest/Admin** — keep phones and the operator console fast and reliable
- ❌ **Wedding invitation clichés** — no script fonts, rose paper backgrounds, rings or floral template ornaments
- ❌ **Unreadable 3D copy** — operational text and QR stay in HTML above the Canvas
- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
