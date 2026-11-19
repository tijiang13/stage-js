#!/usr/bin/env python3
"""Check local deck layouts, evidence states, media and print with Playwright.

Python Playwright and Chrome/Chromium are development dependencies only.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import shutil
from tempfile import TemporaryDirectory
from threading import Thread
from urllib.parse import quote, unquote, urlsplit


@contextmanager
def serve(root: Path):
    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def end_headers(self):
            if Path(self.translate_path(self.path)).is_file():
                self.send_header('Accept-Ranges', 'bytes')
            super().end_headers()

        def send_head(self):
            # Chrome needs byte ranges to exercise real video seeking reliably.
            self.remaining = None
            path = Path(self.translate_path(self.path))
            request = self.headers.get('Range', '')
            if not request or not path.is_file():
                return super().send_head()
            size = path.stat().st_size
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', request)
            if not match or not any(match.groups()):
                self.send_error(416, 'Invalid byte range')
                return None
            first, last = match.groups()
            start = int(first) if first else max(0, size - int(last))
            end = min(int(last), size - 1) if first and last else size - 1
            if start > end or start >= size:
                self.send_error(416, 'Unsatisfiable byte range')
                return None
            source = path.open('rb')
            source.seek(start)
            self.remaining = end - start + 1
            self.send_response(206)
            self.send_header('Content-Type', self.guess_type(str(path)))
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
            self.send_header('Content-Length', str(self.remaining))
            self.end_headers()
            return source

        def copyfile(self, source, output):
            try:
                if self.remaining is None:
                    return super().copyfile(source, output)
                while self.remaining:
                    chunk = source.read(min(64 * 1024, self.remaining))
                    if not chunk:
                        break
                    output.write(chunk)
                    self.remaining -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass  # Browsers cancel buffered video requests when changing slides.
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(root)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f'http://127.0.0.1:{server.server_port}'
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def browser_path(requested=None):
    return requested or shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')


def check_deck(deck: Path, output: Path, browser=None, language=None):
    from playwright.sync_api import sync_playwright
    deck = deck.resolve()
    refs = re.findall(r'(?:src|href)=[\'"]([^\'"]+)', deck.read_text())
    parents = [deck.parent]
    for ref in refs:
        url = urlsplit(ref)
        if not url.scheme and not url.netloc and url.path and not url.path.startswith('/'):
            parents.append((deck.parent / unquote(url.path)).resolve().parent)
    root = Path(os.path.commonpath(parents))
    output.mkdir(parents=True, exist_ok=True)
    result = {'deck': str(deck), 'checks': [], 'errors': [], 'screenshots': []}
    checker = (Path(__file__).parent / 'check-layout.js').read_text()

    def check(name, passed, detail=None):
        result['checks'].append({'name': name, 'passed': bool(passed), **({'detail': detail} if detail else {})})

    with serve(root) as origin, sync_playwright() as pw:
        launch = {'headless': True, 'args': ['--no-sandbox', '--no-proxy-server']}
        if browser_path(browser):
            launch['executable_path'] = browser_path(browser)
        instance = pw.chromium.launch(**launch)
        page = instance.new_page(viewport={'width': 1600, 'height': 900})
        page.on('pageerror', lambda error: result['errors'].append(str(error)))
        url = origin + '/' + quote(str(deck.relative_to(root))) + ('?lang=' + quote(language) if language else '')
        page.goto(url, wait_until='networkidle')
        page.wait_for_function('()=>!!window.StageDeck')
        if language:
            check('requested language selected', page.evaluate('()=>StageDeck.getState().language') == language)
        ids = page.locator('.slide-frame').evaluate_all('(es)=>es.map(e=>e.id)')
        check('unique slide IDs', len(ids) == len(set(ids)))
        page.locator('.deck img').evaluate_all('(es)=>es.forEach(e=>e.loading="eager")')
        page.wait_for_function('()=>[...document.querySelectorAll(".deck img")].every(e=>e.complete)')
        check('images decode', page.locator('.deck img').evaluate_all('(es)=>es.every(e=>e.naturalWidth>0)'))
        page.locator('.deck video').evaluate_all('(es)=>es.forEach(e=>{e.preload="auto";e.load()})')
        page.wait_for_function('()=>[...document.querySelectorAll(".deck video")].every(e=>e.readyState>=2||e.error||e.networkState===3)')
        check('videos decode', page.locator('.deck video').evaluate_all('(es)=>es.every(e=>!e.error&&e.videoWidth>0&&Number.isFinite(e.duration))'))
        check('example selectors have unique matching panels', page.locator('[data-media-examples]').evaluate_all('''(es)=>es.every(e=>{
          const panels=[...e.querySelectorAll('[data-media-example]')].filter(p=>p.closest('[data-media-examples]')===e);
          const values=panels.map(p=>p.dataset.mediaExample);
          const buttons=[...e.querySelectorAll('[data-media-select]')].filter(b=>b.closest('[data-media-examples]')===e);
          return values.length>0&&new Set(values).size===values.length&&buttons.every(b=>values.includes(b.dataset.mediaSelect))&&panels.filter(p=>!p.hidden).length===1;
        })'''))
        groups = page.locator('.deck [data-media-player]').evaluate_all('(es)=>es.map(e=>({count:e.querySelectorAll("video").length,durations:[...e.querySelectorAll("video")].map(v=>v.duration)}))')
        for i, group in enumerate(groups):
            check(f'player {i + 1} aligned durations', bool(group['count']) and max(group['durations']) - min(group['durations']) < .15)
        for width, height in [(1600, 900), (1280, 720)]:
            page.set_viewport_size({'width': width, 'height': height})
            for slide_id in ids:
                page.evaluate('(id)=>StageDeck.goTo(id)', slide_id)
                page.wait_for_timeout(80)
                frame = page.locator('[id=' + json.dumps(slide_id) + ']')
                cases = frame.locator('[data-media-select]')
                initial = cases.evaluate_all('(es)=>es.map(e=>e.getAttribute("aria-pressed"))')
                states = [None, *range(cases.count())]
                for state in states:
                    if state is not None:
                        cases.nth(state).click()
                        page.wait_for_timeout(80)
                        check(f'{slide_id} hidden media paused', frame.locator('[data-media-example][hidden] video').evaluate_all('(es)=>es.every(e=>e.paused)'))
                    layout = page.evaluate(checker)
                    problems = [item for item in layout['problems'] if item['slide'] == slide_id]
                    check(f'{width} {slide_id} state {state} layout', not problems, problems)
                for i, pressed in enumerate(initial):
                    if pressed == 'true':
                        cases.nth(i).click()
                page.evaluate('(id)=>StageDeck.goTo(id)', slide_id)
                page.wait_for_timeout(100)
                filename = f'{width}-' + re.sub(r'[^A-Za-z0-9_-]+', '_', slide_id) + '.png'
                page.screenshot(path=str(output / filename))
                result['screenshots'].append(filename)
        page.set_viewport_size({'width': 1600, 'height': 900})
        for slide_id in ids:
            page.evaluate('(id)=>StageDeck.goTo(id)', slide_id)
            frame = page.locator('[id=' + json.dumps(slide_id) + ']')
            buttons = frame.locator('.stage-media-expand')
            for i in range(buttons.count()):
                button = buttons.nth(i)
                if not button.is_visible():
                    continue
                button.focus()
                page.keyboard.press('Enter')
                page.wait_for_selector('.stage-media-dialog[open]')
                check(f'{slide_id} viewer suspends slide media', frame.locator('video').evaluate_all('(es)=>es.every(e=>e.paused)'))
                check(f'{slide_id} viewer has caption', bool(page.locator('.stage-media-caption').inner_text().strip()))
                page.keyboard.press('Escape')
                page.wait_for_selector('.stage-media-dialog[open]', state='hidden')
        page.keyboard.press('o')
        page.wait_for_selector('#overview-panel[open]')
        check('overview includes every page', page.locator('.overview-card').count() == len(ids))
        page.keyboard.press('Escape')
        mobile = instance.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        mobile.on('pageerror', lambda error: result['errors'].append(str(error)))
        mobile.goto(url, wait_until='networkidle')
        mobile.keyboard.press('r')
        mobile.wait_for_timeout(100)
        check('mobile reading mode', mobile.locator('body').evaluate('(e)=>e.classList.contains("mode-read")'))
        check('mobile has no page overflow', mobile.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'))
        check('mobile uses touch affordances', mobile.evaluate('()=>matchMedia("(pointer: coarse)").matches'))
        for slide_id in ids:
            mobile.locator('[id=' + json.dumps(slide_id) + ']').screenshot(path=str(output / ('mobile-' + re.sub(r'[^A-Za-z0-9_-]+', '_', slide_id) + '.png')))
        mobile.close()
        page.emulate_media(media='print')
        check('print hides evidence controls', page.locator('.stage-media-controls, .media-example-picker').evaluate_all('(es)=>es.every(e=>getComputedStyle(e).display==="none")'))
        check('each printed video has a visible poster', page.locator('.deck video').evaluate_all('(es)=>es.filter(e=>!e.closest("[hidden]")).every(e=>{const p=e.closest("figure")?.querySelector(".print-poster");return p&&getComputedStyle(p).display!=="none"&&p.naturalWidth>0})'))
        pdf = page.pdf(path=str(output / 'print.pdf'), print_background=True, prefer_css_page_size=True)
        check('one printed page per slide', len(re.findall(rb'/Type\s*/Page\b', pdf)) == len(ids))
        instance.close()
    check('no browser errors', not result['errors'], result['errors'])
    result['ok'] = all(item['passed'] for item in result['checks'])
    (output / 'checks.json').write_text(json.dumps(result, indent=2) + '\n')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('deck', type=Path)
    parser.add_argument('--output', type=Path, help='Keep screenshots, PDF and checks.json in this directory')
    parser.add_argument('--browser', help='Chrome/Chromium executable; otherwise detect PATH or use Playwright Chromium')
    parser.add_argument('--language', help='Check a declared deck language, for example zh-CN')
    args = parser.parse_args()
    if not args.deck.is_file():
        parser.error(f'Missing deck: {args.deck}')
    try:
        with TemporaryDirectory(prefix='stage-browser-') as temporary:
            result = check_deck(args.deck, args.output or Path(temporary), args.browser, args.language)
    except ImportError:
        parser.exit(1, 'Install the development dependency: python3 -m pip install playwright\n')
    except Exception as error:
        parser.exit(1, f'Browser check failed: {error}\n')
    failed = [item for item in result['checks'] if not item['passed']]
    print(json.dumps({'ok': result['ok'], 'checks': len(result['checks']), 'failed': failed, 'errors': result['errors']}, indent=2))
    return 0 if result['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
