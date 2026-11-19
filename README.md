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

[Explore the live samples](https://tijiang13.github.io/stage-js/).

## Get started

Open the [basic sample](sample_projects/basic/index.html) in a browser, or serve
the repository locally:

```bash
python3 -m http.server 8000
```

Visit [the basic deck](http://localhost:8000/sample_projects/basic/) or
[the advanced deck](http://localhost:8000/sample_projects/advance/).
The [multilingual sample](sample_projects/multilingual/index.html) adds in-place
English/Chinese switching.
Copy a sample folder inside `sample_projects/` and edit its `index.html` to start
your own deck. Ask your coding agent to update the slide content and theme, then
review the result in the browser.

Use the arrow keys to navigate and **F** for fullscreen. Before a talk, press **P**
to open the separate presenter window; share only the audience window.

## What is included

- A shared runtime with slide navigation, overview, appendices, and reading mode.
- A separate presenter window with notes, current/next previews, and a timer.
- Optional language switching within the same slides, with shared media and
  independently authored speaker notes.
- Shareable CSS themes, including light and dark slide layouts.
- Local images and videos, optional shared transport, grouped enlargement,
  comparable-example selection and playback coordination.
- Browser printing and a PDF export helper.
- A report theme and an agent skill for short meeting decks.

The basic sample is a four-slide starter. The advanced sample adds light/dark
layouts and appendices. Both use the same runtime and matching local media.

## Evidence-led reports

The [short meeting sample](sample_projects/report/index.html) uses four slides
to make a staffing decision. In the [matched replay](sample_projects/report/index.html#replay),
seek both timelines together to compare the same busy day under two staffing
plans. Then change demand or coverage in the [live forecast](sample_projects/report/index.html#coverage)
to see how many tickets would carry over. The figures are illustrative.

The [short meeting deck skill](skills/stage-report/SKILL.md) turns your notes and
evidence into a deck shaped around the audience, goal and speaking time. To
scaffold a deck yourself, pick the slide types you need and run the script from
the repository root.

```bash
python3 skills/stage-report/scripts/new-deck.py --list
python3 skills/stage-report/scripts/new-deck.py --pages cover,evidence,asks ~/reports/update
```

To let a coding agent use the skill, symlink the folder into the agent's skills
directory so it can still find the runtime, for example
`ln -s "$PWD/skills/stage-report" ~/.claude/skills/stage-report`, then ask for
"make a short deck for this week's meeting" and give it your notes. If you copy the folder
instead, set `STAGE_JS_HOME` to this repository.

## Documentation

- [Authoring](docs/authoring.md): slide markup, media, validation, PDF export, and sharing.
- [Presenting](docs/presenting.md): controls, shortcuts, notes, and presenter setup.
- [Themes](docs/themes.md): styling responsibilities, theme tokens, and responsive layouts.
- [Runtime](docs/runtime.md): project structure, component APIs, and playback policy.

## License and credits

Released under the [MIT License](LICENSE).

Co-authored with OpenAI Codex, with design guidance from
[Anthropic's Frontend Design Skill for Claude](https://github.com/anthropics/skills/tree/main/skills/frontend-design).
