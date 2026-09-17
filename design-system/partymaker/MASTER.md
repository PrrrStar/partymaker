# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** PartyMaker
**Updated:** 2026-09-17 20:57 KST
**Category:** Role-aware Wedding After-Party Live System
**Design Dials:** Guest density 5/10 | Admin density 8/10 | Screen motion 8/10

---

## Global Rules

### Color Palette

#### Core brand — projector safe

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Black | `#050505` | `--pm-brand-black` |
| Yanolja Orange | `#F54B1E` | `--pm-brand-orange` |
| White | `#FFFFFF` | `--pm-brand-white` |
| Secondary gray | `#8C8282` | `--pm-projector-gray` |
| Dark gray | `#1E1928` | `--pm-projector-dark` |

Yanolja Orange is sourced from the official Yanolja Brand Center: HEX `F54B1E`, RGB `245 75 30`, Pantone `2028C / 2028U`.

#### Surface application

| Surface | Background | Primary text | Accent |
|---------|------------|--------------|--------|
| Guest controller | `#F7F7F7` / `#FFFFFF` | `#111111` | `#F54B1E` |
| Admin show control | `#050505` / `#0E0E0E` | `#FFFFFF` | `#F54B1E` |
| Main Screen | `#050505` | `#FFFFFF` | `#F54B1E` |

**Color Notes:** Structure and density remain role-aware, but the visible brand palette is black, Yanolja Orange and white. Gray is supporting hierarchy only. Pastel lavender, blush, sky and sage may not carry critical projector information.

### Typography

- **Guest/Admin UI:** Noto Sans KR Variable; identifiers and version telemetry use system monospace.
- **Screen headline:** Bricolage Grotesque Variable with Noto Sans KR fallback.
- **Mood:** Guest is plain and friendly, Admin is precise, Screen is cinematic and legible at projector distance.
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
- Use white/light-gray surfaces, black text and Yanolja Orange for selection, focus and CTA.
- Keep all interactive controls as semantic HTML; never require WebGL to participate.
- Minimum touch target `44px`, visible focus, safe-area padding, no decorative scroll journey.

### Main Screen `/screen`

- Purpose: projector/TV show surface viewed from across the room.
- R3F Canvas is a decorative black/orange/white background. QR, copy, poll results and scores remain white/orange HTML overlays.
- Stage/Cue state controls camera, orange lighting, white particles and tree growth.
- DPR range `1–1.5`; lazy-load the scene only on `/screen`; provide reduced-motion and WebGL fallback.

### Admin `/admin`

- Purpose: MC and preparation committee show control.
- No WebGL. Prioritize current state, next cue, destructive-action clarity and one-hand operation.
- Use black panels, white information and Yanolja Orange for focus and active controls.

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

**Style:** Geunseong Sundae / Projector-safe Live Show

**Keywords:** black, Yanolja Orange, white, sharp contrast, compact control, cinematic depth, readable

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
