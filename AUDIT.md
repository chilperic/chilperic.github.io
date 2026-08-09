# Portfolio audit — final review

## Positioning

The previous site diluted the professional identity by repeating “scientific developer” and “computational tool developer” and by presenting multiple competing CV narratives. The final version uses one evidence-backed profile throughout:

**Computational Scientist · Multiscale Modeller · Scientific Software Developer · Applied Mathematics**

Each pillar is mapped to a restrained orientation colour and supported by concrete work rather than generic claims.

## Information architecture

- Home: professional proposition → four strengths → selected evidence.
- Work: scientific software → multiscale plant physiology → metabolic/nonlinear dynamics → stochastic population modelling → publications.
- CV: one current professional CV with a concise web summary and PDF/LaTeX downloads.
- Contact: direct professional channels without duplicate biography.

FokoLab is described as a scientific modelling platform for user-defined problems. The model atlas and examples are framed as starting points rather than the purpose of the product.

## Scientific and factual consistency

- PhD research period: Aug 2019–Aug 2022; degree 2019–2023, defended March 2023.
- Postdoctoral period: Nov 2022–Oct 2025.
- Independent computational-science/software work: Nov 2025–Present.
- German: B1+; B2 Berufssprachkurs in progress, exam expected Nov 2026.
- Metabolic Engineering author list corrected to Wilken, Besançon, Kratochvíl, Foko Kuate, Trefois, Gu, Ebenhöh.
- Bioscience Reports title aligned to “Kinetic data for modeling the dynamics of the enzymes involved in animal fatty-acid synthesis.”
- Bayer B4U mentoring described as completed in 2025.

## UX and accessibility

- Sticky, four-item navigation with a persistent Home destination.
- Responsive one-column layouts below tablet width; compact identity labels become full-width on small phones.
- Minimum 44 px primary button height and visible keyboard focus state.
- Meaningful image alternative text; decorative brand icon uses empty alt text.
- Reduced-motion preference disables transition and smooth-scroll effects.
- Colour is used as orientation, never as the only carrier of content.

## Validation performed

- Updated CV compiled twice with XeLaTeX to a two-page A4 PDF.
- Both CV pages rendered to PNG and visually inspected for clipping, overlap, balance, and legibility.
- 73 local HTML references were checked; no missing local files or anchors were found.
- Duplicate HTML IDs: none found.
- Images without `alt`: none found.
- `_blank` links without `rel="noopener"`: none found.

Headless browser screenshot QA was attempted, but this runtime does not include the Playwright Chromium executable. The site remains plain static HTML/CSS with no JavaScript runtime dependency.
