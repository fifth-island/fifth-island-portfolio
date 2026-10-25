# ~/joao · portfolio

Personal site of **João Victor Quintanilha**: software engineer building AI systems that turn raw signals (AR-glasses captures, sperm whale clicks, sensor streams) into software people use.

**Live:** https://fifth-island.github.io/fifth-island-portfolio/

## What's in it

| Section | What it does |
|---|---|
| hero | A canvas of oscilloscope traces carrying little click trains. Move the cursor and the noise resolves into clean signal. |
| `.readme` | Story, numbers and honors. |
| `.work` | Dimenso, with an animated capture → event log → attribution → records pipeline, plus Tesla and DLR. |
| `.research` | DCCE (DCASE 2026). A coda player: pick a coda type, see its rhythm and spectral channels and where the fused embedding lands, and hear synthesised clicks. |
| `.lab` | FORM, my training journal, as an ongoing data project: the capture → label → measure → rank → review → plan method, real session-demand and weekly-score charts, and the plan to move from rules to statistics and ML. |
| `.projects` | Filterable grid. Every cover is drawn in code to echo the project's data; a live list of recently pushed repos comes from the GitHub API. |
| `.log` | Career rendered as `git log --graph` across engineering, research, design and community branches. |
| `.stack` / contact | Tools, and a one-click email copy. |

Press <kbd>⌘K</kbd> (or <kbd>/</kbd>) anywhere for a command palette. Try `coda`.

## Stack

Plain HTML, CSS and ES-module JavaScript. No build step, no frameworks, no dependencies: it is served as-is by GitHub Pages.

```
index.html      page structure
styles.css      all styling (tokens at the top)
js/data.js      ← all content: projects, career commits, stack, honors
js/main.js      wiring: nav, projects + modal, palette, GitHub feed, contact
js/signal.js    hero canvas
js/covers.js    generative project covers
js/coda.js      research coda player (WebAudio)
js/gitlog.js    career git graph
js/lab.js       FORM charts (session demand, weekly score)
```

To add a project or a role, edit `js/data.js` only.

Run locally with any static server, e.g. `python3 -m http.server` and open http://localhost:8000.
