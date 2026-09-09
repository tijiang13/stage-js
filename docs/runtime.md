[Stage.js](../README.md) · [Authoring](authoring.md) · [Presenting](presenting.md) · [Themes](themes.md) · [Runtime](runtime.md)

# Runtime and components

## Project structure

```text
stage-js/                  Shared runtime only
  deck.js                  Slide state, navigation, modes and component coordination
  controls.js              Audience toolbar, slide overview and shortcut help
  media.js                 Shared playback intent, visibility and suspension
  deck.css                 Canvas geometry and minimal accessible UI defaults
  presenter.js             Presenter synchronization, previews and timer
  presenter.css            Presenter layout with themeable UI tokens
  print.css                Pagination, hidden controls and media poster fallback
  media-viewer.js           Optional image/video enlargement component
  media-viewer.css          Viewer geometry and themeable appearance
theme/
  basic.css                Minimal palette, typography and content layouts
  advance.css              Richer layouts, light/dark variants and UI decoration
  interface.css            Shared control styling, imported by both themes
sample_projects/
  basic/                   Four-slide starter and local media
  advance/                 Five main slides, two appendices and local media
tools/
  check-deck.py            Validate any deck
  export-pdf.sh            Export any deck to PDF
tests/                     Playback-policy regression tests
archive/                   Local historical reference; excluded from Git
README.md
```

## Coordination and playback policy

`StageDeck.getState()` returns the current `{ slide, mode }`.
`StageDeck.goTo(id)` and `StageDeck.step(direction)` navigate without duplicating
slide sequencing. The runtime emits `stage:slidechange` only when the active slide
changes. Programmatic navigation is immediate so scroll animation cannot select
intermediate slides or briefly start their media.

An overlay component calls `StageDeck.acquireOverlay(closeCallback)` and saves
the returned release function. While held, slide shortcuts and slide-media
playback are suspended. Navigation closes overlays through their callbacks;
components must call their release function on close. Holds compose, so one
component cannot resume playback while another still needs it paused.

`StageDeck.media.setIntent(source, playing)` transfers an explicit playback choice
back from a component such as the media viewer. The coordinator is the sole owner
of slide-media playback: it requires the active slide, at least 45% media visibility,
a visible document, and no suspension holds. Manual clips do not restart when
returning to a slide. Reduced motion disables automatic playback but users can
still explicitly play a clip. Overview resumes only media that intended to play
before it opened. Components do not inspect each other's DOM to decide playback.

Run playback-policy regression tests with `node --test tests/media.test.cjs`.
Browser checks still cover actual focus, layout, dialogs, native media and presenter
integration; automated policy tests do not simulate a video decoder or printing.
