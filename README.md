# Chilperic Foko Kuate — professional portfolio

Static portfolio for Dr. Chilperic Armel Foko Kuate, organised around four connected professional pillars:

- Computational Scientist
- Multiscale Modeller
- Scientific Software Developer
- Applied Mathematics

The site is intentionally project-led rather than CV-led. `work.html` provides the evidence across FokoLab, multiscale C3/C4 modelling, metabolic dynamics, T-cell population modelling, publications, and theses. `cv.html` provides a concise web summary and points to one current professional CV.

## Current CV

- PDF: `assets/cv/professional_cv.pdf`
- LaTeX: `assets/cv/professional_cv.tex`
- Portrait: `assets/cv/profile_picture.png`
- FontAwesome vector icons: `assets/cv/icons/`

Compile the CV with XeLaTeX from `assets/cv/`:

```bash
xelatex -interaction=nonstopmode -halt-on-error professional_cv.tex
xelatex -interaction=nonstopmode -halt-on-error professional_cv.tex
```

## Local website preview

From the project directory, choose a free local port each time, for example:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8765/` in a browser.
