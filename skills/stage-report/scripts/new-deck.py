#!/usr/bin/env python3
"""Create a report deck by picking page types from the report templates.

    python3 new-deck.py --list
    python3 new-deck.py --pages cover,comparison,asks path/to/new-deck
    python3 new-deck.py --pages cover,workflow sample_projects/my-deck --link

Page types live in sample_projects/report/page-types.html, one slide each. An entry
may rename the slide ID and move it to the appendix:

    list=shipped            page type "list", slide id "shipped"
    risks=open-issues@appendix

By default the new folder is self-contained: it gets its own copy of the
Stage.js runtime and the report theme. With --link the deck points at the
runtime in the Stage.js repository instead.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
PAGE_TYPES = Path("sample_projects/report/page-types.html")
SAMPLE_PREFIX = "../../"  # report templates -> repository root
FRAME = re.compile(r'[ \t]*<section\s+class="slide-frame"\s+id="([^"]+)".*?</section>\n', re.S)


def stage_root() -> Path:
    candidates = [Path(os.environ["STAGE_JS_HOME"])] if os.environ.get("STAGE_JS_HOME") else []
    candidates.append(SKILL.parent.parent)
    for root in candidates:
        if (root / "stage-js" / "deck.js").is_file() and (root / PAGE_TYPES).is_file():
            return root.resolve()
    raise SystemExit(
        f"Cannot find the Stage.js repository (stage-js/deck.js and {PAGE_TYPES}).\n"
        "Keep this skill inside the repository (symlink it into your skills folder\n"
        "rather than copying it), or set STAGE_JS_HOME to the repository path."
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a report deck from page types.")
    parser.add_argument("dest", nargs="?")
    parser.add_argument("--pages", help="comma-separated page types")
    parser.add_argument("--list", action="store_true", help="list page types, then exit")
    parser.add_argument("--link", action="store_true", help="link to the repository runtime instead of copying it")
    parser.add_argument("--force", action="store_true", help="write into a folder that already has an index.html")
    args = parser.parse_args()

    root = stage_root()
    templates = root / PAGE_TYPES
    sample = templates.read_text(encoding="utf-8")
    frames = {m.group(1): m.group(0) for m in FRAME.finditer(sample)}
    first, last = FRAME.search(sample), list(FRAME.finditer(sample))[-1]
    if args.list or not (args.dest or args.pages):
        print("Page types:")
        for page_id, frame in frames.items():
            title = re.search(r'data-title="([^"]+)"', frame).group(1)
            print(f"  {page_id:18} {title}")
        return 0
    if not args.dest:
        parser.error("Give a destination folder for the new deck.")
    pages = [entry.strip() for entry in args.pages.split(",")] if args.pages else []
    if not any(pages):
        parser.error("Choose at least one page type with --pages. Use --list to see the options.")

    dest = Path(args.dest).resolve()
    if (dest / "index.html").exists() and not args.force:
        raise SystemExit(f"{dest / 'index.html'} already exists. Choose another folder or pass --force.")

    chosen: list[str] = []
    used: list[str] = []
    main_no = appendix_no = 0
    for entry in pages:
        if not entry:
            continue
        appendix = entry.endswith("@appendix")
        page_type, _, new_id = entry.removesuffix("@appendix").partition("=")
        if page_type not in frames:
            raise SystemExit(f"Unknown page type '{page_type}'. Available: {', '.join(frames)}")
        new_id = new_id or page_type
        if new_id in used:
            raise SystemExit(f"Slide id '{new_id}' is used twice; rename one with type=new-id.")
        used.append(new_id)
        frame = frames[page_type].replace(f'id="{page_type}"', f'id="{new_id}"', 1)
        is_appendix = appendix or 'data-appendix' in frame
        if appendix and 'data-appendix' not in frame:
            frame = frame.replace('data-source-slides="sample"', 'data-appendix="true"', 1)
            frame = frame.replace("<span>Reporting period</span></header>", "<span>Appendix</span></header>", 1)
        if is_appendix:
            appendix_no += 1
            label = f"A{appendix_no}"
        else:
            main_no += 1
            label = f"{main_no:02d}"
        frame = re.sub(r"<span>[^<]*</span></footer>", f"<span>{label}</span></footer>", frame, count=1)
        chosen.append(frame)

    html = sample[: first.start()] + "\n".join(chosen) + sample[last.end():]
    html = html.replace("<title>Stage.js · Report page types</title>", "<title>Report title · Period</title>")
    html = html.replace('aria-label="Report page types"', 'aria-label="Report deck"', 1)
    html = html.replace('href="#cover">Skip to slides', f'href="#{used[0]}">Skip to slides')

    dest.mkdir(parents=True, exist_ok=True)
    if "assets/" in "".join(chosen):
        shutil.copytree(templates.parent / "assets", dest / "assets", dirs_exist_ok=True)
    if args.link:
        prefix = os.path.relpath(root, dest).replace(os.sep, "/") + "/"
    else:
        prefix = ""
        shutil.copytree(root / "stage-js", dest / "stage-js", dirs_exist_ok=True)
        (dest / "theme").mkdir(exist_ok=True)
        for name in ("report.css", "interface.css"):
            shutil.copy2(root / "theme" / name, dest / "theme" / name)
    (dest / "index.html").write_text(html.replace(SAMPLE_PREFIX, prefix), encoding="utf-8")

    deck = dest / "index.html"
    print(f"Created {deck} with {main_no} main and {appendix_no} appendix slides: {', '.join(used)}")
    print(f"Check:   python3 {SKILL / 'scripts' / 'check-report.py'} {deck}")
    print(f"PDF:     bash {root / 'tools' / 'export-pdf.sh'} {deck}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
