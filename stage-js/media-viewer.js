/* Opt-in image/video viewer. Group aligned evidence with data-media-zoom="group". */
(() => {
  const t = (key, fallback) => window.StageI18n?.t(key, fallback) ?? fallback;
  const frames = [...document.querySelectorAll('[data-media-zoom]')];
  if (!frames.length) return;
  const stage = window.StageDeck;
  if (!stage) throw new Error('Load deck.js before media-viewer.js.');
  const dialog = document.createElement('dialog');
  dialog.className = 'stage-media-dialog presentation-ui';
  dialog.setAttribute('aria-label', 'Enlarged media');
  dialog.dataset.i18nAttr = 'aria-label:media.enlarged';
  dialog.innerHTML = '<button type="button" class="stage-media-close" aria-label="Close enlarged media" data-i18n-attr="aria-label:media.close">×</button><div class="stage-media-content"></div><p class="stage-media-caption"></p>';
  document.body.append(dialog);
  window.StageI18n?.apply(dialog);
  const content = dialog.querySelector('.stage-media-content');
  const caption = dialog.querySelector('.stage-media-caption');
  let sources = [], viewers = [], trigger, player;
  let releaseOverlay;
  let restorePlayback = true;
  const intent = new Map();
  const controller = {
    getIntent: video => intent.get(video) || false,
    setIntent(video, playing) {
      intent.set(video, playing);
      if (playing) video.play().catch(() => {}); else video.pause();
    },
  };
  const captionFor = media => {
    const figureCaption = media.closest('figure')?.querySelector('figcaption');
    const text = figureCaption ? [...figureCaption.childNodes].map(node => node.textContent.trim()).filter(Boolean).join(' — ') : '';
    return text || media.getAttribute('alt') || media.getAttribute('aria-label') || t('media.preview', 'Media preview');
  };

  const finish = () => {
    if (!sources.length) return;
    viewers.forEach((viewer, index) => {
      if (!(viewer instanceof HTMLVideoElement)) return;
      const source = sources[index];
      const time = viewer.currentTime;
      const playing = player ? controller.getIntent(viewer) : !viewer.paused;
      viewer.pause();
      if (Number.isFinite(time) && source.readyState >= 1) source.currentTime = time;
      source.muted = viewer.muted;
      source.volume = viewer.volume;
      source.playbackRate = viewer.playbackRate;
      stage.media.setIntent(source, restorePlayback && playing);
    });
    player?.destroy(); player = null;
    content.replaceChildren();
    intent.clear();
    releaseOverlay?.();
    releaseOverlay = null;
    trigger?.focus({ preventScroll: true });
    sources = []; viewers = []; trigger = null;
  };
  const close = (restore = true) => {
    if (!dialog.open) return;
    restorePlayback = restore;
    dialog.close();
    finish();
  };
  const open = (items, button) => {
    if (dialog.open) return;
    const grouped = items.length > 1;
    if (grouped && items.some(media => media instanceof HTMLVideoElement) && !StageComponents.mountMediaPlayer) {
      throw new Error('Load media-player.js before enlarging a video group.');
    }
    sources = items; trigger = button; restorePlayback = true;
    const playing = items.map(media => media instanceof HTMLVideoElement && !media.paused);
    releaseOverlay = stage.acquireOverlay(() => close(false));
    const group = document.createElement('div');
    group.className = 'stage-media-group';
    group.setAttribute('data-media-player', '');
    viewers = items.map((media, index) => {
      const viewer = media.cloneNode(true);
      viewer.removeAttribute('id');
      viewer.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      viewer.removeAttribute('data-autoplay');
      viewer.removeAttribute('autoplay');
      viewer.removeAttribute('tabindex');
      viewer.className = '';
      if (viewer instanceof HTMLVideoElement) {
        viewer.controls = !grouped;
        viewer.muted = media.muted;
        viewer.volume = media.volume;
        viewer.playbackRate = media.playbackRate;
        const time = media.currentTime;
        intent.set(viewer, playing[index]);
        viewer.addEventListener('loadedmetadata', () => {
          if (!viewers.includes(viewer) || !dialog.open) return;
          if (Number.isFinite(time)) viewer.currentTime = time;
          if (playing[index]) controller.setIntent(viewer, true);
        }, { once: true });
      }
      if (grouped) {
        const figure = document.createElement('figure');
        const label = document.createElement('figcaption');
        label.textContent = captionFor(media);
        figure.append(label, viewer); group.append(figure);
      }
      return viewer;
    });
    caption.textContent = grouped ? items.map(captionFor).join(' / ') : captionFor(items[0]);
    content.replaceChildren(grouped ? group : viewers[0]);
    dialog.showModal();
    if (grouped && items.some(media => media instanceof HTMLVideoElement)) player = StageComponents.mountMediaPlayer(group, controller);
    dialog.querySelector('button').focus();
  };
  dialog.querySelector('button').addEventListener('click', () => close());
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => { if (!dialog.open) finish(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  document.addEventListener('stage:contentchange', () => { if (sources.some(source => source.closest('[hidden]'))) close(false); });
  document.addEventListener('stage:languagechange', () => {
    if (!dialog.open) return;
    viewers.forEach((viewer, index) => {
      const source = sources[index];
      for (const attr of ['alt', 'aria-label']) if (source.hasAttribute(attr)) viewer.setAttribute(attr, source.getAttribute(attr));
      if (viewer.tagName === 'IMG') viewer.src = source.src;
      if (player || sources.length > 1) viewer.closest('figure').querySelector('figcaption').textContent = captionFor(source);
    });
    caption.textContent = sources.length > 1 ? sources.map(captionFor).join(' / ') : captionFor(sources[0]);
  });

  frames.forEach(frame => {
    const items = [...frame.querySelectorAll('video, img:not(.print-poster)')];
    const media = frame.dataset.mediaZoom === 'group' ? items : items.slice(0, 1);
    if (!media.length) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'stage-media-expand presentation-ui';
    button.textContent = 'Expand';
    button.dataset.i18n = 'media.expand';
    button.setAttribute('aria-label', media.length > 1 ? 'Enlarge comparison' : media[0].tagName === 'VIDEO' ? 'Enlarge video' : 'Enlarge image');
    button.dataset.i18nAttr = 'aria-label:' + (media.length > 1 ? 'media.enlargeComparison' : media[0].tagName === 'VIDEO' ? 'media.enlargeVideo' : 'media.enlargeImage');
    button.setAttribute('aria-haspopup', 'dialog');
    frame.append(button);
    window.StageI18n?.apply(button);
    button.addEventListener('click', () => open(media, button));
    media.forEach(item => {
      if (item.tagName === 'IMG' || frame.hasAttribute('data-media-click-expand')) {
        item.addEventListener('click', () => open(media, button));
        item.classList.add('stage-zoom-image');
      }
    });
  });
})();
