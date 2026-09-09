[Stage.js](../README.md) · [Authoring](authoring.md) · [Presenting](presenting.md) · [Themes](themes.md) · [Runtime](runtime.md)

# Authoring a deck

Run the commands below from the repository root. Start by copying
`sample_projects/basic/` or `sample_projects/advance/` to another folder inside
`sample_projects/`, preserving the relative links to the runtime and themes.

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
