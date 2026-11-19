[Stage.js](../README.md) · [Authoring](authoring.md) · [Presenting](presenting.md) · [Themes](themes.md) · [Runtime](runtime.md)

# Designing and sharing themes

## Framework versus theme

| Framework owns | Theme owns |
| --- | --- |
| Slide state, navigation, appendix sequencing | Colors, fonts, spacing and backgrounds |
| 16:9 canvas geometry and reading-mode scrolling | Cards, columns, diagrams and other content layouts |
| Control behavior, focus outlines and hidden states | Control decoration and visual emphasis |
| Media lifecycle, notes and presenter synchronization | Responsive reflow of slide content |
| Print pagination and poster substitution | Print typography and color choices |

Framework CSS provides neutral defaults so a deck remains usable without a theme.
Themes should not implement navigation, hide inactive slides, or replace the
canvas's positioning. `.slide-frame`, `.slide`, `.speaker-notes`, `.print-poster`,
and the UI hooks are stable framework classes.

Theme hooks include `--slide-padding`, `--stage-accent`, `--stage-read-bg`, and
`--stage-ui-bg`, `--stage-ui-ink`, `--stage-ui-line`, `--stage-ui-muted`,
`--stage-ui-surface`, `--stage-ui-hover`. The UI tokens are copied into Presenter
when it opens; slide previews load the original stylesheets. Presenter layout
is independent of slide-content selectors.

Use `.dark` in the basic theme or `.theme-light` / `.theme-dark` in the advanced
theme for per-slide appearance. These names are theme conventions, not runtime
modes. Theme-specific responsive content rules may override the default reading
layout; keep fixed presentation dimensions and print rules intact.

`theme/report.css` is a third theme for business reports: status chips, KPI tiles,
tables, timelines, bars and ask lists, with `.dark` for the cover. It also provides
composable comparisons, compact previews with diagrams, UI journeys, visible
findings and recording/result layouts. These classes express evidence
relationships; they do not prescribe equal columns or a fixed report agenda.
Its sizes and colors are tokens on `.slide` (`--accent`, `--t-*`, `--u`), so a deck
can rebrand it with a few overrides. The [report page types](../sample_projects/report/page-types.html)
demonstrate the layout markup.

All bundled themes import `theme/interface.css` for consistent controls. Include
that file when sharing a theme. Fonts use local system fallbacks, so there is no
external font service to load.
