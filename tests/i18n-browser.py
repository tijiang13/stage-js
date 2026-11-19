#!/usr/bin/env python3
"""Optional language switching against local synthetic media; no speaker-note translation."""
import importlib.util
from pathlib import Path
import unittest

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('stage_browser', ROOT / 'skills/stage-report/scripts/check-browser.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


class LanguageBrowser(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = helper.serve(ROOT)
        cls.origin = cls.server.__enter__()
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(executable_path=helper.browser_path(), headless=True, args=['--no-sandbox','--no-proxy-server'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.__exit__(None, None, None)

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width':1600,'height':900})
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.url = self.origin + '/sample_projects/multilingual/'
        self.page.goto(self.url, wait_until='networkidle')
        self.notes = self.page.locator('.speaker-notes').all_text_contents()

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def language(self, code):
        return self.page.evaluate('(code)=>StageDeck.setLanguage(code)', code)

    def pause_at(self, seconds=1.7):
        p = self.page
        p.wait_for_function('()=>!document.querySelector("video").paused')
        p.locator('[data-media-toggle]').click()
        p.locator('[data-media-player] input').evaluate('(e)=>{e.value=1.7;e.dispatchEvent(new Event("input"))}')
        p.locator('[data-media-player] select').select_option('0.5')
        p.wait_for_function('()=>document.querySelector("video").readyState>=2')

    def test_switch_keeps_the_slide_and_media_node_position_and_speed(self):
        p = self.page
        self.pause_at()
        p.evaluate('()=>{window.sourceVideo=document.querySelector("video");window.loads=0;sourceVideo.addEventListener("loadstart",()=>loads++)}')
        p.locator('.stage-language').select_option('zh-CN')
        self.assertEqual(p.locator('#recording h2').inner_text(), '切换语言，保留同一录像')
        self.assertTrue(p.locator('video').evaluate('(v)=>v===window.sourceVideo&&v.paused&&Math.abs(v.currentTime-1.7)<.05&&v.playbackRate===.5&&window.loads===0'))
        self.assertEqual(p.evaluate('()=>StageDeck.getState().slide.id'), 'recording')
        self.assertEqual(p.locator('[data-media-toggle]').inner_text(), '播放')
        self.assertEqual(p.locator('[data-action=fullscreen]').get_attribute('aria-label'), '进入全屏')
        self.assertEqual(p.locator('.speaker-notes').all_text_contents(), self.notes)
        self.language('en')
        self.assertTrue(p.locator('video').evaluate('(v)=>v===window.sourceVideo&&v.paused&&Math.abs(v.currentTime-1.7)<.05&&window.loads===0'))
        self.assertEqual(p.locator('#recording h2').inner_text(), 'Change the language, keep the recording')

    def test_playing_video_continues_and_hidden_slide_does_not_activate(self):
        p = self.page
        p.wait_for_function('()=>!document.querySelector("video").paused')
        p.locator('video').evaluate('(v)=>v.currentTime=1')
        self.language('zh-CN')
        p.wait_for_timeout(100)
        self.assertTrue(p.locator('video').evaluate('(v)=>!v.paused&&v.currentTime>=1&&v.currentTime<2'))
        p.evaluate('()=>StageDeck.goTo("summary")')
        self.language('en')
        self.assertTrue(p.locator('video').evaluate('(v)=>v.paused'))
        self.assertEqual(p.evaluate('()=>StageDeck.getState().slide.id'), 'summary')

    def test_open_presenter_updates_audience_preview_and_keeps_notes_and_timer(self):
        p = self.page
        p.locator('#recording h2').click()
        with p.expect_popup() as opened:
            p.keyboard.press('p')
        presenter = opened.value
        presenter.locator('#timer').click()
        p.wait_for_timeout(300)
        self.language('zh-CN')
        presenter.frame_locator('#current').locator('h2').filter(has_text='切换语言').wait_for()
        self.assertEqual(presenter.locator('#notes').inner_text(), self.notes[0])
        self.assertEqual(presenter.locator('#timer').inner_text(), '暂停计时')
        self.assertEqual(presenter.locator('h2[data-i18n="presenter.notes"]').inner_text(), '讲者备注')
        self.assertEqual(presenter.evaluate('()=>document.documentElement.lang'), 'zh-CN')
        self.assertEqual(presenter.frame_locator('#current').locator('html').get_attribute('lang'), 'zh-CN')
        self.assertNotEqual(presenter.locator('#elapsed').inner_text(), '')
        self.language('en')
        presenter.frame_locator('#current').locator('h2').filter(has_text='Change the language').wait_for()
        self.assertEqual(presenter.locator('#notes').inner_text(), self.notes[0])
        self.assertEqual(presenter.locator('#timer').inner_text(), 'Pause timer')
        self.language('zh-CN')
        p.evaluate('()=>StageDeck.goTo("summary")')
        presenter.frame_locator('#next').locator('body').filter(has_text='演示结束').wait_for()
        self.assertEqual(presenter.frame_locator('#next').locator('html').get_attribute('lang'), 'zh-CN')
        self.assertEqual(presenter.locator('#notes').inner_text(), self.notes[1])
        presenter.close()

    def test_open_video_viewer_keeps_playback_state_and_updates_its_caption(self):
        p = self.page
        self.pause_at()
        p.locator('video').click()
        p.wait_for_function('()=>document.querySelector(".stage-media-dialog video")?.readyState>=2')
        p.evaluate('()=>window.enlargedVideo=document.querySelector(".stage-media-dialog video")')
        self.language('zh-CN')
        self.assertEqual(p.locator('.stage-media-caption').inner_text(), '中英文共用同一段录像。')
        self.assertTrue(p.locator('.stage-media-dialog video').evaluate('(v)=>v===window.enlargedVideo&&v.paused&&Math.abs(v.currentTime-1.7)<.05&&v.playbackRate===.5'))
        self.assertEqual(p.locator('.stage-media-close').get_attribute('aria-label'), '关闭放大视图')
        p.keyboard.press('Escape')
        self.assertTrue(p.locator('#recording video').evaluate('(v)=>v.paused&&Math.abs(v.currentTime-1.7)<.05'))

    def test_open_diagram_and_overview_follow_language_without_changing_pages(self):
        p = self.page
        p.locator('img[src="assets/flow-en.svg"]').click()
        self.language('zh-CN')
        self.assertTrue(p.locator('.stage-media-dialog img').get_attribute('src').endswith('flow-zh.svg'))
        self.assertEqual(p.locator('.stage-media-caption').inner_text(), '观测与动作示意图')
        p.keyboard.press('Escape')
        p.keyboard.press('o')
        self.assertEqual(p.locator('.overview-card').count(), 2)
        self.assertIn('切换语言', p.locator('.overview-card strong').first.inner_text())
        self.language('en')
        self.assertIn('Change the language', p.locator('.overview-card strong').first.inner_text())
        self.assertTrue(p.locator('#overview-panel').evaluate('(e)=>e.open'))
        p.keyboard.press('Escape')

    def test_url_language_fallback_and_invalid_requests(self):
        p = self.page
        p.goto(self.url + '?lang=zh-CN&mode=read#summary', wait_until='networkidle')
        self.assertEqual(p.evaluate('()=>StageDeck.getState().language'), 'zh-CN')
        self.assertEqual(p.evaluate('()=>StageDeck.getState().slide.id'), 'summary')
        self.assertTrue(p.locator('body').evaluate('(e)=>e.classList.contains("mode-read")'))
        self.assertEqual(p.locator('[data-i18n="untranslated.example"]').inner_text(), 'Untranslated labels use the authored default.')
        self.assertFalse(self.language('not-a-language'))
        self.assertEqual(p.evaluate('()=>StageDeck.getState().language'), 'zh-CN')
        self.language('en')
        p.reload(wait_until='networkidle')
        self.assertEqual(p.evaluate('()=>StageDeck.getState().language'), 'en')
        self.assertEqual(p.evaluate('()=>StageDeck.getState().slide.id'), 'summary')
        self.assertEqual(p.locator('.speaker-notes').all_text_contents(), self.notes)

    def test_print_keeps_selected_language_and_translation_cannot_replace_a_video_source(self):
        p = self.page
        p.locator('video').evaluate('(v)=>{v.dataset.i18nAttr+=";src:asset.flow";window.beforeSource=v.currentSrc}')
        self.language('zh-CN')
        self.assertTrue(p.locator('video').evaluate('(v)=>v.currentSrc===window.beforeSource&&v.getAttribute("src")===null'))
        p.emulate_media(media='print')
        self.assertEqual(p.locator('#recording h2').inner_text(), '切换语言，保留同一录像')
        self.assertTrue(p.locator('.print-poster').is_visible())
        self.assertFalse(p.locator('.stage-language').is_visible())
        self.assertFalse(p.locator('.stage-media-controls').is_visible())
        self.assertEqual(p.locator('.speaker-notes').all_text_contents(), self.notes)

    def test_legacy_decks_remain_single_language_without_the_optional_module(self):
        p = self.page
        p.goto(self.origin + '/sample_projects/basic/', wait_until='networkidle')
        self.assertEqual(p.locator('.stage-language').count(), 0)
        self.assertFalse(self.language('zh-CN'))
        self.assertIsNone(p.evaluate('()=>window.StageI18n||null'))


if __name__ == '__main__':
    unittest.main()
