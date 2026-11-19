/* Optional, local translations. Bind text and attributes without replacing media. */
(() => {
  const configNode = document.querySelector('script[data-stage-i18n]');
  if (!configNode) return;
  const config = JSON.parse(configNode.textContent);
  const languages = config.languages || {};
  const defaultLanguage = config.default || document.documentElement.lang || 'en';
  if (!Object.hasOwn(languages, defaultLanguage)) throw new Error('The default Stage.js language must be declared.');
  const requested = new URLSearchParams(location.search).get('lang');
  let language = Object.hasOwn(languages, requested) ? requested : defaultLanguage;
  const defaults = new Map();
  const chinese = {
    'ui.controls': '演示控制', 'ui.previous': '上一页', 'ui.previousTitle': '上一页（←）',
    'ui.next': '下一页', 'ui.nextTitle': '下一页（→ / 空格）', 'ui.overview': '总览',
    'ui.overviewTitle': '总览（O）', 'ui.slideOverview': '页面总览', 'ui.deckOverview': '演示总览',
    'ui.closeOverview': '关闭总览', 'ui.slides': '幻灯片', 'ui.chooseSlide': '选择页面返回演示。',
    'ui.read': '阅读模式', 'ui.present': '演示模式', 'ui.readTitle': '阅读模式（R）',
    'ui.presentTitle': '演示模式（R）', 'ui.enterFullscreen': '进入全屏', 'ui.exitFullscreen': '退出全屏',
    'ui.keys': '快捷键', 'ui.keyHelp': '← → / 空格翻页 · O 总览 · R 阅读模式 · F 全屏 · ? 帮助',
    'ui.language': '语言', 'ui.slide': '幻灯片',
    'media.play': '播放', 'media.pause': '暂停', 'media.replay': '重播', 'media.seek': '视频进度',
    'media.time': '播放时间', 'media.speed': '播放速度', 'media.seconds': '秒',
    'media.unavailable': '媒体无法加载', 'media.loadFailed': '视频加载失败',
    'media.pauseAll': '全部暂停', 'media.playAll': '全部播放',
    'media.expand': '放大', 'media.enlarged': '放大查看', 'media.close': '关闭放大视图',
    'media.enlargeVideo': '放大视频', 'media.enlargeImage': '放大图片',
    'media.enlargeComparison': '放大对比', 'media.preview': '媒体预览',
    'presenter.preview': '页面预览', 'presenter.videoPreview': '视频预览',
    'presenter.end': '演示结束', 'presenter.noNotes': '本页没有讲者备注。',
    'presenter.allowPopup': '请允许此演示打开弹窗，再按 P。', 'presenter.title': '讲者视图',
    'presenter.current': '观众视图 · 当前页', 'presenter.currentPreview': '当前页预览',
    'presenter.next': '下一页', 'presenter.nextPreview': '下一页预览',
    'presenter.previous': '← 上一页', 'presenter.advance': '下一页 →', 'presenter.goTo': '跳转到页面',
    'presenter.elapsed': '已用时间', 'presenter.startTimer': '开始计时',
    'presenter.pauseTimer': '暂停计时', 'presenter.resumeTimer': '继续计时', 'presenter.reset': '重置',
    'presenter.notes': '讲者备注', 'presenter.share': '只共享观众窗口，将此窗口保留在自己的屏幕上。',
    'presenter.keys': '← → / 空格翻页 · Home / End 跳转 · 按 P 打开讲者窗口。',
    'presenter.appendix': '（附录）',
  };
  const t = (key, fallback) => config.messages?.[language]?.[key]
    ?? (language === 'zh-CN' ? chinese[key] : undefined)
    ?? fallback ?? defaults.get(key) ?? key;
  const allowed = new Set(['alt', 'title', 'aria-label', 'data-title', 'data-section', 'content', 'src']);
  const apply = (root = document) => {
    const selector = '[data-i18n], [data-i18n-attr]';
    const nodes = [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)];
    for (const node of nodes) {
      // Audience translations never replace the speaker's authored notes.
      if (node.closest('.speaker-notes')) continue;
      const key = node.dataset.i18n;
      if (key && !node.children.length) {
        if (!defaults.has(key)) defaults.set(key, node.textContent);
        node.textContent = t(key, defaults.get(key));
      }
      for (const binding of (node.dataset.i18nAttr || '').split(';').filter(Boolean)) {
        const colon = binding.indexOf(':');
        const attr = binding.slice(0, colon).trim(), attributeKey = binding.slice(colon + 1).trim();
        if (colon < 1 || !attributeKey || !allowed.has(attr) || (attr === 'src' && node.tagName !== 'IMG')) continue;
        if (!defaults.has(attributeKey)) defaults.set(attributeKey, node.getAttribute(attr) || '');
        const value = t(attributeKey, defaults.get(attributeKey));
        if (node.getAttribute(attr) !== value) node.setAttribute(attr, value);
      }
    }
  };
  const setLanguage = next => {
    if (!Object.hasOwn(languages, next)) return false;
    if (next === language) return true;
    const previous = language;
    language = next;
    document.documentElement.lang = language;
    apply();
    const url = new URL(location.href);
    url.searchParams.set('lang', language);
    history.replaceState(null, '', url);
    document.dispatchEvent(new CustomEvent('stage:languagechange', { detail: { language, previous } }));
    return true;
  };
  window.StageI18n = Object.freeze({ t, apply, setLanguage, getLanguage: () => language, getLanguages: () => ({ ...languages }) });
  document.documentElement.lang = language;
  apply();
})();
