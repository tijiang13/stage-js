#!/usr/bin/env python3
"""Real browser regressions for optional evidence components; synthetic local media."""
import importlib.util
from pathlib import Path
import unittest

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('stage_browser', ROOT / 'skills/stage-report/scripts/check-browser.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


class EvidenceBrowser(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = helper.serve(ROOT)
        cls.origin = cls.server.__enter__()
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(executable_path=helper.browser_path(), headless=True, args=['--no-sandbox', '--no-proxy-server'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.__exit__(None, None, None)

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1600, 'height': 900})
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.open_fixture()

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def open_fixture(self, suffix=''):
        self.page.goto(self.origin + '/tests/fixtures/evidence.html' + suffix, wait_until='networkidle')

    def playing(self, selector):
        self.page.wait_for_function('(s)=>[...document.querySelectorAll(s)].every(v=>!v.paused)', arg=selector)

    def test_comparison_transport_and_group_enlargement(self):
        p = self.page
        group = p.locator('[data-media-example=first] [data-media-player]')
        self.playing('[data-media-example=first] video')
        group.locator('[data-media-toggle]').click()
        group.locator('input').evaluate('(e)=>{e.value=1.7;e.dispatchEvent(new Event("input"))}')
        group.locator('select').select_option('0.5')
        self.assertTrue(group.locator('video').evaluate_all('(es)=>es.every(v=>v.paused&&Math.abs(v.currentTime-1.7)<.05&&v.playbackRate===.5)'))
        group.locator('.stage-media-expand').focus()
        p.keyboard.press('Enter')
        p.wait_for_function('()=>[...document.querySelectorAll(".stage-media-dialog video")].length===2&&[...document.querySelectorAll(".stage-media-dialog video")].every(v=>v.readyState>=2)')
        self.assertEqual(p.locator('.stage-media-group figcaption').all_text_contents(), ['Baseline · first', 'Result · first'])
        self.assertTrue(p.locator('.stage-media-dialog video').evaluate_all('(es)=>es.every(v=>v.paused&&Math.abs(v.currentTime-1.7)<.05&&v.playbackRate===.5)'))
        p.locator('.stage-media-dialog input').evaluate('(e)=>{e.value=2.2;e.dispatchEvent(new Event("input"))}')
        p.keyboard.press('Escape')
        self.assertTrue(group.locator('video').evaluate_all('(es)=>es.every(v=>v.paused&&Math.abs(v.currentTime-2.2)<.05)'))
        self.assertEqual(group.locator('[data-media-toggle]').inner_text(), 'Play')
        self.assertTrue(group.locator('.stage-media-expand').evaluate('(e)=>e===document.activeElement'))
        group.locator('[data-media-replay]').click()
        self.playing('[data-media-example=first] video')
        self.assertTrue(group.locator('video').evaluate_all('(es)=>es.every(v=>v.currentTime<.5)'))
        group.locator('video').nth(1).evaluate('(v)=>v.currentTime=1.5')
        p.wait_for_function('()=>{const vs=document.querySelectorAll("[data-media-example=first] video");return Math.abs(vs[0].currentTime-vs[1].currentTime)<.12}')

    def test_selector_carries_play_intent_and_disables_hidden_sources(self):
        p = self.page
        self.playing('[data-media-example=first] video')
        p.locator('[data-media-select=second]').click()
        self.playing('[data-media-example=second] video')
        self.assertTrue(p.locator('[data-media-example=first] video').evaluate_all('(es)=>es.every(v=>v.paused)'))
        p.locator('[data-media-example=second] [data-media-toggle]').click()
        p.locator('[data-media-select=first]').click()
        self.assertTrue(p.locator('#comparison video').evaluate_all('(es)=>es.every(v=>v.paused)'))
        self.assertEqual(p.locator('[data-media-example=first] [data-media-toggle]').inner_text(), 'Play')
        p.keyboard.press('o')
        p.keyboard.press('Escape')
        self.assertTrue(p.locator('#comparison video').evaluate_all('(es)=>es.every(v=>v.paused)'))

    def test_group_viewer_restores_play_choice_and_navigation_keeps_it_hidden(self):
        p = self.page
        self.playing('[data-media-example=first] video')
        p.locator('[data-media-example=first] .stage-media-expand').click()
        self.playing('.stage-media-dialog video')
        p.locator('.stage-media-dialog [data-media-toggle]').click()
        p.locator('.stage-media-close').click()
        self.assertTrue(p.locator('#comparison video').evaluate_all('(es)=>es.every(v=>v.paused)'))
        p.locator('[data-media-example=first] [data-media-toggle]').click()
        p.locator('[data-media-example=first] .stage-media-expand').click()
        p.evaluate('()=>StageDeck.goTo("manual")')
        self.assertFalse(p.locator('.stage-media-dialog').evaluate('(e)=>e.open'))
        self.assertTrue(p.locator('#comparison video').evaluate_all('(es)=>es.every(v=>v.paused)'))

    def test_selected_example_refreshes_open_presenter_and_prints_with_labels(self):
        p = self.page
        with p.expect_popup() as opened:
            p.keyboard.press('p')
        presenter = opened.value
        preview = presenter.frame_locator('#current')
        preview.locator('[data-media-example=first]').wait_for()
        p.locator('[data-media-select=second]').click()
        preview.locator('[data-media-example=second]:not([hidden])').wait_for()
        self.assertEqual(preview.locator('.stage-media-controls,.media-example-picker,.stage-media-expand').count(), 0)
        self.assertEqual(preview.locator('[data-media-example=second] .video-preview').count(), 2)
        p.emulate_media(media='print')
        self.assertTrue(p.locator('[data-media-example=second] .print-poster').evaluate_all('(es)=>es.every(e=>getComputedStyle(e).display!=="none")'))
        self.assertFalse(p.locator('[data-media-example=first]').is_visible())
        self.assertTrue(p.locator('.stage-media-controls,.media-example-picker').evaluate_all('(es)=>es.every(e=>getComputedStyle(e).display==="none")'))
        presenter.close()

    def test_manual_and_unmarked_media_keep_existing_behavior(self):
        p = self.page
        p.evaluate('()=>StageDeck.goTo("manual")')
        p.wait_for_timeout(100)
        self.assertTrue(p.locator('#manual video').evaluate('(v)=>v.paused'))
        p.locator('#manual [data-media-toggle]').click()
        self.playing('#manual video')
        p.locator('#manual video').click()
        p.wait_for_function('()=>document.querySelector(".stage-media-dialog video")?.readyState>=2')
        self.assertTrue(p.locator('.stage-media-dialog video').evaluate('(v)=>v.controls'))
        p.locator('.stage-media-dialog video').evaluate('(v)=>v.playbackRate=1.25')
        p.keyboard.press('Escape')
        self.assertTrue(p.locator('#manual video').evaluate('(v)=>v.playbackRate===1.25'))
        self.assertEqual(p.locator('#manual .stage-media-controls select').input_value(), '1.25')
        p.evaluate('()=>StageDeck.goTo("plain")')
        self.assertTrue(p.locator('#plain video').evaluate('(v)=>v.controls&&v.paused'))
        self.assertEqual(p.locator('#plain .stage-media-controls,#plain .stage-media-expand').count(), 0)
        p.evaluate('()=>StageDeck.goTo("manual")')
        self.assertTrue(p.locator('#manual video').evaluate('(v)=>v.paused'))
        p.locator('#manual img:not(.print-poster)').click()
        self.assertEqual(p.locator('.stage-media-dialog img').count(), 1)
        p.keyboard.press('Escape')

    def test_reduced_motion_allows_only_explicit_play(self):
        self.context.close()
        self.context = self.browser.new_context(viewport={'width':1600,'height':900}, reduced_motion='reduce')
        self.page = self.context.new_page()
        self.open_fixture()
        self.assertTrue(self.page.locator('#comparison video').evaluate_all('(es)=>es.every(v=>v.paused)'))
        self.page.locator('[data-media-example=first] [data-media-toggle]').click()
        self.playing('[data-media-example=first] video')

    def test_missing_video_is_reported_by_the_transport(self):
        p = self.page
        p.evaluate('()=>StageDeck.goTo("manual")')
        p.locator('#manual video').evaluate('(v)=>{v.querySelector("source").src="/missing-fixture.mp4";v.load()}')
        p.wait_for_function('()=>{const v=document.querySelector("#manual video");return v.error||v.networkState===3}')
        p.wait_for_function('()=>document.querySelector("#manual [data-media-toggle]").disabled')
        self.assertEqual(p.locator('#manual [data-media-toggle]').inner_text(), 'Media unavailable')
        self.assertTrue(p.locator('#manual [data-media-toggle]').is_disabled())

    def test_programmatic_selection_closes_viewer_without_resuming_old_example(self):
        p = self.page
        p.locator('[data-media-example=first] .stage-media-expand').click()
        p.locator('[data-media-select=second]').evaluate('(e)=>e.click()')
        self.assertFalse(p.locator('.stage-media-dialog').evaluate('(e)=>e.open'))
        self.assertTrue(p.locator('[data-media-example=first] video').evaluate_all('(es)=>es.every(v=>v.paused)'))


if __name__ == '__main__':
    unittest.main()
