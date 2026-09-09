[Stage.js](../README.md) · [Authoring](authoring.md) · [Presenting](presenting.md) · [Themes](themes.md) · [Runtime](runtime.md)

# Presenting

## Audience controls

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
