# Stage.js

A dependency-free HTML presentation framework. Both samples use the same runtime,
slide structure, presenter window and print rules; themes supply their design.

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

Open [basic](sample_projects/basic/index.html) or
[advance](sample_projects/advance/index.html) directly in a browser. No build step
is needed. Alternatively, run `python3 -m http.server 8000` in the repository root
and visit `/sample_projects/basic/` or `/sample_projects/advance/` on that server.

## One runtime, one contract

Both samples load the same files in this order:

```html
<link rel="stylesheet" href="../../stage-js/deck.css">
<link rel="stylesheet" href="../../theme/basic.css">
<link rel="stylesheet" href="../../stage-js/print.css" media="print">
<!-- Slide content goes here. The library creates its own UI. -->
<script src="../../stage-js/presenter.js"></script>
<script src="../../stage-js/controls.js"></script>
<script src="../../stage-js/media.js"></script>
<script src="../../stage-js/deck.js"></script>
```

Change only the theme link for a different design. Themes may define additional
content classes; preserve or adapt those classes when reusing their layouts.
Both bundled themes import `theme/interface.css` for consistent controls. Their
color tokens remain independent. Typography uses locally available fonts, with
system fallbacks; no font service or network connection is required.

```html
<main class="deck" id="deck">
  <section class="slide-frame" id="slide-1" data-title="Introduction"
           data-section="Overview" data-source-slides="sample">
    <article class="slide">
      <h1>Your message</h1>
      <aside class="speaker-notes">Your talking points.</aside>
    </article>
  </section>
</main>
```

`controls.js` creates the audience toolbar, slide overview and shortcut help.
Do not copy framework UI into sample HTML. It uses the document title for the
overview heading and slide metadata for labels. A new deck needs only its slide
markup, theme, and the scripts above. Include the optional media-viewer files
only when using enlargement.

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

## Controls — both samples

The audience toolbar contains Previous, Next, Overview and Fullscreen. Fullscreen
shows an enter/exit icon and follows the browser's fullscreen state, including Escape.
Overview shows slide navigation only, with reading mode in its footer. It never
renders speaker notes or a Presenter launch action. There is no More menu.
Overview and enlargement use native dialogs to contain focus. Desktop controls
recede when idle; touch controls remain visible. Keyboard shortcuts remain available.

- Arrow keys, PageUp / PageDown, Space: previous / next.
- Home / End: first / last main slide.
- P: open Presenter; F: fullscreen; Esc: exit fullscreen or dismiss panels.
- O: overview; N: open or focus the separate presenter window for notes; R: reading mode; ?: shortcut help.

Append `?mode=read` to open reading mode directly; use a slide hash for deep links.
Add `data-appendix="true"` to a frame to place it outside main sequential navigation.
Next stops at the main closing slide. Overview and Presenter can open appendices;
reading mode and manual scrolling can also expose them.

Before the talk, press P to open Presenter (N is an alias for accessing notes).
These shortcuts open or focus the separate speaker window; they never reveal notes
in the audience window. Allow pop-ups for Presenter. Share only the audience window and keep Presenter on
your own display. It includes current/next previews, notes, slide selection, and a
start/pause/reset timer. Closing it leaves the deck running; reloading or closing
the audience window ends its presenter session.

## Media, checks and sharing

Both samples bundle an original, reusable four-second silent H.264 animation
(960 × 540, 24 fps) and a JPEG of its first frame. Replace the image, video source,
poster, and print-poster paths together when using your own media.
Autoplay clips use `muted loop playsinline data-autoplay`; omit `data-autoplay`
for manual playback. Supply `poster` and a matching `.print-poster` image.
Reduced-motion preferences disable autoplay. Leaving slides pauses media.
Presenter previews use static posters.

```bash
python3 tools/check-deck.py sample_projects/basic/index.html
python3 tools/check-deck.py sample_projects/advance/index.html
```

Browser print exports fixed 16:9 pages. The shared export utility requires
`google-chrome` or `chromium` on PATH and GNU-compatible `realpath -m`:

```bash
bash tools/export-pdf.sh sample_projects/basic/index.html
bash tools/export-pdf.sh sample_projects/advance/index.html output/advance.pdf
```

Without an output argument, it writes a PDF alongside the input HTML, using the
same filename stem (for example, `index.pdf`). Validate layout in print preview.

To create a project, copy a sample folder inside `sample_projects/`. To share it
separately, include `stage-js/`, the chosen theme and `theme/interface.css`, preserving relative
paths or updating the links. Each sample contains its own local media.


## Optional media viewer

Load `stage-js/media-viewer.css` before the theme and `stage-js/media-viewer.js`
after the deck script. Enable enlargement on selected frames:

```html
<div class="media-frame" data-media-zoom>
  <img src="assets/example.jpg" alt="Description of the image">
</div>
```

The same attribute works with a video and its poster. Images open on click;
an accessible Expand button works for both images and videos. On desktop it
appears on hover or keyboard focus; on touch devices it stays visible. Video clicks retain
native playback behavior, so use Expand to enlarge a video. Unmarked media is
unchanged. The script does nothing when no marked frames exist.

The modal viewer supports Escape, a close button, backdrop dismissal and native
focus containment. It restores focus to Expand when closed. Opening suspends slide playback through the shared coordinator; video position,
volume, speed and play/pause state carry back to the source on close. Navigating
to another slide closes the viewer without resuming the hidden source. Printing
suspends playback and closes overlays; eligible slide media may resume after
printing. Media paused by the user stays paused. The runtime emits `stage:slidechange` with `event.detail.slide` for
components that need to respond to navigation. Keyboard slide shortcuts are
suspended while this viewer is open.

The viewer uses the existing `--stage-ui-*` and `--stage-accent` theme tokens.
Its buttons and dialog are excluded from print and presenter slide previews.


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
