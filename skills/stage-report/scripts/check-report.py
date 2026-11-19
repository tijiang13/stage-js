#!/usr/bin/env python3
"""Checks for a report deck made from the report templates.

    python3 check-report.py path/to/index.html

Runs the Stage.js deck check when the repository is reachable, then looks for
report-specific problems: placeholder text left over from the templates,
missing speaker notes, and components holding more than fits on a slide.
Exit code 1 means at least one error.
"""

from __future__ import annotations

import html
import os
import re
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
LIMITS = {"table rows": 6, "asks": 3, "KPI tiles": 4, "timeline steps": 6, "bars": 6, "cards in a row": 4}


def text(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def pieces(source: str, pattern: str) -> list[str]:
    return [text(m) for m in re.findall(pattern, source, flags=re.I | re.S) if text(m)]


def text_nodes(source: str) -> set[str]:
    body = source[source.find("<main"):] if "<main" in source else source
    return {t for t in (text(part) for part in re.split(r"<[^>]+>", body)) if len(t) >= 16}


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 check-report.py path/to/index.html")
    deck = Path(sys.argv[1]).resolve()
    if not deck.is_file():
        raise SystemExit(f"Missing deck: {deck}")
    source = deck.read_text(encoding="utf-8")
    errors: list[str] = []
    warnings: list[str] = []

    roots = [Path(os.environ["STAGE_JS_HOME"])] if os.environ.get("STAGE_JS_HOME") else []
    roots.append(SKILL.parent.parent)
    checker = next((r / "tools" / "check-deck.py" for r in roots if (r / "tools" / "check-deck.py").is_file()), None)
    if checker:
        result = subprocess.run([sys.executable, str(checker), str(deck)], capture_output=True, text=True)
        print(result.stdout.rstrip())
        if result.returncode:
            errors.append("tools/check-deck.py failed (see above)")
    else:
        warnings.append("tools/check-deck.py not found; set STAGE_JS_HOME to run the framework check")

    page_types = Path("sample_projects/report/page-types.html")
    templates = next((r / page_types for r in roots if (r / page_types).is_file()), None)
    if templates and templates.resolve() != deck:
        leftovers = sorted(text_nodes(templates.read_text(encoding="utf-8")) & text_nodes(source))
        for phrase in leftovers[:12]:
            errors.append(f'Placeholder text from the sample is still in the deck: "{phrase[:70]}"')
        if len(leftovers) > 12:
            errors.append(f"...and {len(leftovers) - 12} more placeholder texts")
        if "media-placeholder" in source:
            errors.append("A slide still shows assets/media-placeholder.svg; replace it with real media or delete the slide")
    elif not templates:
        warnings.append(f"{page_types} not found; cannot check for leftover placeholder text")

    frames = re.findall(r'<section\s+[^>]*\bclass="[^"]*\bslide-frame\b[^"]*"[^>]*>.*?</section>', source, flags=re.I | re.S)
    for frame in frames:
        slide_id = (re.search(r'\bid="([^"]+)"', frame) or [None, "?"])[1]
        notes = re.search(r'<aside class="speaker-notes">(.*?)</aside>', frame, flags=re.S)
        if not notes or len(text(notes.group(1))) < 20:
            warnings.append(f"{slide_id}: speaker notes are missing or too short to present from")
        if not re.search(r"<h[12][^>]*>", frame):
            errors.append(f"{slide_id}: no h1 or h2 headline")
        for heading in pieces(frame, r"<h2[^>]*>(.*?)</h2>"):
            wide = sum(2 if ord(ch) > 0x2E7F else 1 for ch in heading)
            if wide > 95:
                warnings.append(f"{slide_id}: headline is {wide} columns wide; aim for 90 or fewer (two lines)")
        counts = {
            "table rows": max((len(re.findall(r"<tr\b", body)) for body in re.findall(r"<tbody>(.*?)</tbody>", frame, flags=re.S)), default=0),
            "asks": len(re.findall(r"<li\b", "".join(re.findall(r'<ol class="asks">(.*?)</ol>', frame, flags=re.S)))),
            "KPI tiles": len(re.findall(r'class="kpi"', frame)),
            "timeline steps": len(re.findall(r"<li\b", "".join(re.findall(r'<ol class="timeline">(.*?)</ol>', frame, flags=re.S)))),
            "bars": len(re.findall(r'class="bar\b', frame)),
            "cards in a row": max((len(re.findall(r'class="card\b', block)) for block in re.findall(r'<div class="cols">(.*?)</div>\s*(?:<p class="callout"|</div>)', frame, flags=re.S)), default=0),
        }
        for name, count in counts.items():
            if count > LIMITS[name]:
                warnings.append(f"{slide_id}: {count} {name}; review density against the {LIMITS[name]}-item guideline. Clarify the claim, remove detail or split when needed")

    for item in warnings:
        print(f"WARN   {item}")
    for item in errors:
        print(f"ERROR  {item}")
    print(f"Report check: {len(errors)} error(s), {len(warnings)} warning(s)")
    print("Open the deck at presentation size and review each slide in a browser.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
