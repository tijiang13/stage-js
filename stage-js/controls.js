/* Shared UI shell. Samples provide slides, not copies of framework markup. */
window.StageComponents = window.StageComponents || {};
window.StageComponents.mountControls = () => {
  const host = document.createElement('div');
  host.className = 'stage-ui';
  host.innerHTML = `  <nav class="deck-controls presentation-ui" aria-label="Presentation controls" data-i18n-attr="aria-label:ui.controls">
    <button type="button" data-action="previous" aria-label="Previous slide" data-i18n-attr="aria-label:ui.previous;title:ui.previousTitle" title="Previous slide (←)">←</button>
    <button type="button" data-action="next" aria-label="Next slide" data-i18n-attr="aria-label:ui.next;title:ui.nextTitle" title="Next slide (→ / Space)">→</button>
    <button class="overview-control" type="button" data-action="overview" aria-label="Overview" data-i18n-attr="aria-label:ui.overview;title:ui.overviewTitle" aria-haspopup="dialog" aria-controls="overview-panel" title="Overview (O)">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="7" height="6" rx="1"/><rect x="14" y="4" width="7" height="6" rx="1"/><rect x="3" y="14" width="7" height="6" rx="1"/><rect x="14" y="14" width="7" height="6" rx="1"/></svg>
    </button>
    <button class="fullscreen-control" type="button" data-action="fullscreen" aria-label="Enter fullscreen" aria-pressed="false" title="Enter fullscreen (F)">
      <svg class="fullscreen-enter" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>
      <svg class="fullscreen-exit" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5"/></svg>
    </button>
  </nav>

  <div class="deck-status presentation-ui" aria-live="polite"><span class="section-name"></span><span class="slide-count"></span></div>
  <div class="deck-progress presentation-ui" aria-hidden="true"><span></span></div>

  <dialog class="overview-panel presentation-ui" id="overview-panel" aria-label="Slide overview" data-i18n-attr="aria-label:ui.slideOverview">
    <header><div><span data-i18n="ui.deckOverview">Deck overview</span><strong></strong></div><button type="button" data-action="overview" aria-label="Close overview" data-i18n-attr="aria-label:ui.closeOverview">×</button></header>
    <div class="overview-grid" aria-label="Slides" data-i18n-attr="aria-label:ui.slides"></div>
    <footer class="overview-footer"><span data-i18n="ui.chooseSlide">Choose a slide to return to the deck.</span><button type="button" data-action="mode" title="Reading mode (R)">Read deck</button></footer>
  </dialog>

  <div class="key-help presentation-ui" id="key-help" hidden>
    <strong data-i18n="ui.keys">Keys</strong><span data-i18n="ui.keyHelp">← → / Space · O overview · R reading mode · F fullscreen · ? help</span>
  </div>

`;
  document.body.append(host);
  const refreshTitle = () => { host.querySelector('#overview-panel header strong').textContent = document.title; };
  refreshTitle();
  if (window.StageI18n) {
    const languages = StageI18n.getLanguages();
    if (Object.keys(languages).length > 1) {
      const select = document.createElement('select');
      select.className = 'stage-language';
      select.setAttribute('aria-label', 'Language');
      select.dataset.i18nAttr = 'aria-label:ui.language';
      for (const [code, label] of Object.entries(languages)) select.add(new Option(label, code));
      select.value = StageI18n.getLanguage();
      host.querySelector('.fullscreen-control').before(select);
      select.addEventListener('change', () => StageI18n.setLanguage(select.value));
      document.addEventListener('stage:languagechange', () => { select.value = StageI18n.getLanguage(); });
    }
    StageI18n.apply(host);
    document.addEventListener('stage:languagechange', refreshTitle);
  }
  const query = selector => host.querySelector(selector);
  return { host, query };
};
