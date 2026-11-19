/* One coordinator owns slide-media playback intent, visibility and suspension. */
window.StageComponents = window.StageComponents || {};
window.StageComponents.createMedia = (deck, reducedMotion) => {
  const media = [...deck.querySelectorAll('video, audio')];
  const intent = new Map(media.map(item => [item, item.hasAttribute('data-autoplay') && !reducedMotion.matches]));
  const visible = new Set();
  const available = new Set(media);
  const holds = new Set();
  const managedPauses = new WeakSet();
  const pause = item => {
    if (!item.paused) { managedPauses.add(item); item.pause(); }
  };
  let slide;
  const eligible = item => slide?.contains(item) && available.has(item) && visible.has(item) && !document.hidden && !holds.size;
  const sync = () => media.forEach(item => {
    if (eligible(item) && intent.get(item)) {
      if (item.paused) item.play().catch(() => {});
    } else pause(item);
  });
  media.forEach(item => {
    item.addEventListener('play', () => {
      if (!eligible(item)) { pause(item); return; }
      intent.set(item, true);
    });
    item.addEventListener('pause', () => {
      if (managedPauses.has(item)) { managedPauses.delete(item); return; }
      if (eligible(item)) intent.set(item, false);
    });
    item.addEventListener('ended', () => intent.set(item, false));
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting, intersectionRatio }) => isIntersecting && intersectionRatio >= .45 ? visible.add(target) : visible.delete(target));
    sync();
  }, { threshold: .45 });
  media.forEach(item => observer.observe(item));
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) media.filter(item => item.hasAttribute('data-autoplay')).forEach(item => {
      intent.set(item, false);
      item.dispatchEvent(new Event('stage:mediaintent'));
    });
    sync();
  });
  return {
    activate(next) {
      const previous = slide;
      slide = next;
      if (previous !== next) media.filter(item => previous?.contains(item) && !item.hasAttribute('data-autoplay')).forEach(item => intent.set(item, false));
      sync();
    },
    suspend() {
      const token = Symbol('media hold');
      holds.add(token);
      sync();
      let released = false;
      return () => { if (!released) { released = true; holds.delete(token); sync(); } };
    },
    setIntent(item, playing) {
      if (!intent.has(item)) return;
      intent.set(item, playing); sync();
      item.dispatchEvent(new Event('stage:mediaintent'));
    },
    getIntent(item) { return intent.get(item) || false; },
    setAvailable(item, enabled) {
      if (!intent.has(item)) return;
      if (enabled) available.add(item); else available.delete(item);
      sync();
    },
    isActive(item) { return !!slide?.contains(item); },
  };
};
