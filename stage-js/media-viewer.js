/* Opt-in image/video viewer. Add data-media-zoom to a .media-frame. */
(() => {
  const frames = [...document.querySelectorAll('[data-media-zoom]')];
  if (!frames.length) return;
  const stage = window.StageDeck;
  if (!stage) throw new Error('Load deck.js before media-viewer.js.');
  const dialog = document.createElement('dialog');
  dialog.className = 'stage-media-dialog presentation-ui';
  dialog.setAttribute('aria-label', 'Enlarged media');
  dialog.innerHTML = '<button type="button" class="stage-media-close" aria-label="Close enlarged media">×</button><div class="stage-media-content"></div><p class="stage-media-caption"></p>';
  document.body.append(dialog);
  const content = dialog.querySelector('.stage-media-content');
  const caption = dialog.querySelector('.stage-media-caption');
  let source, trigger, viewer;
  let releaseOverlay;
  let restorePlayback = true;

  const finish = () => {
    if (!source) return;
    if (viewer instanceof HTMLVideoElement) {
      const time = viewer.currentTime;
      const playing = !viewer.paused;
      viewer.pause();
      if (Number.isFinite(time) && source.readyState >= 1) source.currentTime = time;
      source.muted = viewer.muted;
      source.volume = viewer.volume;
      source.playbackRate = viewer.playbackRate;
      stage.media.setIntent(source, restorePlayback && playing);
    }
    content.replaceChildren();
    releaseOverlay?.();
    releaseOverlay = null;
    trigger?.focus({ preventScroll: true });
    source = viewer = trigger = null;

  };
  const close = (restore = true) => {
    if (!dialog.open) return;
    restorePlayback = restore;
    dialog.close();
    finish();
  };
  const open = (media, button) => {
    if (dialog.open) return;
    source = media; trigger = button; restorePlayback = true;
    const playing = !media.paused;
    releaseOverlay = stage.acquireOverlay(() => close(false));
    viewer = media.cloneNode(true);
    viewer.removeAttribute('id');
    viewer.removeAttribute('data-autoplay');
    viewer.removeAttribute('autoplay');
    viewer.removeAttribute('tabindex');
    viewer.className = '';
    if (viewer instanceof HTMLVideoElement) {
      viewer.controls = true;
      viewer.muted = media.muted;
      viewer.volume = media.volume;
      viewer.playbackRate = media.playbackRate;
      const time = media.currentTime;
      const preview = viewer;
      viewer.addEventListener('loadedmetadata', () => {
        if (viewer !== preview || !dialog.open) return;
        if (Number.isFinite(time)) viewer.currentTime = time;
        if (playing && dialog.open) viewer.play().catch(() => {});
      }, { once: true });
    }
    const figureCaption = media.closest('figure')?.querySelector('figcaption');
    const captionText = figureCaption ? [...figureCaption.childNodes].map(node => node.textContent.trim()).filter(Boolean).join(' — ') : '';
    caption.textContent = captionText || media.getAttribute('alt') || media.getAttribute('aria-label') || 'Media preview';
    content.replaceChildren(viewer);
    dialog.showModal();
    dialog.querySelector('button').focus();
  };
  dialog.querySelector('button').addEventListener('click', () => close());
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => { if (!dialog.open) finish(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });


  frames.forEach(frame => {
    const media = frame.querySelector('video, img:not(.print-poster)');
    if (!media) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'stage-media-expand presentation-ui';
    button.textContent = 'Expand';
    button.setAttribute('aria-label', media.tagName === 'VIDEO' ? 'Enlarge video' : 'Enlarge image');
    button.setAttribute('aria-haspopup', 'dialog');
    frame.append(button);
    button.addEventListener('click', () => open(media, button));
    if (media.tagName === 'IMG') {
      media.addEventListener('click', () => open(media, button));
      media.classList.add('stage-zoom-image');
    }
  });
})();
