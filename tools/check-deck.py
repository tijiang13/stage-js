#!/usr/bin/env python3
"""Static checks for a Stage.js presentation deck."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit


if len(sys.argv) != 2:
    raise SystemExit("Usage: python3 tools/check-deck.py path/to/index.html")
HTML = Path(sys.argv[1]).resolve()


def attributes(source: str) -> dict[str, str]:
    return {
        key.lower(): (double or single or bare or "")
        for key, double, single, bare in re.findall(
            r"([:\w-]+)(?:\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+)))?",
            source,
        )
    }


def local_path(value: str) -> Path | None:
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc or value.startswith(("#", "data:")):
        return None
    return (HTML.parent / unquote(parsed.path)).resolve()


def main() -> int:
    if not HTML.is_file():
        print(f"ERROR  Missing HTML: {HTML}")
        return 1

    text = HTML.read_text(encoding="utf-8")
    errors: list[str] = []
    warnings: list[str] = []

    ids = re.findall(r'\bid\s*=\s*["\']([^"\']+)["\']', text, flags=re.I)
    duplicates = sorted({item for item in ids if ids.count(item) > 1})
    if duplicates:
        errors.append(f"Duplicate IDs: {', '.join(duplicates)}")

    slide_matches = list(
        re.finditer(
            r'<section\s+([^>]*\bclass=["\'][^"\']*\bslide-frame\b[^"\']*["\'][^>]*)>(.*?)</section>',
            text,
            flags=re.I | re.S,
        )
    )
    if not slide_matches:
        errors.append("No .slide-frame sections found")

    main_count = 0
    appendix_count = 0
    for index, match in enumerate(slide_matches, start=1):
        attrs = attributes(match.group(1))
        body = match.group(2)
        label = attrs.get("id", f"slide #{index}")
        if not attrs.get("id"):
            errors.append(f"{label}: missing id")
        if not attrs.get("data-title"):
            errors.append(f"{label}: missing data-title")
        if not attrs.get("data-section"):
            errors.append(f"{label}: missing data-section")
        if "speaker-notes" not in body:
            warnings.append(f"{label}: missing .speaker-notes")
        if "data-appendix" in attrs:
            appendix_count += 1
        else:
            main_count += 1
            if not attrs.get("data-source-slides"):
                warnings.append(f"{label}: missing data-source-slides")

    refs = re.findall(r'\b(?:src|href|poster)\s*=\s*["\']([^"\']+)["\']', text, flags=re.I)
    checked: set[Path] = set()
    total_bytes = 0
    for ref in refs:
        path = local_path(ref)
        if path is None or path in checked:
            continue
        checked.add(path)
        if not path.exists():
            errors.append(f"Missing local resource: {ref}")
        elif path.is_file():
            total_bytes += path.stat().st_size

    poster_refs = set(re.findall(r'<video\b[^>]*\bposter=["\']([^"\']+)["\']', text, flags=re.I))
    print_refs = set(
        re.findall(
            r'<img\b[^>]*\bclass=["\'][^"\']*\bprint-poster\b[^"\']*["\'][^>]*\bsrc=["\']([^"\']+)["\']',
            text,
            flags=re.I,
        )
    )
    print_refs |= set(
        re.findall(
            r'<img\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*\bclass=["\'][^"\']*\bprint-poster\b[^"\']*["\']',
            text,
            flags=re.I,
        )
    )
    for poster in sorted(poster_refs - print_refs):
        warnings.append(f"Video poster has no matching .print-poster: {poster}")

    autoplay_tags = re.findall(r'<video\b[^>]*\bdata-autoplay\b[^>]*>', text, flags=re.I)
    for tag in autoplay_tags:
        attrs = attributes(tag)
        missing = [name for name in ("muted", "loop", "playsinline") if name not in attrs]
        if missing:
            errors.append(f"Autoplay video missing {', '.join(missing)}: {attrs.get('poster', tag[:80])}")

    print(f"Deck: {HTML}")
    print(f"Slides: {main_count} main + {appendix_count} appendix")
    print(f"Local resources: {len(checked)} paths, {total_bytes / 1048576:.2f} MB")

    for item in warnings:
        print(f"WARN   {item}")
    for item in errors:
        print(f"ERROR  {item}")

    if errors:
        print(f"FAILED: {len(errors)} error(s), {len(warnings)} warning(s)")
        return 1

    print(f"PASS: {len(warnings)} warning(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
