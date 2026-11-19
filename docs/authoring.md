[Stage.js](../README.md) · [Authoring](authoring.md) · [Presenting](presenting.md) · [Themes](themes.md) · [Runtime](runtime.md)

# Authoring a deck

Run the commands below from the repository root. Start by copying
`sample_projects/basic/` or `sample_projects/advance/` to another folder inside
`sample_projects/`, preserving the relative links to the runtime and themes.

## One runtime, one contract

Starter samples load the same files in this order:

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
Bundled themes import `theme/interface.css` for consistent controls. Their
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
only when using enlargement. Optional media-player files provide shared transport
and comparable-example selection.

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
appears on hover or keyboard focus; on touch devices it stays visible. By default
video clicks retain native playback behavior; use Expand to enlarge.
Add `data-media-click-expand` on a marked frame to make video clicks enlarge
instead, and use the shared transport rather than overlapping native controls.
Unmarked media is unchanged. The script does nothing when no marked frames exist.

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

## Optional media players and examples

Load `stage-js/media-player.css` before the theme and `stage-js/media-player.js`
after `deck.js`, before `media-viewer.js`. Decks without these hooks keep their
existing behavior. A player generates accessible play/pause, replay, seeking and
speed controls for one video or an aligned group:

```html
<div class="comparison" data-media-player data-media-zoom="group" data-media-click-expand>
  <figure class="media-card">
    <figcaption>Baseline</figcaption>
    <div class="media-frame">
      <video muted loop playsinline data-autoplay preload="metadata" poster="assets/baseline.jpg">
        <source src="assets/baseline.mp4" type="video/mp4">
      </video>
      <img class="print-poster" src="assets/baseline.jpg" alt="Baseline result">
    </div>
  </figure>
  <figure class="media-card">
    <figcaption>Result</figcaption>
    <div class="media-frame">
      <video muted loop playsinline data-autoplay preload="metadata" poster="assets/result.jpg">
        <source src="assets/result.mp4" type="video/mp4">
      </video>
      <img class="print-poster" src="assets/result.jpg" alt="Improved result">
    </div>
  </figure>
</div>
```

Align source inputs, time origin and intervals before grouping. The player shares
transport, speed and timeline, corrects playback drift and uses the shortest
finite duration. It does not infer offsets or repair unmatched evidence. Use
matching durations; the report browser check flags discrepancies. Prefer the
shared transport without native controls for a comparison. Single-video players
use the same hook; single-media enlargement retains native viewer controls.

`data-media-zoom="group"` enlarges all marked-frame media together, retaining each
figure's caption and playback state. Video groups require the player component.
Groups of still images also work. Do not nest separately marked zoom frames
inside a grouped frame. Navigation closes the viewer; off-slide and hidden
example media remain paused.

For interchangeable examples, wrap panels and buttons:

```html
<div data-media-examples>
  <div class="media-example-picker presentation-ui" role="group" aria-label="Choose comparison">
    <button type="button" data-media-select="first" aria-pressed="true">First example</button>
    <button type="button" data-media-select="second" aria-pressed="false">Second example</button>
  </div>
  <div data-media-example="first">… labelled comparison player …</div>
  <div data-media-example="second" hidden>… another matched comparison …</div>
</div>
```

Give each panel a distinct value. The component sets `aria-controls`, hidden
states and `aria-pressed`. Switching preserves whether the outgoing example
intended to play and keeps the incoming example's position; Replay starts it
from zero. Hidden clips are disabled immediately without waiting for intersection
observers. Keep one explicit comparison meaning across examples.

The selected example is the static presenter and PDF representation. Controls
are removed from presenter previews and print; videos use their posters.
Selection refreshes an already-open presenter window. Include posters and
labels for every example. If another example must appear in a circulated PDF,
make it visible as its own evidence rather than relying on an unavailable tab.

## Optional audience languages

The [multilingual sample](../sample_projects/multilingual/index.html) switches
language within the same slides and recording. Add local translation data and
load `i18n.js` before the other runtime scripts:

```html
<h2 data-i18n="result.title">The measured result</h2>
<img src="assets/process-en.svg" alt="Evaluation process"
     data-i18n-attr="src:asset.process;alt:process.alt">
<script type="application/json" data-stage-i18n>
{
  "default": "en",
  "languages": { "en": "EN", "zh-CN": "中文" },
  "messages": {
    "zh-CN": {
      "result.title": "实测结果",
      "asset.process": "assets/process-zh.svg",
      "process.alt": "评估流程"
    }
  }
}
</script>
<script src="stage-js/i18n.js"></script>
<!-- presenter.js, controls.js, media.js and deck.js follow as usual. -->
```

Use `data-i18n` on text-only elements, not containers with images, controls or
other markup. Split mixed content into labelled spans. Missing translations use
the authored default, and messages render as plain text. Attribute bindings are
semicolon-separated `attribute:key` pairs. Supported attributes are `alt`,
`title`, `aria-label`, `data-title`, `data-section`, metadata `content`, and image
`src`. Video/audio/source URLs are never replaced by a translation.

The runtime adds a language selector when multiple languages are declared.
`?lang=zh-CN#result` selects a shareable initial language;
`StageDeck.setLanguage('zh-CN')` changes it without reloading. Slide IDs, selected
examples, video elements, play/pause intent, position and speed remain in place.
Overview, controls, open media captions and presenter previews follow the selected
language. Browser print uses that language. Speaker notes remain exactly as
authored, independently of the audience language.

English UI labels are the fallback; the optional component includes Simplified
Chinese controls. Other languages can provide their own UI messages. Inspect
`stage-js/i18n.js` for the UI keys. Keep translated diagram variants local and
retain original captured screenshots and recordings unless genuine translated
source captures are available. Translated captions can explain unchanged media.

Check each language, including text inside diagrams and the selected example:

```bash
python3 skills/stage-report/scripts/check-browser.py path/to/index.html --language zh-CN --output /tmp/deck-zh-review
```
