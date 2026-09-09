# Stage.js

HTML presentations that people and coding agents can work on together.
No build step, runtime dependencies, or external services required.

## Why HTML?

A presentation can be source code. A coding agent can read a deck's HTML, edit
its content and CSS, preview it in a browser, and check the result using the same
tools it uses to build software. Changes are plain-text Git diffs that you can
review, version, and collaborate on.

PowerPoint is proprietary software, with an authoring workflow centered on its
editor. Stage.js uses HTML, CSS, and JavaScript directly: content, design, and
behavior are inspectable and editable without a specialized presentation editor.
This makes the deck a natural part of an agent-assisted coding workflow.

## Get started

Open the [basic sample](sample_projects/basic/index.html) in a browser, or serve
the repository locally:

```bash
python3 -m http.server 8000
```

Visit [the basic deck](http://localhost:8000/sample_projects/basic/) or
[the advanced deck](http://localhost:8000/sample_projects/advance/).
Copy a sample folder inside `sample_projects/` and edit its `index.html` to start
your own deck. Ask your coding agent to update the slide content and theme, then
review the result in the browser.

Use the arrow keys to navigate and **F** for fullscreen. Before a talk, press **P**
to open the separate presenter window; share only the audience window.

## What is included

- A shared runtime with slide navigation, overview, appendices, and reading mode.
- A separate presenter window with notes, current/next previews, and a timer.
- Shareable CSS themes, including light and dark slide layouts.
- Local images and videos, optional enlargement, and playback coordination.
- Browser printing and a PDF export helper.

The basic sample is a four-slide starter. The advanced sample adds light/dark
layouts and appendices. Both use the same runtime and matching local media.

## Documentation

- [Authoring](docs/authoring.md): slide markup, media, validation, PDF export, and sharing.
- [Presenting](docs/presenting.md): controls, shortcuts, notes, and presenter setup.
- [Themes](docs/themes.md): styling responsibilities, theme tokens, and responsive layouts.
- [Runtime](docs/runtime.md): project structure, component APIs, and playback policy.
