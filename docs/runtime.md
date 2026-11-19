[Stage.js](../README.md) · [Authoring](authoring.md) · [Presenting](presenting.md) · [Themes](themes.md) · [Runtime](runtime.md)

# Runtime and components

## Project structure

```text
stage-js/                  Shared runtime only
  deck.js                  Slide state, navigation, modes and component coordination
  controls.js              Audience toolbar, slide overview and shortcut help
  media.js                 Shared playback intent, visibility and suspension
  i18n.js                  Optional same-slide audience language switching
  media-player.js           Optional shared transport and comparable-example selection
  media-player.css          Optional player geometry and hidden example states
  deck.css                 Canvas geometry and minimal accessible UI defaults
  presenter.js             Presenter synchronization, previews and timer
  presenter.css            Presenter layout with themeable UI tokens
  print.css                Pagination, hidden controls and media poster fallback
  media-viewer.js           Optional single/group image/video enlargement component
  media-viewer.css          Viewer geometry and themeable appearance
theme/
  basic.css                Minimal palette, typography and content layouts
  advance.css              Richer layouts, light/dark variants and UI decoration
  report.css               Report layouts: status chips, KPI tiles, tables, timelines
  interface.css            Shared control styling, imported by every theme
sample_projects/
  basic/                   Four-slide starter and local media
  advance/                 Five main slides, two appendices and local media
  report/                  Interactive meeting sample with a matched replay and live forecast
skills/
  stage-report/            Short meeting deck skill with scaffold and check scripts
tools/
  check-deck.py            Validate any deck
  export-pdf.sh            Export any deck to PDF
tests/                     Playback-policy regression tests
archive/                   Local historical reference; excluded from Git
README.md
```

## Coordination and playback policy

`StageDeck.getState()` returns the current `{ slide, mode, language }`.
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

## Optional evidence components

`media-player.js` mounts `[data-media-player]` and `[data-media-examples]` hooks.
Markup and load order are in [Authoring](authoring.md#optional-media-players-and-examples).
The source player always uses the shared media coordinator; it does not own
slide visibility or bypass suspension holds.

`StageDeck.media.getIntent(video)` reads an explicit playback choice, including
when an overlay temporarily pauses the source. `setAvailable(video, enabled)`
enables or disables a known source without replacing that choice; selectors use
it to disable hidden panels immediately. Both APIs apply only to media collected
from the deck at initialization.

`StageComponents.mountMediaPlayer(root, controller = StageDeck.media)` returns
`{ setPlaying, seek, destroy }` for a root with videos. A controller supplies
`getIntent(video)` and `setIntent(video, playing)`. The grouped viewer reuses the
transport with a controller for its temporary clones while holding source media
suspended. Destroy removes the generated controls and listeners.

Selectors emit bubbling `stage:contentchange` with `detail.slide` after changing
the selected example. Presenter refreshes its static preview; an enlarged source
that becomes hidden closes without resuming. This event changes slide content,
not slide sequencing. Print and presenter views show the current example with
posters and labels, without transport or selector controls.

Run `node --test tests/*.test.cjs` for coordinator policy tests. The optional
Playwright browser suite is `python3 tests/evidence-browser.py`; it uses a
synthetic local fixture and requires Python Playwright plus Chrome/Chromium.
It covers controls, selection, synchronization, enlargement, presenter updates,
reduced motion and print behavior without production data or services.

## Optional translations

Load `i18n.js` before the other scripts to enable a local
`script[type="application/json"][data-stage-i18n]` catalog. See
[Authoring](authoring.md#optional-audience-languages) for the schema and binding
markup. Without a catalog, the optional component is inactive and no language
selector appears.

`StageDeck.getState().language` reports the audience language.
`StageDeck.setLanguage(code)` returns false for an undeclared language or an
inactive component. It changes text and supported attributes in place, preserves
slide/media state, and writes `lang` into the current URL without changing its
hash or mode. `stage:languagechange` carries `{ language, previous }` after the
bindings are updated. A language change is not a slide-change event.

Components use `StageI18n.t(key, fallback)` for dynamic labels and
`StageI18n.apply(root)` to bind newly created UI. The default language is authored
in the DOM; missing messages fall back to that text. The component retains
canonical defaults so enlarged clones and later UI can switch back correctly.
It does not replace HTML containers, video sources or speaker notes. Presenter
previews and labels refresh while its timer and authored notes remain intact.

Run `python3 tests/i18n-browser.py` with Python Playwright and Chrome/Chromium for
same-node playback preservation, URL/fallback handling, open viewer and presenter
updates, unchanged notes, print and legacy-deck checks.
