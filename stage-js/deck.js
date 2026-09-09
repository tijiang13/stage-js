(() => {
  const body = document.body;
  const deck = document.querySelector('#deck');
  const slides = [...document.querySelectorAll('.slide-frame')];
  if (!deck || !slides.length) return;
  StageComponents.mountControls();
  const mainSlides = slides.filter(slide => !slide.hasAttribute('data-appendix'));
  const appendixSlides = slides.filter(slide => slide.hasAttribute('data-appendix'));
  const progress = document.querySelector('.deck-progress span');
  const sectionName = document.querySelector('.section-name');
  const slideCount = document.querySelector('.slide-count');
  const overview = document.querySelector('#overview-panel');
  const overviewGrid = overview.querySelector('.overview-grid');
  const keyHelp = document.querySelector('#key-help');
  const modeButton = document.querySelector('[data-action="mode"]');
  const previousButton = document.querySelector('[data-action="previous"]');
  const nextButton = document.querySelector('[data-action="next"]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const media = StageComponents.createMedia(deck, reducedMotion);
  const overlays = new Set();
  const acquireOverlay = close => {
    const releaseMedia = media.suspend();
    overlays.add(close);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      overlays.delete(close);
      releaseMedia();
    };
  };

  const overviewButton = document.querySelector('[data-action="overview"]');
  const fullscreenButton = document.querySelector('[data-action="fullscreen"]');
  let presenter;
  let current = slides[0];
  let helpTimer;
  let ticking = false;

  const twoDigits = value => String(value).padStart(2, '0');
  const isReadMode = () => body.classList.contains('mode-read');

  const updateUrl = slide => {
    const url = new URL(window.location.href);
    url.hash = slide.id;
    url.searchParams.set('mode', isReadMode() ? 'read' : 'present');
    history.replaceState(null, '', url);
  };

  const slideLabel = slide => {
    if (slide.hasAttribute('data-appendix')) {
      return `A${appendixSlides.indexOf(slide) + 1}`;
    }
    return twoDigits(mainSlides.indexOf(slide) + 1);
  };

  const updateUi = (slide, updateHash = true) => {
    if (!slide) return;
    const changed = current !== slide;
    current = slide;
    media.activate(slide);
    if (changed) {
      [...overlays].forEach(close => close());
      document.dispatchEvent(new CustomEvent('stage:slidechange', { detail: { slide } }));
    }

    const mainIndex = mainSlides.indexOf(slide);
    const appendixIndex = appendixSlides.indexOf(slide);
    const isAppendix = appendixIndex >= 0;
    const progressValue = isAppendix ? 1 : (mainIndex + 1) / mainSlides.length;

    sectionName.textContent = slide.dataset.section || 'Overview';
    slideCount.textContent = isAppendix
      ? `A${appendixIndex + 1} / A${appendixSlides.length}`
      : `${twoDigits(mainIndex + 1)} / ${twoDigits(mainSlides.length)}`;
    progress.style.width = `${Math.max(0, Math.min(1, progressValue)) * 100}%`;

    previousButton.disabled = slides.indexOf(slide) === 0;
    nextButton.disabled = isAppendix ? appendixIndex === appendixSlides.length - 1 : mainIndex === mainSlides.length - 1;

    document.querySelectorAll('.overview-card').forEach((card, index) => {
      card.classList.toggle('current', slides[index] === slide);
      card.setAttribute('aria-current', slides[index] === slide ? 'page' : 'false');
    });

    if (updateHash) updateUrl(slide);
    presenter?.update();
  };

  const goTo = target => {
    const slide = typeof target === 'number' ? slides[target] : target;
    if (!slide) return;
    if (!isReadMode()) {
      deck.scrollTo({ top: slide.offsetTop, behavior: 'instant' });
    } else {
      slide.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
    updateUi(slide);
  };

  const step = direction => {
    const isAppendix = current.hasAttribute('data-appendix');
    const sequence = isAppendix ? slides : mainSlides;
    const index = sequence.indexOf(current);
    const next = sequence[Math.max(0, Math.min(sequence.length - 1, index + direction))];
    if (next !== current) goTo(next);
  };

  const detectCurrentSlide = () => {
    ticking = false;
    const viewportCenter = window.innerHeight / 2;
    let nearest = current;
    let nearestDistance = Infinity;

    slides.forEach(slide => {
      const rect = slide.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
      if (distance < nearestDistance) {
        nearest = slide;
        nearestDistance = distance;
      }
    });

    if (nearest !== current) updateUi(nearest);
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(detectCurrentSlide);
  };
  deck.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scroll', () => { if (isReadMode()) onScroll(); }, { passive: true });

  const buildOverview = () => {
    const fragment = document.createDocumentFragment();
    slides.forEach(slide => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'overview-card';
      if (slide.hasAttribute('data-appendix')) button.classList.add('appendix');
      for (const [tag, text] of [['span', slide.dataset.section || 'Slide'], ['strong', slide.dataset.title || slide.id], ['small', slideLabel(slide)]]) {
        const label = document.createElement(tag);
        label.textContent = text;
        button.append(label);
      }
      button.addEventListener('click', () => {
        toggleOverview(false);
        goTo(slide);
      });
      fragment.appendChild(button);
    });
    overviewGrid.appendChild(fragment);
  };

  let releaseOverview;
  const finishOverview = () => {
    releaseOverview?.();
    releaseOverview = null;
  };
  const toggleOverview = force => {
    const open = typeof force === 'boolean' ? force : !overview.open;
    if (open && !overview.open) {
      releaseOverview = acquireOverlay(() => toggleOverview(false));
      overview.showModal();
      overview.querySelector('.overview-card.current')?.focus();
    } else if (!open && overview.open) {
      overview.close();
      finishOverview();
      overviewButton.focus({ preventScroll: true });
    }
  };
  overview.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, [contenteditable]')) return;
    const key = event.key.toLowerCase();
    if (key === 'p') { event.preventDefault(); actionHandlers.presenter(); }
    else if (key === 'n') { event.preventDefault(); actionHandlers.presenter(); }
    else if (key === 'o') { event.preventDefault(); toggleOverview(false); }
    else if (key === 'r') { event.preventDefault(); actionHandlers.mode(); }
    else if (key === 'f') { event.preventDefault(); toggleFullscreen(); }
    event.stopPropagation();
  });
  overview.addEventListener('cancel' , event => { event.preventDefault(); toggleOverview(false); });
  overview.addEventListener('close', () => { if (!overview.open) finishOverview(); });

  const setMode = (mode, options = {}) => {
    const slide = current;
    const read = mode === 'read';
    body.classList.toggle('mode-read', read);
    body.classList.toggle('mode-present', !read);
    modeButton.textContent = read ? 'Present deck' : 'Read deck';
    modeButton.title = read ? 'Presentation mode (R)' : 'Reading mode (R)';

    if (!options.initial) {
      requestAnimationFrame(() => goTo(slide));
      updateUrl(slide);
    }
  };

  const updateFullscreen = () => {
    const active = Boolean(document.fullscreenElement);
    const label = active ? 'Exit fullscreen' : 'Enter fullscreen';
    fullscreenButton.setAttribute('aria-pressed', String(active));
    fullscreenButton.setAttribute('aria-label', label);
    fullscreenButton.title = `${label} (F)`;
  };
  document.addEventListener('fullscreenchange', updateFullscreen);
  updateFullscreen();

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen is unavailable:', error);
    }
  };

  const showKeyHelp = () => {
    clearTimeout(helpTimer);
    keyHelp.hidden = false;
    helpTimer = setTimeout(() => { keyHelp.hidden = true; }, 4500);
  };

  presenter = createPresenter({
    slides, getCurrent: () => current,
    goTo: slide => goTo(slide),
    step: direction => {
      const sequence = current.hasAttribute("data-appendix") ? slides : mainSlides;
      const target = sequence[sequence.indexOf(current) + direction];
      if (target) goTo(target);
    },
    getNext: () => {
      const sequence = current.hasAttribute("data-appendix") ? slides : mainSlides;
      return sequence[sequence.indexOf(current) + 1];
    },
  });

  const actionHandlers = {
    presenter: () => { toggleOverview(false); presenter.open(); },
    previous: () => step(-1),
    next: () => step(1),
    overview: () => toggleOverview(),
    mode: () => { toggleOverview(false); setMode(isReadMode() ? 'present' : 'read'); },
    fullscreen: toggleFullscreen,
  };

  document.addEventListener('click', event => {
    const control = event.target.closest('.stage-ui [data-action]');
    if (!control) return;
    actionHandlers[control.dataset.action]?.();
  });

  document.addEventListener('keydown', event => {
    if (overlays.size) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const interactive = event.target.closest('input, textarea, select, a, video, audio, [contenteditable]');
    if (interactive && event.key !== 'Escape') return;
    if (event.target.closest('button') && [' ', 'Enter'].includes(event.key)) return;

    const key = event.key.toLowerCase();
    if (['arrowright', 'arrowdown', 'pagedown', ' '].includes(key)) {
      event.preventDefault();
      step(1);
    } else if (['arrowleft', 'arrowup', 'pageup'].includes(key)) {
      event.preventDefault();
      step(-1);
    } else if (key === 'home') {
      event.preventDefault();
      goTo(mainSlides[0]);
    } else if (key === 'end') {
      event.preventDefault();
      goTo(mainSlides.at(-1));
    } else if (key === 'o') {
      event.preventDefault();
      toggleOverview();
    } else if (key === 'p') {
      event.preventDefault();
      actionHandlers.presenter();
    } else if (key === 'n') {
      event.preventDefault();
      actionHandlers.presenter();
    } else if (key === 'r') {
      event.preventDefault();
      setMode(isReadMode() ? 'present' : 'read');
    } else if (key === 'f') {
      event.preventDefault();
      toggleFullscreen();
    } else if (key === '?') {
      event.preventDefault();
      showKeyHelp();
    }
  });

  let releasePrint;
  window.addEventListener('beforeprint', () => {
    releasePrint = media.suspend();
    [...overlays].forEach(close => close());
  });
  window.addEventListener('afterprint', () => { releasePrint?.(); releasePrint = null; });
  window.addEventListener('pagehide', () => { media.suspend(); [...overlays].forEach(close => close()); });

  window.addEventListener('hashchange', () => {
    const slide = slides.find(slide => `#${slide.id}` === window.location.hash);
    if (slide?.classList.contains('slide-frame')) goTo(slide);
  });

  window.StageDeck = Object.freeze({
    getState: () => ({ slide: current, mode: isReadMode() ? 'read' : 'present' }),
    goTo: target => goTo(typeof target === 'string' ? slides.find(slide => slide.id === target) : target),
    step, media, acquireOverlay,
  });
  buildOverview();

  const params = new URLSearchParams(window.location.search);
  setMode(params.get('mode') === 'read' ? 'read' : 'present', { initial: true });

  const initialSlide = slides.find(slide => `#${slide.id}` === window.location.hash);
  if (initialSlide?.classList.contains('slide-frame')) current = initialSlide;
  updateUi(current, false);
  goTo(current);
})();
