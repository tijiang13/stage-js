---
name: stage-report
description: Build or revise a short interactive HTML meeting deck with Stage.js. Use when the user needs to share progress, explain a finding, or get a decision in a short meeting.
---

# Short meeting decks

Use the meeting goal, audience and speaking time to decide what belongs on the
screen. Start from the user's notes, existing deck and available evidence. Ask
only for missing information that would change what the audience sees or decides.

1. **Choose the story.** Lead with the result or decision the audience came for.
   Give each slide one job and write headlines that tell the story on their own.
   Use the fewest slides the story and speaking time call for. Add a cover,
   next steps or an ask when it serves the meeting.
2. **Plan the live walkthrough.** Before choosing layouts, decide what the
   presenter can show by clicking, switching or scrubbing, and what the audience
   will learn from the action. Scrub matched recordings together to show when
   results diverge, switch between comparable examples to see whether a finding
   holds, or use a simple control to show how a result changes with one input.
   When adapting existing slides, use their claims and evidence to design the
   walkthrough. Give each interaction a clear label and a starting view that
   already makes the main point.
3. **Show the evidence.** Choose a real number, screenshot, plot or short clip
   that supports each key claim. Compare the same input and interval and keep
   baseline and result labels visible. Say what is still unknown when it matters
   to the decision. Put interpretation and caveats in speaker notes if needed.
4. **Build the deck.** Use `sample_projects/report/index.html` as an example of
   a short live walkthrough. Revise an existing deck in place when requested.
   When scaffolding, replace placeholder copy and media with the user's content.
   Keep their language and meeting format.

Run the scaffold from the Stage.js repository root with the page types the
story needs. Use `--list` to see the options. Choose a new destination folder.

```bash
python3 skills/stage-report/scripts/new-deck.py --pages cover,comparison,asks path/to/deck
python3 skills/stage-report/scripts/check-report.py path/to/deck/index.html
```

Rehearse at presentation size. Check readability, run each planned interaction,
and confirm it reveals the intended evidence and leaves the presenter ready to
continue. Return the deck path and mention any missing evidence that affects
what the audience can conclude.
