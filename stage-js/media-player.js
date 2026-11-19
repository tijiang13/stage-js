/* Optional transport for aligned videos and selectors for comparable examples. */
(() => {
  const stage = window.StageDeck;
  const t = (key, fallback) => window.StageI18n?.t(key, fallback) ?? fallback;
  if (!stage) throw new Error('Load deck.js before media-player.js.');
  const mounted = new WeakMap();
  window.StageComponents.mountMediaPlayer = (root, controller = stage.media) => {
    if (mounted.has(root)) return mounted.get(root);
    const videos = [...root.querySelectorAll('video')].filter(video => video.closest('[data-media-player]') === root);
    if (!videos.length) return;
    const leader = videos[0];
    const events = new AbortController();
    const listen = (target, name, callback) => target.addEventListener(name, callback, { signal: events.signal });
    const controls = document.createElement('div');
    controls.className = 'stage-media-controls presentation-ui';
    controls.innerHTML = '<button type="button" data-media-toggle>Play</button><button type="button" data-media-replay data-i18n="media.replay">Replay</button><input type="range" min="0" max="0" step="0.01" value="0" aria-label="Seek recording" data-i18n-attr="aria-label:media.seek"><output aria-label="Playback time" data-i18n-attr="aria-label:media.time">0.0 / 0.0 s</output><select aria-label="Playback speed" data-i18n-attr="aria-label:media.speed"><option value="1">1×</option><option value="0.5">0.5×</option><option value="2">2×</option></select>';
    root.append(controls);
    window.StageI18n?.apply(controls);
    const toggle = controls.querySelector('[data-media-toggle]');
    const replay = controls.querySelector('[data-media-replay]');
    const seek = controls.querySelector('input');
    const time = controls.querySelector('output');
    const speed = controls.querySelector('select');
    const duration = () => {
      const values = videos.map(video => video.duration);
      return values.every(value => Number.isFinite(value) && value > 0) ? Math.min(...values) : 0;
    };
    const setPlaying = playing => videos.forEach(video => controller.setIntent(video, playing));
    const position = value => {
      const end = duration();
      if (!end) return;
      const target = Math.max(0, Math.min(Number(value), end - .01));
      videos.forEach(video => { if (video.readyState >= 1) video.currentTime = target; });
      paint();
    };
    function paint() {
      const playing = controller.getIntent(leader);
      const end = duration();
      const failed = videos.some(video => video.error || (video.networkState === 3 && video.readyState === 0));
      toggle.textContent = failed ? t('media.unavailable', 'Media unavailable') : playing ? t('media.pause', 'Pause') : t('media.play', 'Play');
      toggle.setAttribute('aria-pressed', String(playing && !failed));
      toggle.disabled = replay.disabled = failed;
      seek.disabled = !end || failed;
      seek.max = end;
      seek.value = leader.currentTime;
      time.value = `${leader.currentTime.toFixed(1)} / ${end.toFixed(1)} ${t('media.seconds', 's')}`;
      if (![...speed.options].some(option => Number(option.value) === leader.playbackRate)) {
        speed.add(new Option(`${leader.playbackRate}×`, String(leader.playbackRate)));
      }
      speed.value = String(leader.playbackRate);
    }
    listen(document, 'stage:languagechange', paint);
    listen(toggle, 'click', () => { setPlaying(!controller.getIntent(leader)); paint(); });
    listen(replay, 'click', () => { position(0); setPlaying(true); paint(); });
    listen(seek, 'input', () => position(seek.value));
    listen(speed, 'change', () => videos.forEach(video => { video.playbackRate = Number(speed.value); }));
    videos.forEach(video => {
      for (const name of ['loadstart', 'loadedmetadata', 'durationchange', 'play', 'pause', 'ratechange', 'error', 'stage:mediaintent']) listen(video, name, paint);
      video.querySelectorAll('source').forEach(source => listen(source, 'error', paint));
      listen(video, 'ended', () => { setPlaying(false); paint(); });
    });
    listen(leader, 'seeking', () => {
      videos.slice(1).forEach(video => { if (video.readyState >= 1 && Math.abs(video.currentTime - leader.currentTime) > .045) video.currentTime = leader.currentTime; });
    });
    listen(leader, 'timeupdate', () => {
      if (!leader.paused && !leader.seeking) videos.slice(1).forEach(video => {
        if (video.readyState >= 1 && !video.seeking && Math.abs(video.currentTime - leader.currentTime) > .08) video.currentTime = leader.currentTime;
      });
      paint();
    });
    const player = { setPlaying, seek: position, destroy() { events.abort(); controls.remove(); mounted.delete(root); } };
    mounted.set(root, player);
    paint();
    return player;
  };

  document.querySelectorAll('#deck [data-media-player]').forEach(root => StageComponents.mountMediaPlayer(root));
  let panelNumber = 0;
  document.querySelectorAll('#deck [data-media-examples]').forEach(root => {
    const panels = [...root.querySelectorAll('[data-media-example]')].filter(panel => panel.closest('[data-media-examples]') === root);
    const buttons = [...root.querySelectorAll('[data-media-select]')].filter(button => button.closest('[data-media-examples]') === root);
    if (!panels.length) return;
    panels.forEach(panel => {
      if (panel.id) return;
      let id;
      do { id = `stage-example-${++panelNumber}`; } while (document.getElementById(id));
      panel.id = id;
    });
    buttons.forEach(button => {
      const panel = panels.find(item => item.dataset.mediaExample === button.dataset.mediaSelect);
      if (panel) button.setAttribute('aria-controls', panel.id);
    });
    let current = panels.find(panel => !panel.hidden) || panels[0];
    const show = (next, initial = false) => {
      const playing = [...current.querySelectorAll('video')].some(video => stage.media.getIntent(video));
      // Disable outgoing media before touching hidden state, independent of observer timing.
      panels.forEach(panel => panel.querySelectorAll('video').forEach(video => stage.media.setAvailable(video, false)));
      panels.forEach(panel => {
        const active = panel === next;
        panel.hidden = !active;
        panel.querySelectorAll('video').forEach(video => {
          if (!initial || !active) stage.media.setIntent(video, active && playing);
          stage.media.setAvailable(video, active);
        });
      });
      current = next;
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mediaSelect === next.dataset.mediaExample)));
      if (!initial) root.dispatchEvent(new CustomEvent('stage:contentchange', { bubbles: true, detail: { slide: root.closest('.slide-frame') } }));
    };
    buttons.forEach(button => button.addEventListener('click', () => {
      const next = panels.find(panel => panel.dataset.mediaExample === button.dataset.mediaSelect);
      if (next && next !== current) show(next);
    }));
    show(current, true);
  });
})();
