# Frontend Design Notes

- **Trend references**: 2026 web design trends continue the push for immersive gradients, bold typography, and transparent glassmorphism layers. Palette anchored on Pantone Color of the Year 2026 “Cloud Dancer” (11-4201), an airy off-white that pairs well with deep ink backgrounds and neon accents for contrast. citeturn2search0turn2search1
- **Palette**
  - Cloud Dancer: `#F1F0EC` (primary accent / highlights)
  - Ink background: `#0E1729`
  - Teal glow: `#24E0A1` for CTAs and focus states
  - Amber accent: `#FFB347` for warnings/degraded states
- **Typography**: Space Grotesk for modern, geometric letterforms.
- **Layout**: Single-page marketing + dashboard teaser with hero, stat cards, table preview, and feature tiles. Responsive grid using CSS grid/flex.
- **Motion**: Subtle hover elevation on buttons; gradients give depth without heavy animations (keep LCP fast).
- **Dark/Light**: Current build is dark-forward with high contrast; palette supports light mode by inverting background to Cloud Dancer and using ink for text (future toggle).
- **Components present**: Hero CTA, stats, table preview for watchers, feature tiles, footer. Buttons wired for future routing.
